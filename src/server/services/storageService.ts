import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import { Storage, Bucket } from '@google-cloud/storage';
import { OAuth2Client } from 'google-auth-library';
import { PROJECT_ROOT } from '../db/database';

EventEmitter.defaultMaxListeners = Math.max(EventEmitter.defaultMaxListeners, 25);

export const DEFAULT_GCS_BUCKET = 'livros-renovada-app-br';
export const DEFAULT_GCP_PROJECT_ID = 'renovada-app-br';

export interface IBookAssetStorage {
  savePdf(filename: string, buffer: Buffer): Promise<void>;
  saveCover(filename: string, buffer: Buffer): Promise<void>;
  getPdfBuffer(filename: string): Promise<Buffer | null>;
  getCoverBuffer(filename: string): Promise<Buffer | null>;
  deletePdf(filename: string): Promise<void>;
  deleteCover(filename: string): Promise<void>;
  ensureDefaultAssets(
    defaultPdfSource: string,
    defaultPdfFilename: string,
    defaultCoverSource: string,
    defaultCoverFilename: string
  ): Promise<void>;
}

export interface IDatabaseSnapshotStorage {
  restoreDatabaseSnapshot(targetLocalPath: string): Promise<boolean>;
  syncDatabaseSnapshot(sourceLocalPath: string): Promise<void>;
}

export interface IStorageService extends IBookAssetStorage, IDatabaseSnapshotStorage {
  isGcsEnabled(): boolean;
  getBucketName(): string;
}

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

export class GcsStorageService implements IStorageService {
  private storage: Storage | null = null;
  private bucket: Bucket | null = null;
  private readonly bucketName: string;
  private dbSyncTimer: NodeJS.Timeout | null = null;

  constructor(options?: { bucketName?: string }) {
    this.bucketName =
      options?.bucketName ||
      process.env.GCS_BUCKET ||
      DEFAULT_GCS_BUCKET;

    this.initGcsClient();
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
        this.storage = new Storage({ projectId, credentials });
      } else if (isCloudRun || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.storage = new Storage({ projectId });
      } else {
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
    return this.bucket !== null;
  }

  public getBucketName(): string {
    return this.bucketName;
  }

  public async savePdf(filename: string, buffer: Buffer): Promise<void> {
    if (!this.bucket) {
      throw new Error('GCS Bucket não está disponível para salvar PDF.');
    }
    const safeName = path.basename(filename);
    await this.bucket.file(`pdfs/${safeName}`).save(buffer, {
      resumable: false,
      contentType: 'application/pdf',
      metadata: {
        cacheControl: 'public, max-age=86400',
      },
    });
  }

  public async saveCover(filename: string, buffer: Buffer): Promise<void> {
    if (!this.bucket) {
      throw new Error('GCS Bucket não está disponível para salvar capa.');
    }
    const safeName = path.basename(filename);
    await this.bucket.file(`covers/${safeName}`).save(buffer, {
      resumable: false,
      contentType: 'image/png',
      metadata: {
        cacheControl: 'public, max-age=3600',
      },
    });
  }

