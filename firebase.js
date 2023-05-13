import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDU_W1m_ufaT1xFzElp_qjW1h4iUdAGsJI",
    authDomain: "higher-lower-songs-e68bc.firebaseapp.com",
    projectId: "higher-lower-songs-e68bc",
    storageBucket: "higher-lower-songs-e68bc.appspot.com",
    messagingSenderId: "1095563276461",
    appId: "1:1095563276461:web:f64d12db072217e6219624",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function userExists(userId) {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    return userDoc.exists();
}

async function createNewUser(userId) {
    const userDocRef = doc(db, "users", userId);

    await setDoc(userDocRef, {
        highScores: {},
    });
}

async function getHighScores(userId) {
    try {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);

        const highScores = userDoc.data()?.highScores;
    } catch (e) {
        alert(e);
    }

    return highScores || {};
}

async function storeHighScore(userId, paramKey, highScore) {
    const userDocRef = doc(db, "users", userId);

    await updateDoc(userDocRef, { [`highScores.${paramKey}`]: highScore });
}

async function firestoreListen(userId, callback) {
    const userDocRef = doc(db, "users", userId);

    onSnapshot(userDocRef, (doc) => {
        const highScores = doc.data()?.highScores;

        callback(highScores || {});
    });
}

window.userExists = userExists;
window.createNewUser = createNewUser;
window.getHighScores = getHighScores;
window.storeHighScore = storeHighScore;
window.firestoreListen = firestoreListen;
