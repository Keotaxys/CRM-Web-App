import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // ສຳລັບຖານຂໍ້ມູນລູກຄ້າ
import { getAuth } from "firebase/auth";           // ສຳລັບລະບົບ Login ພະນັກງານ
import { getStorage } from "firebase/storage"; // 📍 1. ເພີ່ມແຖວນີ້

// ⚠️ ເອົາໂຄ້ດ firebaseConfig ທີ່ເຈົ້າກັອບປີ້ມາຈາກເວັບ Firebase ມາວາງປ່ຽນແທນກ້ອນນີ້ທັງໝົດເລີຍເດີ້
const firebaseConfig = {
    apiKey: "AIzaSyB8JI0cDIYI1UG1YvNe8EqtzT-uR7vwcSA",
    authDomain: "crm-web-app-97b91.firebaseapp.com",
    projectId: "crm-web-app-97b91",
    storageBucket: "crm-web-app-97b91.firebasestorage.app",
    messagingSenderId: "601560289578",
    appId: "1:601560289578:web:bdfc32d0c59cc9b3300e53"
};


// ເປີດໃຊ້ງານ Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app); // 📍 2. ເພີ່ມແຖວນີ້