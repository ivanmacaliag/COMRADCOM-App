import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAd5HL1Ek-12Y4abRSUIx1aDTxIk8PP94o",
  authDomain: "comradcom-47787.firebaseapp.com",
  projectId: "comradcom-47787",
  storageBucket: "comradcom-47787.firebasestorage.app",
  messagingSenderId: "189117407263",
  appId: "1:189117407263:web:8ca74a87b8946250ae752a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
