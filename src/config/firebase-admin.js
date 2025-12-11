/**
 * Firebase Admin SDK Configuration
 * Initializes Firebase Admin for server-side authentication and Firestore access
 */

const admin = require('firebase-admin');

let db = null;
let initialized = false;

/**
 * Initialize Firebase Admin SDK
 * Reads FIREBASE_SERVICE_ACCOUNT from environment variables
 * Can be either a JSON string or a file path
 */
function initializeFirebaseAdmin() {
  if (initialized) {
    return { admin, db };
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccount) {
    console.warn('⚠️ Warning: FIREBASE_SERVICE_ACCOUNT environment variable not set');
    console.warn('⚠️ Firestore features requiring Admin SDK will not work');
    console.warn('⚠️ Set FIREBASE_SERVICE_ACCOUNT to enable cloud storage features');
    return { admin: null, db: null };
  }

  try {
    let credential;

    // Try to parse as JSON string first
    if (serviceAccount.trim().startsWith('{')) {
      try {
        const serviceAccountObj = JSON.parse(serviceAccount);
        credential = admin.credential.cert(serviceAccountObj);
      } catch (parseError) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', parseError.message);
        return { admin: null, db: null };
      }
    } else {
      // Treat as file path
      try {
        credential = admin.credential.cert(serviceAccount);
      } catch (fileError) {
        console.error('❌ Failed to load service account file:', fileError.message);
        return { admin: null, db: null };
      }
    }

    admin.initializeApp({
      credential: credential
    });

    db = admin.firestore();
    initialized = true;

    console.log('✅ Firebase Admin SDK initialized successfully');
    return { admin, db };
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    return { admin: null, db: null };
  }
}

// Initialize on module load
const { admin: adminInstance, db: dbInstance } = initializeFirebaseAdmin();

module.exports = {
  admin: adminInstance,
  db: dbInstance,
  isInitialized: () => initialized
};
