import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function adminApp() {
  const existing = getApps().find(a => a.name === 'studybuddy-server');
  if (existing) return existing;
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  // The local file is ignored by Git and never included in the deployment.
  const file = resolve(process.cwd(), '.firebase-service-account.json');
  if (!raw && process.env.NODE_ENV !== 'production' && existsSync(file)) raw = readFileSync(file, 'utf8');
  if (!raw) throw new ApiError('Firebase server connection is not configured yet.', 503);
  try {
    const credentials = JSON.parse(raw);
    return initializeApp({ credential: cert(credentials), projectId: credentials.project_id }, 'studybuddy-server');
  } catch { throw new ApiError('Firebase server configuration is invalid.', 503); }
}
export function database() { return getFirestore(adminApp()); }
export async function requireUser(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new ApiError('Sign in to access your notes.', 401);
  const app = adminApp();
  try { return await getAuth(app).verifyIdToken(token, true); }
  catch { throw new ApiError('Your session expired. Sign in again.', 401); }
}
export function noteCollection(uid: string) { return database().collection('users').doc(uid).collection('notes'); }
export function apiError(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  return Response.json({ error: 'Could not complete the operation. Please retry.' }, { status: 500 });
}
export async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('A request body is required.');
  const decoder = new TextDecoder(); let size = 0; let body = '';
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 800000) { await reader.cancel(); throw new ApiError('Notes are too large. Split them into chapters.', 413); }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  try { return JSON.parse(body); } catch { throw new ApiError('Invalid request data.'); }
}
