import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY1,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN1,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID1,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET1,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID1,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID1,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID1,
};

console.log('Environment Variables Status:');
console.log('NEXT_PUBLIC_FIREBASE_API_KEY1:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY1 ? 'Defined' : 'Undefined');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID1:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID1 ? 'Defined' : 'Undefined');
console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN1:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN1 ? 'Defined' : 'Undefined');
console.log('Full Firebase Config:', firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db }; 