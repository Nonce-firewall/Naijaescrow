import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// Firebase configuration loaded from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyAN3Hf7K1lHu8r2yUOnbYN6RDjnljzi7lE",
  authDomain: "gen-lang-client-0358782365.firebaseapp.com",
  projectId: "gen-lang-client-0358782365",
  storageBucket: "gen-lang-client-0358782365.firebasestorage.app",
  messagingSenderId: "776375472743",
  appId: "1:776375472743:web:b10331566163196f6efac2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use the custom database ID provisioned for this applet
const db = initializeFirestore(app, {}, "ai-studio-b48f01d5-6cf9-4098-b3d9-4c6cfcf1475a");

export { app, auth, db };
