import { auth, db } from "../firebase-config.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CLOUD_NAME = "djzjn0e54";
const UPLOAD_PRESET = "pets_poder";

const btn = document.getElementById("registrar");

async function subirACloudinary(archivo){
    if(!archivo) return null;
    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', UPLOAD_PRESET);
    const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });
    const data = await resp.json();
    return data.secure_url;
}

btn.addEventListener("click", async () => {

    const nombre = document.getElementById("nombre").value;

    const correo = document.getElementById("correo").value;

    const password = document.getElementById("password").value;

    const fotoArchivo = document.getElementById('fotoPerfil').files[0];
    const descripcionPerfil = document.getElementById('descripcionPerfil').value.trim();

    try {

        const usuario = await createUserWithEmailAndPassword(auth, correo, password);

        let photoURL = null;
        if(fotoArchivo){
            try{
                console.log('Subiendo foto a Cloudinary...');
                photoURL = await subirACloudinary(fotoArchivo);
                console.log('Foto subida exitosamente:', photoURL);
            }catch(e){
                console.error('Error subiendo foto de perfil:', e);
            }
        }

        console.log('Actualizando perfil con displayName:', nombre, 'photoURL:', photoURL);
        await updateProfile(usuario.user, { displayName: nombre, photoURL: photoURL });
        console.log('Perfil actualizado en Auth');

        try {
            await setDoc(doc(db, 'usuarios', usuario.user.uid), {
                uid: usuario.user.uid,
                displayName: nombre,
                email: correo,
                photoURL: photoURL,
                descripcion: descripcionPerfil || '',
                createdAt: Date.now()
            });
        } catch(firestoreError) {
            console.warn('Error guardando en Firestore:', firestoreError);
            // Continuar aunque falle Firestore, la cuenta se creó correctamente
        }

        alert("Cuenta creada correctamente");

        window.location.href = "../index.html";

    }
    catch(error){

        alert(error.message);

    }

});