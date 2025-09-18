// FIX: Refactor to Firebase v8 compat syntax to fix module import errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/functions';
// --- PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE ---
// You can get this from the Firebase console:
// Project settings > General > Your apps > Web app > SDK setup and configuration
const firebaseConfig = {
    apiKey: "AIzaSyAvH1xEwR4Nps1dVYh1KCObm5uO10Md5rA",
    authDomain: "checkmate-prod-6c0b3.firebaseapp.com",
    projectId: "checkmate-prod-6c0b3",
    storageBucket: "checkmate-prod-6c0b3.firebasestorage.app",
    messagingSenderId: "546073496590",
    appId: "1:546073496590:web:80436500164c8d76bc805f"
};
// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
// Initialize and export Firebase services
export const auth = app.auth();
export const db = app.firestore();
export const storage = app.storage();
export const functions = app.functions();
// Create a callable function reference for the backend Gemini API call
export const extractCheckInfoFn = functions.httpsCallable('extractCheckInfo');
