"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import type { Analytics } from "firebase/analytics";

// Firebase web configuration identifies the project; access is enforced by
// Firebase Authentication and Firestore Security Rules, not by hiding this config.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ...(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }
    : {}),
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId ||
    !firebaseConfig.storageBucket || !firebaseConfig.messagingSenderId || !firebaseConfig.appId) {
  throw new Error('Firebase web configuration is missing. Set the NEXT_PUBLIC_FIREBASE_* environment variables.');
}

// Reuse the app during development hot reloads.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

let analyticsPromise: Promise<Analytics | null> | undefined;

// Call from a browser effect: Analytics is not available during server rendering.
export function initializeFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  analyticsPromise ??= import("firebase/analytics").then(async ({ getAnalytics, isSupported }) => {
    if (!(await isSupported())) return null;
    return getAnalytics(app);
  }).catch(() => {
    analyticsPromise = undefined;
    return null;
  });
  return analyticsPromise;
}
