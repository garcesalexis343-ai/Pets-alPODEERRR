import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
apiKey: "AIzaSyCx_vEutNrbCSIn9C2bXC9aTXZwblwXuOk",
authDomain: "pets-al-poder.firebaseapp.com",
projectId: "pets-al-poder",
storageBucket: "pets-al-poder.firebasestorage.app",
messagingSenderId: "509430037330",
appId: "1:509430037330:web:97a9f3bf0d936dfa41d88b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
