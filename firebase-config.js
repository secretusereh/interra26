// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// Pronto añadiremos Firestore (Base de datos) aquí también

const firebaseConfig = {
    apiKey: "AIzaSyDRkUJnDLzknFz3KOnPEm4UFsgf6R4z1Uk",
    authDomain: "interra26-22ecd.firebaseapp.com",
    projectId: "interra26-22ecd",
    storageBucket: "interra26-22ecd.firebasestorage.app",
    messagingSenderId: "960505222050",
    appId: "1:960505222050:web:a9943c6fec9532141f98fb",
    measurementId: "G-Q4WWX5TLK4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // Exportamos 'auth' para usarlo en auth.js
