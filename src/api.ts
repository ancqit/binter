/** Same-origin prefix. Vercel and vite forward /api to herback, then herback serves /binter. */
export const API_URL = '/api';

export type Role = 'notifier' | 'receiver' | 'admin';

export interface MediaFile {
  url: string;
  content_type: string;
  filename: string;
}

export interface CollectRequest {
  id: string;
  collect_number: string;
  bucket: string;
  bucket_name: string;
  location_type: string;
  location_name: string;
  location_label: string;
  photo: MediaFile | null;
  clip: MediaFile | null;
  status: 'open' | 'accepted' | 'done';
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  receiver: { name: string; vehicle_number: string } | null;
}

export interface PaperFile {
  on_file: boolean;
  filename: string;
}

export interface Profile {
  name: string;
  vehicle_number: string;
  documents: { aadhaar: PaperFile; licence: PaperFile; rc: PaperFile };
  ready: boolean;
}

export interface UploadTicket {
  upload_url: string;
  object_key: string;
  content_type: string;
  headers: Record<string, string>;
  method: string;
  max_bytes: number;
  max_seconds: number | null;
}

export interface StoredFile {
  object_key: string;
  content_type: string;
  filename: string;
}

export interface Gist {
  open: number;
  accepted: number;
  done: number;
  by_bucket: Record<string, number>;
  receivers: number;
  week: number;
  month: number;
}

export interface Sheet {
  span: 'week' | 'month';
  from: string;
  to: string;
  rows: CollectRequest[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function headers(token: string, vehicle = '', json = false): Headers {
  const result = new Headers({ authorization: `Bearer ${token}` });
  if (vehicle) {
    result.set('x-binter-vehicle', vehicle);
  }
  if (json) {
    result.set('content-type', 'application/json');
  }
  return result;
}

async function fail(response: Response): Promise<ApiError> {
  let message = 'The portal could not do that.';
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === 'string' && body.detail) {
      message = body.detail;
    }
  } catch {
    // Keep the quiet line.
  }
  return new ApiError(message, response.status);
}

export async function login(token: string): Promise<Role> {
  const response = await fetch(`${API_URL}/binter/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    throw await fail(response);
  }
  const body = (await response.json()) as { role?: Role };
  if (body.role !== 'notifier' && body.role !== 'receiver' && body.role !== 'admin') {
    throw new ApiError('The portal could not do that.', response.status);
  }
  return body.role;
}

function fileType(file: File): string {
  if (file.type) {
    return file.type;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.webm')) return 'video/webm';
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.mp4') || name.endsWith('.m4v')) return 'video/mp4';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export async function signUpload(
  token: string,
  vehicle: string,
  kind: string,
  file: File,
): Promise<UploadTicket> {
  const response = await fetch(`${API_URL}/binter/upload-url`, {
    method: 'POST',
    headers: headers(token, vehicle, true),
    body: JSON.stringify({ kind, contentType: fileType(file), filename: file.name }),
  });
  if (!response.ok) {
    throw await fail(response);
  }
  return (await response.json()) as UploadTicket;
}

export async function putFile(ticket: UploadTicket, file: File): Promise<StoredFile> {
  if (file.size > ticket.max_bytes) {
    throw new ApiError('That file is too large.', 400);
  }
  const response = await fetch(ticket.upload_url, {
    method: ticket.method || 'PUT',
    headers: ticket.headers,
    body: file,
  });
  if (!response.ok) {
    throw new ApiError('The file did not upload.', response.status);
  }
  return {
    object_key: ticket.object_key,
    content_type: ticket.content_type,
    filename: file.name,
  };
}

export async function profile(token: string, vehicle: string): Promise<Profile | null> {
  const response = await fetch(`${API_URL}/binter/profile`, { headers: headers(token, vehicle) });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw await fail(response);
  }
  const body = (await response.json()) as { profile: Profile };
  return body.profile;
}

export async function saveProfile(
  token: string,
  vehicle: string,
  body: { name: string; vehicle_number: string; documents: Record<string, StoredFile | undefined> },
): Promise<Profile> {
  const response = await fetch(`${API_URL}/binter/profile`, {
    method: 'POST',
    headers: headers(token, vehicle, true),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await fail(response);
  }
  const payload = (await response.json()) as { profile: Profile };
  return payload.profile;
}

export async function requests(token: string, vehicle = ''): Promise<CollectRequest[]> {
  const response = await fetch(`${API_URL}/binter/requests`, { headers: headers(token, vehicle) });
  if (!response.ok) {
    throw await fail(response);
  }
  const body = (await response.json()) as { requests: CollectRequest[] };
  return body.requests;
}

export async function createRequest(
  token: string,
  body: {
    bucket: string;
    location_type: string;
    location_label: string;
    photo: StoredFile;
    clip: StoredFile | null;
  },
): Promise<CollectRequest> {
  const response = await fetch(`${API_URL}/binter/requests`, {
    method: 'POST',
    headers: headers(token, '', true),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await fail(response);
  }
  const payload = (await response.json()) as { request: CollectRequest };
  return payload.request;
}

export async function acceptRequest(token: string, vehicle: string, id: string): Promise<CollectRequest> {
  const response = await fetch(`${API_URL}/binter/requests/${id}/accept`, {
    method: 'POST',
    headers: headers(token, vehicle),
  });
  if (!response.ok) {
    throw await fail(response);
  }
  const payload = (await response.json()) as { request: CollectRequest };
  return payload.request;
}

export async function completeRequest(token: string, vehicle: string, id: string): Promise<CollectRequest> {
  const response = await fetch(`${API_URL}/binter/requests/${id}/complete`, {
    method: 'POST',
    headers: headers(token, vehicle),
  });
  if (!response.ok) {
    throw await fail(response);
  }
  const payload = (await response.json()) as { request: CollectRequest };
  return payload.request;
}

export async function gist(token: string): Promise<Gist> {
  const response = await fetch(`${API_URL}/binter/gist`, { headers: headers(token) });
  if (!response.ok) {
    throw await fail(response);
  }
  return (await response.json()) as Gist;
}

export async function sheet(token: string, span: 'week' | 'month'): Promise<Sheet> {
  const response = await fetch(`${API_URL}/binter/sheet?span=${span}`, { headers: headers(token) });
  if (!response.ok) {
    throw await fail(response);
  }
  return (await response.json()) as Sheet;
}
