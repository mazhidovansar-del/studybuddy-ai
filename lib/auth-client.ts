"use client";
import { getAuth } from 'firebase/auth';
import { app } from './firebase';
import { validateApiResponse } from './api-response';
export const auth = getAuth(app);
export async function apiFetch(url: string, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to continue.');
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);headers.set('Authorization',`Bearer ${token}`);
  const response = await fetch(url,{...init,headers,cache:'no-store'});
  return validateApiResponse(response);
}
