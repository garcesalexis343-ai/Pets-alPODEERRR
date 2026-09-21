import { auth, db } from "../firebase-config.js";
const CLOUD_NAME = "djzjn0e54";
const UPLOAD_PRESET = "pets_poder";
import {
collection,
addDoc,
getDocs,
query,
orderBy,
deleteDoc,
doc,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const modal = document.getElementById("modal");
const abrir = document.getElementById("abrirModal");
const cerrar = document.getElementById("cerrarModal");

const publicar = document.getElementById("publicar");
const contenedor = document.getElementById("contenedor-publicaciones");
const vacio = document.getElementById("sin-publicaciones");
async function convertirAWebP(archivo) {

    return new Promise((resolve) => {

        const img = new Image();

        img.onload = () => {

            let ancho = img.width;
            let alto = img.height;

            const maxAncho = 1200;

            if (ancho > maxAncho) {

                alto =
                    (alto * maxAncho) / ancho;

                ancho = maxAncho;

            }

            const canvas =
                document.createElement("canvas");

            canvas.width = ancho;
            canvas.height = alto;

            const ctx =
                canvas.getContext("2d");

            ctx.drawImage(
                img,
                0,
                0,
                ancho,
                alto
            );

            canvas.toBlob(
                (blob) => {

                    resolve(blob);

                },
                "image/webp",
                0.85
            );

        };

        img.src =
            URL.createObjectURL(archivo);

    });

}
async function subirACloudinary(archivo) {

    const imagenWebP =
        await convertirAWebP(archivo);

    const formData =
        new FormData();

    formData.append(
        "file",
        imagenWebP,
        "imagen.webp"
    );

    formData.append(
        "upload_preset",
        UPLOAD_PRESET
    );

    const respuesta =
        await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            {
                method: "POST",
                body: formData
            }
        );

    const datos =
        await respuesta.json();

    return datos.secure_url;

}
function abrirPerfil(uid){
    console.log('Abriendo perfil para uid:', uid);
    if(!uid) {
        console.error('UID vacío, no se puede abrir perfil');
        return;
    }
    window.location.href = `perfil.html?uid=${uid}`;
}

