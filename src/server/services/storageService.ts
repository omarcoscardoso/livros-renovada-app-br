import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import { Storage, Bucket } from '@google-cloud/storage';
import { OAuth2Client } from 'google-auth-library';
import {
  COVER_STORAGE_DIR,
  PDF_STORAGE_DIR,
  PROJECT_ROOT,
  ensureStorageDirectories,
} from '../db/database';

EventEmitter.defaultMaxListeners = Math.max(EventEmitter.defaultMaxListeners, 25);

export const DEFAULT_GCS_BUCKET = 'livros-renovada-app-br';
export const DEFAULT_GCP_PROJECT_ID = 'renovada-app-br';

/**
 * Creates an OAuth2Client backed by `gcloud auth print-access-token` for local development
 * when Application Default Credentials (ADC) are not configured or require interactive reauth.
 * On Cloud Run (`K_SERVICE` is set), standard Metadata Server ADC is used automatically.
 */
function createLocalGcloudOAuthClient(): OAuth2Client {
  const client = new OAuth2Client();
  const refreshToken = () => {
    const token = execFileSync('gcloud', ['auth', 'print-access-token'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();
    client.setCredentials({
      access_token: token,
      expiry_date: Date.now() + 45 * 60 * 1000,
    });
  };
  refreshToken();
  return client;
}

export interface IStorageService {
  isGcsEnabled(): boolean;
  getBucketName(): string;
  savePdf(filename: string, buffer: Buffer): Promise<string>;
  saveCover(filename: string, buffer: Buffer): Promise<void>;
  getPdfBuffer(filename: string): Promise<Buffer | null>;
  getCoverBuffer(filename: string): Promise<Buffer | null>;
  ensureLocalPdfPath(filename: string): Promise<string | null>;
  deletePdf(filename: string): Promise<void>;
  deleteCover(filename: string): Promise<void>;
  restoreDatabaseIfNeeded(localDbPath: string): Promise<boolean>;
  syncDatabaseToGcs(localDbPath: string): Promise<void>;
  ensureDefaultAssetsInStorage(
    defaultPdfSource: string,
    defaultPdfFilename: string,
    defaultCoverSource: string,
    defaultCoverFilename: string
  ): Promise<void>;
}

export class CloudStorageService implements IStorageService {
  private storage: Storage | null = null;
  private bucket: Bucket | null = null;
  private readonly bucketName: string;
  private readonly gcsEnabled: boolean;
  private dbSyncTimer: NodeJS.Timeout | null = null;

  constructor(options?: { bucketName?: string; gcsEnabled?: boolean }) {
    this.bucketName =
      options?.bucketName ||
      process.env.GCS_BUCKET ||
      DEFAULT_GCS_BUCKET;

    const isTestEnv = process.env.NODE_ENV === 'test';
    const driverEnv = (process.env.STORAGE_DRIVER || '').toLowerCase();

    if (options?.gcsEnabled !== undefined) {
      this.gcsEnabled = options.gcsEnabled;
    } else if (driverEnv === 'local') {
      this.gcsEnabled = false;
    } else if (driverEnv === 'gcs') {
      this.gcsEnabled = true;
    } else {
      this.gcsEnabled = !isTestEnv && Boolean(this.bucketName);
    }

    if (this.gcsEnabled) {
      this.initGcsClient();
    }
  }

  private initGcsClient(): void {
    try {
      const projectId =
        process.env.GCP_PROJECT_ID ||
        process.env.GCS_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        DEFAULT_GCP_PROJECT_ID;

      const keyBase64 = process.env.GCS_KEY_FILE_BASE64?.trim();
      const isCloudRun = Boolean(process.env.K_SERVICE);

      if (keyBase64) {
        const credentials = JSON.parse(
          Buffer.from(keyBase64, 'base64').toString('utf-8')
        );
        this.storage = new Storage({
          projectId,
          credentials,
        });
      } else if (isCloudRun || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Cloud Run uses the attached Service Account via Metadata Server (ADC)
        this.storage = new Storage({ projectId });
      } else {
        // Local environment: prefer gcloud CLI active account if available, otherwise standard ADC
        try {
          const cliAuth = createLocalGcloudOAuthClient();
          this.storage = new Storage({
            projectId,
            authClient: cliAuth as any,
          });
        } catch {
          this.storage = new Storage({ projectId });
        }
      }

      this.bucket = this.storage.bucket(this.bucketName);
    } catch (error) {
      console.error('Aviso ao inicializar cliente Google Cloud Storage:', error);
      this.storage = null;
      this.bucket = null;
    }
  }

  public isGcsEnabled(): boolean {
    return this.gcsEnabled && this.bucket !== null;
  }

  public getBucketName(): string {
    return this.bucketName;
  }

  public async savePdf(filename: string, buffer: Buffer): Promise<string> {
    ensureStorageDirectories();
    const safeName = path.basename(filename);
    const localPath = path.join(PDF_STORAGE_DIR, safeName);

    // Save local working copy for immediate extraction / caching
    await fsPromises.writeFile(localPath, buffer);

    if (this.bucket) {
      const remotePath = `pdfs/${safeName}`;
      await this.bucket.file(remotePath).save(buffer, {
        resumable: false,
        contentType: 'application/pdf',
        metadata: {
          cacheControl: 'public, max-age=86400',
        },
      });
    }

    return localPath;
  }

  public async saveCover(filename: string, buffer: Buffer): Promise<void> {
    ensureStorageDirectories();
    const safeName = path.basename(filename);
    const localPath = path.join(COVER_STORAGE_DIR, safeName);

    // Keep local cache copy
    await fsPromises.writeFile(localPath, buffer);

    if (this.bucket) {
      const remotePath = `covers/${safeName}`;
      await this.bucket.file(remotePath).save(buffer, {
        resumable: false,
        contentType: 'image/png',
        metadata: {
          cacheControl: 'public, max-age=3600',
        },
      });
    }
  }

  public async getPdfBuffer(filename: string): Promise<Buffer | null> {
    const safeName = path.basename(filename);

    // 1. Try GCS bucket first when enabled
    if (this.bucket) {
      try {
        const file = this.bucket.file(`pdfs/${safeName}`);
        const [exists] = await file.exists();
        if (exists) {
          const [buffer] = await file.download();
          // Cache locally for fast subsequent reads
          try {
            ensureStorageDirectories();
            await fsPromises.writeFile(path.join(PDF_STORAGE_DIR, safeName), buffer);
          } catch {
            // ignore local cache write error
          }
          return buffer;
        }
      } catch (err) {
        console.warn(`Aviso ao ler PDF "${safeName}" do GCS, tentando fallback local:`, err);
      }
    }

    // 2. Fallback to local storage directory
    const localStoragePath = path.join(PDF_STORAGE_DIR, safeName);
    if (fs.existsSync(localStoragePath)) {
      const buf = await fsPromises.readFile(localStoragePath);
      // Backfill to GCS if enabled
      if (this.bucket) {
        void this.bucket
          .file(`pdfs/${safeName}`)
          .save(buf, { resumable: false, contentType: 'application/pdf' })
          .catch(() => {});
      }
      return buf;
    }

    // 3. Fallback to bundled public assets
    const publicAssetPath = path.join(
      PROJECT_ROOT,
      'public',
      'assets',
      'aistudio',
      safeName
    );
    if (fs.existsSync(publicAssetPath)) {
      return fsPromises.readFile(publicAssetPath);
    }

    return null;
  }

  public async getCoverBuffer(filename: string): Promise<Buffer | null> {
    const safeName = path.basename(filename);

    // 1. Try GCS bucket first when enabled
    if (this.bucket) {
      try {
        const file = this.bucket.file(`covers/${safeName}`);
        const [exists] = await file.exists();
        if (exists) {
          const [buffer] = await file.download();
          // Cache locally
          try {
            ensureStorageDirectories();
            await fsPromises.writeFile(path.join(COVER_STORAGE_DIR, safeName), buffer);
          } catch {
            // ignore local cache write error
          }
          return buffer;
        }
      } catch (err) {
        console.warn(`Aviso ao ler capa "${safeName}" do GCS, tentando fallback local:`, err);
      }
    }

    // 2. Fallback to local storage directory
    const localCoverPath = path.join(COVER_STORAGE_DIR, safeName);
    if (fs.existsSync(localCoverPath)) {
      const buf = await fsPromises.readFile(localCoverPath);
      if (this.bucket) {
        void this.bucket
          .file(`covers/${safeName}`)
          .save(buf, { resumable: false, contentType: 'image/png' })
          .catch(() => {});
      }
      return buf;
    }

    // 3. Fallback to bundled default cover
    const publicCoverPath = path.join(
      PROJECT_ROOT,
      'public',
      'assets',
      'aistudio',
      'The_Cell_Church_Cover.png'
    );
    if (
      (safeName.includes('cell-church-larry-stockstill') ||
        safeName === 'The_Cell_Church_Cover.png') &&
      fs.existsSync(publicCoverPath)
    ) {
      return fsPromises.readFile(publicCoverPath);
    }

    return null;
  }

  public async ensureLocalPdfPath(filename: string): Promise<string | null> {
    ensureStorageDirectories();
    const safeName = path.basename(filename);
    const localPath = path.join(PDF_STORAGE_DIR, safeName);

    if (fs.existsSync(localPath)) {
      return localPath;
    }

    const publicPath = path.join(
      PROJECT_ROOT,
      'public',
      'assets',
      'aistudio',
      safeName
    );
    if (fs.existsSync(publicPath)) {
      fs.copyFileSync(publicPath, localPath);
      return localPath;
    }

    if (this.bucket) {
      try {
        const file = this.bucket.file(`pdfs/${safeName}`);
        const [exists] = await file.exists();
        if (exists) {
          const [buffer] = await file.download();
          await fsPromises.writeFile(localPath, buffer);
          return localPath;
        }
      } catch (err) {
        console.error(`Erro ao baixar PDF "${safeName}" do GCS para processamento local:`, err);
      }
    }

    return null;
  }

  public async deletePdf(filename: string): Promise<void> {
    const safeName = path.basename(filename);
    const localPath = path.join(PDF_STORAGE_DIR, safeName);

    if (fs.existsSync(localPath)) {
      try {
        await fsPromises.unlink(localPath);
      } catch {
        // ignore
      }
    }

    if (this.bucket) {
      try {
        await this.bucket.file(`pdfs/${safeName}`).delete({ ignoreNotFound: true });
      } catch (err) {
        console.warn(`Aviso ao excluir PDF "${safeName}" do GCS:`, err);
      }
    }
  }

  public async deleteCover(filename: string): Promise<void> {
    const safeName = path.basename(filename);
    const localPath = path.join(COVER_STORAGE_DIR, safeName);

    if (fs.existsSync(localPath)) {
      try {
        await fsPromises.unlink(localPath);
      } catch {
        // ignore
      }
    }

    if (this.bucket) {
      try {
        await this.bucket.file(`covers/${safeName}`).delete({ ignoreNotFound: true });
      } catch (err) {
        console.warn(`Aviso ao excluir capa "${safeName}" do GCS:`, err);
      }
    }
  }

  public async restoreDatabaseIfNeeded(localDbPath: string): Promise<boolean> {
    if (!this.bucket) return false;

    const shouldRestore =
      !fs.existsSync(localDbPath) || process.env.FORCE_GCS_DB_RESTORE === 'true';
    if (!shouldRestore) {
      return false;
    }

    try {
      const remoteDbFile = this.bucket.file('db/library.sqlite');
      const [exists] = await remoteDbFile.exists();
      if (!exists) {
        return false;
      }

      ensureStorageDirectories();
      const [buffer] = await remoteDbFile.download();
      await fsPromises.writeFile(localDbPath, buffer);
      console.log(
        `Banco de dados SQLite restaurado com sucesso de gs://${this.bucketName}/db/library.sqlite`
      );
      return true;
    } catch (err) {
      console.warn('Aviso ao restaurar banco SQLite do GCS:', err);
      return false;
    }
  }

  public async syncDatabaseToGcs(localDbPath: string): Promise<void> {
    if (!this.bucket) return;

    if (this.dbSyncTimer) {
      clearTimeout(this.dbSyncTimer);
    }

    this.dbSyncTimer = setTimeout(async () => {
      try {
        if (!fs.existsSync(localDbPath) || !this.bucket) return;
        const buffer = await fsPromises.readFile(localDbPath);
        await this.bucket.file('db/library.sqlite').save(buffer, {
          resumable: false,
          contentType: 'application/x-sqlite3',
        });
      } catch (err) {
        console.warn('Aviso ao sincronizar library.sqlite para o GCS:', err);
      }
    }, 300);
  }

  public async ensureDefaultAssetsInStorage(
    defaultPdfSource: string,
    defaultPdfFilename: string,
    defaultCoverSource: string,
    defaultCoverFilename: string
  ): Promise<void> {
    if (!this.bucket) return;

    try {
      if (fs.existsSync(defaultPdfSource)) {
        const pdfFile = this.bucket.file(`pdfs/${defaultPdfFilename}`);
        const [pdfExists] = await pdfFile.exists();
        if (!pdfExists) {
          const buf = await fsPromises.readFile(defaultPdfSource);
          await pdfFile.save(buf, {
            resumable: false,
            contentType: 'application/pdf',
          });
        }
      }

      if (fs.existsSync(defaultCoverSource)) {
        const coverFile = this.bucket.file(`covers/${defaultCoverFilename}`);
        const [coverExists] = await coverFile.exists();
        if (!coverExists) {
          const buf = await fsPromises.readFile(defaultCoverSource);
          await coverFile.save(buf, {
            resumable: false,
            contentType: 'image/png',
          });
        }
      }
    } catch (err) {
      console.warn('Aviso ao verificar assets padrão no GCS:', err);
    }
  }
}

let defaultStorageInstance: IStorageService | null = null;

export function getStorageService(): IStorageService {
  if (!defaultStorageInstance) {
    defaultStorageInstance = new CloudStorageService();
  }
  return defaultStorageInstance;
}
