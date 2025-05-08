// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, getDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCAlEs3Xq3Su0hpzIPL5ETeW7C6JpzJfG4",
  authDomain: "sociodent-163fc.firebaseapp.com",
  projectId: "sociodent-163fc",
  storageBucket: "sociodent-163fc.firebasestorage.app",
  messagingSenderId: "1039851725579",
  appId: "1:1039851725579:web:c630f7322d12162dc1380e",
  measurementId: "G-4QCWTPCGGM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// User Management Functions
async function addUser(userData) {
  try {
    const userRef = await addDoc(collection(db, "users"), userData);
    console.log("User added with ID: ", userRef.id);
    return userRef;
  } catch (e) {
    console.error("Error adding user: ", e);
    throw e;
  }
}

async function registerUser(email, password, userData) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: userData.name });
    await addUser({ ...userData, uid: user.uid });
    return user;
  } catch (e) {
    console.error("Error registering user: ", e);
    throw e;
  }
}

async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (e) {
    console.error("Error logging in: ", e);
    throw e;
  }
}

async function logoutUser() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Error logging out: ", e);
    throw e;
  }
}

// Document Management Functions
async function uploadDocument(file, path) {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (e) {
    console.error("Error uploading document: ", e);
    throw e;
  }
}

// Doctor Management Functions
async function addDoctor(doctorData) {
  try {
    const doctorRef = await addDoc(collection(db, "doctors"), doctorData);
    console.log("Doctor added with ID: ", doctorRef.id);
    return doctorRef;
  } catch (e) {
    console.error("Error adding doctor: ", e);
    throw e;
  }
}

// Appointment Management Functions
async function createAppointment(appointmentData) {
  try {
    const appointmentRef = await addDoc(collection(db, "appointments"), appointmentData);
    console.log("Appointment created with ID: ", appointmentRef.id);
    return appointmentRef;
  } catch (e) {
    console.error("Error creating appointment: ", e);
    throw e;
  }
}

export {
  app,
  analytics,
  db,
  auth,
  storage,
  addUser,
  registerUser,
  loginUser,
  logoutUser,
  uploadDocument,
  addDoctor,
  createAppointment
};