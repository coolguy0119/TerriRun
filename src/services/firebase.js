import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCAgkRk0sCiMAkA2z4djz5hTAtM1XM4xh8",
  authDomain: "terrarun-x.firebaseapp.com",
  projectId: "terrarun-x",
  storageBucket: "terrarun-x.firebasestorage.app",
  messagingSenderId: "70188023870",
  appId: "1:70188023870:web:e42f4f804d7411f6b2916f",
  measurementId: "G-FC9ZEVJ4RG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