  public async getPdfBuffer(filename: string): Promise<Buffer | null> {
    const safeName = path.basename(filename);

    if (this.bucket) {
      try {
        const file = this.bucket.file(`pdfs/${safeName}`);
        const [exists] = await file.exists();
        if (exists) {
          const [buffer] = await file.download();
          return buffer;
        }
      } catch (err) {
        console.warn(`Aviso ao ler PDF "${safeName}" do GCS:`, err);
      }
    }

    // Fallback to bundled public assets
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

    if (this.bucket) {
      try {
        const file = this.bucket.file(`covers/${safeName}`);
        const [exists] = await file.exists();
        if (exists) {
          const [buffer] = await file.download();
          return buffer;
        }
      } catch (err) {
        console.warn(`Aviso ao ler capa "${safeName}" do GCS:`, err);
      }
    }

    // Fallback to bundled default cover
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

  public async deletePdf(filename: string): Promise<void> {
    if (!this.bucket) return;
    const safeName = path.basename(filename);
    try {
      await this.bucket.file(`pdfs/${safeName}`).delete({ ignoreNotFound: true });
    } catch (err) {
      console.warn(`Aviso ao excluir PDF "${safeName}" do GCS:`, err);
    }
  }

  public async deleteCover(filename: string): Promise<void> {
    if (!this.bucket) return;
    const safeName = path.basename(filename);
    try {
      await this.bucket.file(`covers/${safeName}`).delete({ ignoreNotFound: true });
    } catch (err) {
      console.warn(`Aviso ao excluir capa "${safeName}" do GCS:`, err);
    }
  }

  public async restoreDatabaseSnapshot(targetLocalPath: string): Promise<boolean> {
    if (!this.bucket) return false;

    const shouldRestore =
      !fs.existsSync(targetLocalPath) || process.env.FORCE_GCS_DB_RESTORE === 'true';
    if (!shouldRestore) {
      return false;
    }

    try {
      const remoteDbFile = this.bucket.file('db/library.sqlite');
      const [exists] = await remoteDbFile.exists();
      if (!exists) {
        return false;
      }

      const targetDir = path.dirname(targetLocalPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const [buffer] = await remoteDbFile.download();
      await fsPromises.writeFile(targetLocalPath, buffer);
      console.log(
        `Banco de dados SQLite restaurado com sucesso de gs://${this.bucketName}/db/library.sqlite`
      );
      return true;
    } catch (err) {
      console.warn('Aviso ao restaurar banco SQLite do GCS:', err);
      return false;
    }
  }

  public async syncDatabaseSnapshot(sourceLocalPath: string): Promise<void> {
    if (!this.bucket) return;

    if (this.dbSyncTimer) {
      clearTimeout(this.dbSyncTimer);
    }

    this.dbSyncTimer = setTimeout(async () => {
      try {
        if (!fs.existsSync(sourceLocalPath) || !this.bucket) return;
        const buffer = await fsPromises.readFile(sourceLocalPath);
        await this.bucket.file('db/library.sqlite').save(buffer, {
          resumable: false,
          contentType: 'application/x-sqlite3',
        });
      } catch (err) {
        console.warn('Aviso ao sincronizar library.sqlite para o GCS:', err);
      }
    }, 300);
  }

  public async ensureDefaultAssets(
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

/**
 * In-memory storage implementation for isolated unit tests or offline local environments.
 */
export class InMemoryStorageService implements IStorageService {
  private pdfs = new Map<string, Buffer>();
  private covers = new Map<string, Buffer>();
  private dbSnapshot: Buffer | null = null;
  private readonly bucketName: string;

  constructor(bucketName: string = DEFAULT_GCS_BUCKET) {
    this.bucketName = bucketName;
  }

  public isGcsEnabled(): boolean {
    return false;
  }

  public getBucketName(): string {
    return this.bucketName;
  }

  public async savePdf(filename: string, buffer: Buffer): Promise<void> {
    this.pdfs.set(path.basename(filename), buffer);
  }

  public async saveCover(filename: string, buffer: Buffer): Promise<void> {
    this.covers.set(path.basename(filename), buffer);
  }

  public async getPdfBuffer(filename: string): Promise<Buffer | null> {
    const safeName = path.basename(filename);
    if (this.pdfs.has(safeName)) {
      return this.pdfs.get(safeName)!;
    }
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
    if (this.covers.has(safeName)) {
      return this.covers.get(safeName)!;
    }
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

  public async deletePdf(filename: string): Promise<void> {
    this.pdfs.delete(path.basename(filename));
  }

  public async deleteCover(filename: string): Promise<void> {
    this.covers.delete(path.basename(filename));
  }

  public async restoreDatabaseSnapshot(targetLocalPath: string): Promise<boolean> {
    if (this.dbSnapshot) {
      await fsPromises.writeFile(targetLocalPath, this.dbSnapshot);
      return true;
    }
    return false;
  }

  public async syncDatabaseSnapshot(sourceLocalPath: string): Promise<void> {
    if (fs.existsSync(sourceLocalPath)) {
      this.dbSnapshot = await fsPromises.readFile(sourceLocalPath);
    }
  }

  public async ensureDefaultAssets(
    defaultPdfSource: string,
    defaultPdfFilename: string,
    defaultCoverSource: string,
    defaultCoverFilename: string
  ): Promise<void> {
    if (fs.existsSync(defaultPdfSource) && !this.pdfs.has(defaultPdfFilename)) {
      this.pdfs.set(defaultPdfFilename, await fsPromises.readFile(defaultPdfSource));
    }
    if (fs.existsSync(defaultCoverSource) && !this.covers.has(defaultCoverFilename)) {
      this.covers.set(defaultCoverFilename, await fsPromises.readFile(defaultCoverSource));
    }
  }
}

let defaultStorageInstance: IStorageService | null = null;

export function getStorageService(): IStorageService {
  if (!defaultStorageInstance) {
    const isTest = process.env.NODE_ENV === 'test';
    const driver = (process.env.STORAGE_DRIVER || '').toLowerCase();
    if (isTest || driver === 'memory' || driver === 'local') {
      defaultStorageInstance = new InMemoryStorageService();
    } else {
      defaultStorageInstance = new GcsStorageService();
    }
  }
  return defaultStorageInstance;
}
