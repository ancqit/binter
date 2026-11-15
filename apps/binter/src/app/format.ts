import type { CollectRequest } from './api';

export function elapsed(from: string, to: string | null, now = Date.now()): string {
  const start = Date.parse(from);
  const end = to ? Date.parse(to) : now;
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const pad = (value: number) => String(value).padStart(2, '0');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

export function when(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function statusWord(status: CollectRequest['status']): string {
  if (status === 'accepted') {
    return 'On the way';
  }
  if (status === 'done') {
    return 'Collected';
  }
  return 'Waiting';
}

export function ordered(rows: CollectRequest[]): CollectRequest[] {
  return [...rows].sort((left, right) => {
    const byStatus = rank(left.status) - rank(right.status);
    if (byStatus !== 0) {
      return byStatus;
    }
    return Date.parse(right.created_at) - Date.parse(left.created_at);
  });
}

export function safeUrl(url: string): string {
  if (url.startsWith('/')) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    return '';
  }
  return '';
}

export function clipDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Use a clip of ten seconds or less.'));
    };
    video.src = url;
  });
}

function rank(status: CollectRequest['status']): number {
  if (status === 'open') {
    return 0;
  }
  if (status === 'accepted') {
    return 1;
  }
  return 2;
}
