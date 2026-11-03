import { VideoType } from '../types/training';

export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov') ||
    clean.includes('.mp4?') ||
    clean.includes('.webm?')
  );
}

export function getEmbedVideoUrl(url: string, type?: VideoType): string {
  if (!url) return '';
  const trimmed = url.trim();

  // If it's a direct video file (MP4/WebM), return it directly for <video> tag
  if (isDirectVideoUrl(trimmed)) {
    return trimmed;
  }

  // 1. YouTube formats (support watch?v=, youtu.be/, embed/, shorts/)
  const isYouTube =
    type === 'youtube' ||
    trimmed.includes('youtube.com') ||
    trimmed.includes('youtu.be');

  if (isYouTube) {
    let videoId = '';
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);

    if (shortMatch && shortMatch[1]) videoId = shortMatch[1];
    else if (watchMatch && watchMatch[1]) videoId = watchMatch[1];
    else if (embedMatch && embedMatch[1]) videoId = embedMatch[1];
    else if (shortsMatch && shortsMatch[1]) videoId = shortsMatch[1];

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;
    }
  }

  // 2. Google Drive formats
  const isDrive =
    type === 'google_drive' ||
    trimmed.includes('drive.google.com');

  if (isDrive) {
    const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    const openMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);

    const fileId = (fileMatch && fileMatch[1]) || (openMatch && openMatch[1]);
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    if (trimmed.includes('/preview')) {
      return trimmed;
    }
  }

  // 3. Vimeo formats
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}?title=0&byline=0&portrait=0`;
  }

  return trimmed;
}

export function getVideoExternalUrl(url: string, type?: VideoType): string {
  if (!url) return '';
  const trimmed = url.trim();

  // If already standard url, return
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function detectVideoType(url: string): VideoType {
  const lower = url.toLowerCase();
  if (lower.includes('drive.google.com')) return 'google_drive';
  return 'youtube';
}
