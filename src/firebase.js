import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBtSVEsNhsAE7DSFHdcqGWHZr_KoW2eopE",
  authDomain: "once-beer-freebies.firebaseapp.com",
  projectId: "once-beer-freebies",
  storageBucket: "once-beer-freebies.firebasestorage.app",
  messagingSenderId: "1086628064028",
  appId: "1:1086628064028:web:761adb4233e8a31db9e8d9",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);