import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqFSoM5cUD_kVZXyz0Y-xvq4mN9so7Dsg",
  authDomain: "keystrike-8b06a.firebaseapp.com",
  projectId: "keystrike-8b06a",
  storageBucket: "keystrike-8b06a.firebasestorage.app",
  messagingSenderId: "606259928735",
  appId: "1:606259928735:web:2d2213b6803cfae9830caa",
  measurementId: "G-KQBGG88CRW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);