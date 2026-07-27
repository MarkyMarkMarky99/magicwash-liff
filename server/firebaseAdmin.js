import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const REQUIRED_SERVICE_ACCOUNT_FIELDS = ['project_id', 'client_email', 'private_key'];

function readFirebaseServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!encoded) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 is not configured.');
  }

  let serviceAccount;
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    serviceAccount = JSON.parse(json);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 must contain Base64-encoded JSON.');
  }

  const missingFields = REQUIRED_SERVICE_ACCOUNT_FIELDS.filter(
    (field) => typeof serviceAccount?.[field] !== 'string' || !serviceAccount[field],
  );
  if (missingFields.length) {
    throw new Error(`Firebase Service Account is missing required field(s): ${missingFields.join(', ')}.`);
  }

  return serviceAccount;
}

function getFirebaseApp() {
  const [existingApp] = getApps();
  if (existingApp) return existingApp;

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (!storageBucket) {
    throw new Error('FIREBASE_STORAGE_BUCKET is not configured.');
  }

  return initializeApp({
    credential: cert(readFirebaseServiceAccount()),
    storageBucket,
  });
}

export function getFirebaseStorageBucket() {
  return getStorage(getFirebaseApp()).bucket();
}
