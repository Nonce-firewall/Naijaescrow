import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use the custom database ID provisioned for this applet
const db = initializeFirestore(app, {}, "ai-studio-b48f01d5-6cf9-4098-b3d9-4c6cfcf1475a");

export { app, auth, db };
