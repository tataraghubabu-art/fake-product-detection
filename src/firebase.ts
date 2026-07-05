import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Firestore Helpers
export const syncUserProfile = async (user: FirebaseUser) => {
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);
  
  if (!userDoc.exists()) {
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: new Date().toISOString()
    });
  }
};

export const saveScan = async (uid: string, scanData: any) => {
  return await addDoc(collection(db, 'scans'), {
    ...scanData,
    uid,
    timestamp: Date.now()
  });
};

export const getScans = (uid: string, callback: (scans: any[]) => void) => {
  const q = query(
    collection(db, 'scans'),
    where('uid', '==', uid),
    orderBy('timestamp', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const scans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(scans);
  }, (error) => {
    console.error('Firestore Error:', error);
  });
};