async function cargarPublicaciones() {


const q = query(
    collection(db, "publicaciones"),
    orderBy("fechaCreacion", "desc")
);

const snapshot = await getDocs(q);
if (snapshot.empty) {
    vacio.style.display = "block";
    return;
}

vacio.style.display = "none";

snapshot.forEach(async (doc) => {

    const datos = doc.data();

    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.id = doc.id;

    console.log('Renderizando publicación:', datos.titulo, 'usuarioId:', datos.usuarioId);

    card.innerHTML = `
        <div class="post-header" data-userid="${datos.usuarioId||''}">
            ${datos.usuarioFoto ? `<img src="${datos.usuarioFoto}" class="avatar" alt="avatar">` : `<div class="avatar">${(datos.usuario||'U').charAt(0)}</div>`}
            <div class="post-meta">
                <h3 class="post-title">${datos.titulo}</h3>
                <div class="post-sub">👤 ${datos.usuario} · 📅 ${datos.fecha}</div>
                <button class="profile-link">Ver perfil</button>
            </div>
        </div>

        ${datos.imagen ? `<img class="post-image" src="${datos.imagen}" alt="Imagen de publicación">` : ''}

        <div class="post-body">${datos.descripcion}</div>

        <hr>

        <h3>Comentarios</h3>

        <div class="comentarios"></div>

        <textarea class="nuevo-comentario" placeholder="Escribe un comentario"></textarea>

        <div class="actions"><button class="btn-comentar">Comentar</button></div>
    `;

    contenedor.prepend(card);

    // make avatar clickable to view user's perfil
    const profileHeader = card.querySelector('.post-header');
    if(profileHeader){
        const uid = profileHeader.dataset.userid || '';
        console.log('Post header uid:', uid);
        if(uid){
            profileHeader.style.cursor = 'pointer';
            profileHeader.addEventListener('click', ()=> {
                console.log('Click en post-header, uid:', uid);
                abrirPerfil(uid);
            });
            const profileButton = card.querySelector('.profile-link');
            if(profileButton){
                profileButton.addEventListener('click', (e)=>{
                    console.log('Click en botón Ver perfil, uid:', uid);
                    e.stopPropagation();
                    abrirPerfil(uid);
                });
            }
        } else {
            console.warn('UID vacío en post-header');
        }
    }

    // if current user is author, add edit/delete controls
    if(auth.currentUser && auth.currentUser.uid === datos.usuarioId){
        const meta = card.querySelector('.post-meta');
        if(meta){
            meta.insertAdjacentHTML('beforeend', `<div class="post-controls" style="margin-top:6px"><button class="edit-post">Editar</button> <button class="delete-post">Borrar</button></div>`);
            const delBtn = card.querySelector('.delete-post');
            const editBtn = card.querySelector('.edit-post');
            const postRef = doc(db, 'publicaciones', doc.id);
            delBtn.addEventListener('click', async ()=>{
                if(!confirm('¿Eliminar esta publicación?')) return;
                try{
                    await deleteDoc(postRef);
                    card.remove();
                }catch(e){
                    console.error(e); alert('Error al eliminar');
                }
            });
            editBtn.addEventListener('click', ()=>{
                const titleEl = card.querySelector('.post-title');
                const bodyEl = card.querySelector('.post-body');
                const currentTitle = titleEl ? titleEl.textContent : '';
                const currentBody = bodyEl ? bodyEl.textContent : '';
                // replace with editable fields
                if(titleEl) titleEl.outerHTML = `<input class="edit-title" value="${currentTitle}">`;
                if(bodyEl) bodyEl.outerHTML = `<textarea class="edit-body">${currentBody}</textarea>`;
                editBtn.style.display = 'none';
                delBtn.style.display = 'none';
                const saveBtn = document.createElement('button'); saveBtn.textContent = 'Guardar'; saveBtn.className='save-post';
                const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Cancelar'; cancelBtn.className='cancel-post';
                meta.appendChild(saveBtn); meta.appendChild(cancelBtn);
                saveBtn.addEventListener('click', async ()=>{
                    const newTitle = card.querySelector('.edit-title').value.trim();
                    const newBody = card.querySelector('.edit-body').value.trim();
                    try{
                        await updateDoc(postRef, { titulo: newTitle, descripcion: newBody });
                        // restore
                        card.querySelector('.edit-title').outerHTML = `<h3 class="post-title">${newTitle}</h3>`;
                        card.querySelector('.edit-body').outerHTML = `<div class="post-body">${newBody}</div>`;
                        saveBtn.remove(); cancelBtn.remove(); editBtn.style.display='inline-block'; delBtn.style.display='inline-block';
                    }catch(e){ console.error(e); alert('Error al guardar cambios'); }
                });
                cancelBtn.addEventListener('click', ()=>{
                    // restore original
                    if(card.querySelector('.edit-title')) card.querySelector('.edit-title').outerHTML = `<h3 class="post-title">${currentTitle}</h3>`;
                    if(card.querySelector('.edit-body')) card.querySelector('.edit-body').outerHTML = `<div class="post-body">${currentBody}</div>`;
                    saveBtn.remove(); cancelBtn.remove(); editBtn.style.display='inline-block'; delBtn.style.display='inline-block';
                });
            });
        }
    }

    const comentariosDiv =
        card.querySelector(".comentarios");

    const cajaComentario =
        card.querySelector(".nuevo-comentario");

    const btnComentar =
        card.querySelector(".btn-comentar");

    try {

        const comentariosSnapshot =
            await getDocs(
                collection(
                    db,
                    "publicaciones",
                    doc.id,
                    "comentarios"
                )
            );

        comentariosSnapshot.forEach(
            (comentarioDoc) => {

                const comentarioData =
                    comentarioDoc.data();

                const comentario =
                    document.createElement("div");

                comentario.classList.add('comentario');
                const avatarImg = comentarioData.usuarioFoto ? `<img class="avatar" src="${comentarioData.usuarioFoto}" data-userid="${comentarioData.usuarioId||''}" alt="avatar">` : `<div class="avatar" data-userid="${comentarioData.usuarioId||''}">${(comentarioData.usuario||'U').charAt(0)}</div>`;
                comentario.innerHTML = `
                    ${avatarImg}
                    <div>
                        <div class="bubble">
                            <div class="meta"><strong>${comentarioData.usuario}</strong> · <small>${comentarioData.fecha}</small></div>
                            <div class="text">${comentarioData.comentario}</div>
                        </div>
                    </div>
                `;

                comentariosDiv.appendChild(comentario);
                const cav = comentario.querySelector('.avatar');
                if(cav){
                    cav.style.cursor = 'pointer';
                    cav.addEventListener('click', ()=>{ const uid = cav.dataset.userid; if(uid) window.location.href = `perfil.html?uid=${uid}`; });
                }

            }
        );

    }
    catch (error) {

        console.error(
            "Error cargando comentarios:",
            error
        );

    }

    btnComentar.addEventListener(
        "click",
        async () => {

            if (!auth.currentUser) {

                alert(
                    "Debes iniciar sesión para comentar"
                );

                window.location.href =
                    "../auth/login.html";

                return;
            }

            const texto =
                cajaComentario.value.trim();

            if (!texto) return;

            const usuario = auth.currentUser.displayName || "Usuario";
            const usuarioId = auth.currentUser.uid || null;
            const usuarioFoto = auth.currentUser.photoURL || null;

            const fechaComentario =
                new Date().toLocaleString();

            try {

                await addDoc(
                    collection(
                        db,
                        "publicaciones",
                        doc.id,
                        "comentarios"
                    ),
                    {
                        usuario,
                        comentario: texto,
                        fecha: fechaComentario,
                        usuarioId,
                        usuarioFoto
                    }
                );

                const comentario = document.createElement("div");

                comentario.classList.add('comentario');
                const avatarHtml = usuarioFoto ? `<img class="avatar" src="${usuarioFoto}" data-userid="${usuarioId}" alt="avatar">` : `<div class="avatar" data-userid="${usuarioId}">${(usuario||'U').charAt(0)}</div>`;
                comentario.innerHTML = `
                    ${avatarHtml}
                    <div>
                        <div class="bubble">
                            <div class="meta"><strong>${usuario}</strong> · <small>${fechaComentario}</small></div>
                            <div class="text">${texto}</div>
                        </div>
                    </div>
                `;

                comentariosDiv.appendChild(comentario);

                // make comment avatar clickable
                const cav = comentario.querySelector('.avatar');
                if(cav){
                    cav.style.cursor = 'pointer';
                    cav.addEventListener('click', ()=>{ if(usuarioId) window.location.href = `perfil.html?uid=${usuarioId}`; });
                }

                cajaComentario.value = "";

            }
            catch (error) {

                console.error(error);

                alert(
                    "Error al guardar comentario"
                );

            }

        }
    );

});


}

