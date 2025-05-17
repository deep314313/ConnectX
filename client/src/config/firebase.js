import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, browserPopupRedirectResolver } from 'firebase/auth';
// import { getAnalytics } from 'firebase/analytics';

// Try to use environment variables, fall back to window.config if available
const getFirebaseConfig = () => {
  // First try env variables
  if (process.env.REACT_APP_FIREBASE_API_KEY) {
    console.log('Using Firebase config from environment variables');
    return {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
    };
  }
  
  // Fall back to window.config if available
  if (window.config && window.config.firebase) {
    console.log('Using Firebase config from window.config');
    return window.config.firebase;
  }
  
  console.error('No Firebase configuration found');
  return {}; // Empty config will cause Firebase to throw a meaningful error
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Configure auth with custom settings to handle COOP issues
const auth = getAuth(app);

// Configure auth with popup settings
auth.settings = {
  // This helps with Cross-Origin-Opener-Policy issues
  appVerificationDisabledForTesting: process.env.NODE_ENV !== 'production'
};

// const analytics = getAnalytics(app);

export { app, auth }; // Remove analytics from export 