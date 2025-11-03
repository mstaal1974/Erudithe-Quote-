import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Use the v9 modular SDK for all Firebase services for consistency.
// FIX: Changed firebase imports to use the scoped @firebase packages to resolve module loading issues.
import { initializeApp } from '@firebase/app';
import { getAuth } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import { getStorage } from '@firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDMXRTJGqfNq0H_JAt3zGa3f9zun8G4TK0",
  authDomain: "erudithe-quote.firebaseapp.com",
  projectId: "erudithe-quote",
  storageBucket: "erudithe-quote.appspot.com",
  messagingSenderId: "974254788517",
  appId: "1:974254788517:web:8ea06cfc0e2974d7e0624c",
  measurementId: "G-MTH7KDQJ18"
};

// Initialize Firebase and its services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App db={db} auth={auth} storage={storage} />
  </React.StrictMode>
);