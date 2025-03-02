import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD9xptocrcqxargneQaHpPEajHFflpWkT8",
  authDomain: "solace-f0548.firebaseapp.com",
  projectId: "solace-f0548",
  storageBucket: "solace-f0548.firebasestorage.app",
  messagingSenderId: "737415671852",
  appId: "1:737415671852:web:ab32f2d01598d82ca72189"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); 

export { auth, db };