auth.onAuthStateChanged((user) => {
    console.log('Auth state changed, user:', user?.uid);
    if (!abrir) {
        console.warn('abrirModal button not found');
        return;
    }
    if (!user) {
        abrir.style.display = "none";
    } else {
        abrir.style.display = "block";
        console.log('User authenticated, showing publish button');
    }

});

if(abrir){
    abrir.addEventListener("click", () => {
        if(modal) modal.style.display = "flex";
    });
}

if(cerrar){
    cerrar.addEventListener("click", () => {
        if(modal) modal.style.display = "none";
    });
}

modal.addEventListener("click", (e) => {

if (e.target === modal) {

    modal.style.display = "none";

}


});

cargarPublicaciones();

publicar.addEventListener(
"click",
async () => {

    if (!auth.currentUser) {

        alert(
            "Debes iniciar sesión para publicar"
        );

        window.location.href =
            "../auth/login.html";

        return;
    }

    const titulo =
        document.getElementById(
            "titulo"
        ).value;

    const descripcion =
        document.getElementById(
            "descripcion"
        ).value;

    const archivo =
        document.getElementById(
            "foto"
        ).files[0];

    if (!titulo || !descripcion) {

        alert(
            "Completa todos los campos"
        );

        return;
    }

    const fecha =
        new Date().toLocaleString();

    const usuario = auth.currentUser.displayName || "Usuario";
    const usuarioId = auth.currentUser.uid || null;
    const usuarioFoto = auth.currentUser.photoURL || null;

let publicacionId;
let imagenURL = "";

try {

    if (archivo) {

        imagenURL =
            await subirACloudinary(
                archivo
            );

    }

    const docRef =
                await addDoc(
            collection(
                db,
                "publicaciones"
            ),
            {
                        titulo,
                        descripcion,
                        usuario,
                        usuarioId,
                        usuarioFoto,
                        fecha,
                        fechaCreacion: Date.now(),
                        imagen: imagenURL
            }
        );

    publicacionId =
        docRef.id;

}
catch (error) {

    console.error(error);

    alert(
        "Error al guardar la publicación"
    );

    return;

}

    vacio.style.display = "none";

    const card =
        document.createElement("div");

    card.classList.add("card");
    card.dataset.id = publicacionId;

    let imagenHTML = "";

    if (archivo) {

        const url =
            URL.createObjectURL(
                archivo
            );

        imagenHTML = `
            <img src="${url}" alt="Foto">
        `;

    }

    card.innerHTML = `
        <div class="post-header">
            ${usuarioFoto ? `<img src="${usuarioFoto}" class="avatar" alt="avatar">` : `<div class="avatar">${(usuario||'U').charAt(0)}</div>`}
            <div class="post-meta">
                <h3 class="post-title">${titulo}</h3>
                <div class="post-sub">👤 ${usuario} · 📅 ${fecha}</div>
            </div>
        </div>

        ${imagenHTML}

        <div class="post-body">${descripcion}</div>

        <hr>

        <h3>Comentarios</h3>

        <div class="comentarios"></div>

        <textarea class="nuevo-comentario" placeholder="Escribe un comentario"></textarea>

        <div class="actions"><button class="btn-comentar">Comentar</button></div>
    `;

    contenedor.prepend(card);

    modal.style.display = "none";

    document.getElementById(
        "titulo"
    ).value = "";

    document.getElementById(
        "descripcion"
    ).value = "";

    document.getElementById(
        "foto"
    ).value = "";

    location.reload();

}


);
