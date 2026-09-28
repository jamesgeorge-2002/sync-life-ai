import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBmcROmQpTAPcbIZZRdGtvLVJIJ7d7OReY",
  authDomain: "lifesync-ai-7a745.firebaseapp.com",
  projectId: "lifesync-ai-7a745",
  storageBucket: "lifesync-ai-7a745.firebasestorage.app",
  messagingSenderId: "339143017671",
  appId: "1:339143017671:web:69fcd399578ca5f2feeae2"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth Providers
export const googleProvider = new GoogleAuthProvider();
