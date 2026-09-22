import admin from 'firebase-admin';
import path from 'node:path';
import fs from 'node:fs';

let firebaseApp = null;

export function getMessaging() {
  if (!firebaseApp) {
    const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
    const backendServiceAccountPath = path.resolve(process.cwd(), 'backend', 'firebase-service-account.json');
    const parentServiceAccountPath = path.resolve(process.cwd(), '..', 'backend', 'firebase-service-account.json');
    
    let filePath = null;
    if (fs.existsSync(backendServiceAccountPath)) {
      filePath = backendServiceAccountPath;
    } else if (fs.existsSync(serviceAccountPath)) {
      filePath = serviceAccountPath;
    } else if (fs.existsSync(parentServiceAccountPath)) {
      filePath = parentServiceAccountPath;
    }

    if (!filePath) {
      console.warn('⚠️ [FCM Warning] firebase-service-account.json not found. Push notifications will operate in simulation mode.');
      return null;
    }

    try {
      const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ [FCM] Firebase Admin SDK initialized successfully for project:', serviceAccount.project_id);
    } catch (err) {
      console.error('❌ [FCM Error] Failed to initialize Firebase Admin SDK:', err.message);
      return null;
    }
  }

  try {
    return admin.messaging(firebaseApp);
  } catch (err) {
    console.error('❌ [FCM Error] Failed to get messaging instance:', err.message);
    return null;
  }
}
