import { auth, db } from "../firebase-config.js";
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc, Timestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CLOUD_NAME = "djzjn0e54";
const UPLOAD_PRESET = "pets_poder";

const feed = document.getElementById('mis-publicaciones');
const perfilInfo = document.getElementById('perfil-info');
const modal = document.getElementById("modal");
const abrir = document.getElementById("abrirModal");
const cerrar = document.getElementById("cerrarModal");
const publicar = document.getElementById("publicar");
const loader = document.getElementById('site-loader');

const params = new URLSearchParams(window.location.search);
const uidParam = params.get('uid');

// Mostrar spinner al inicio
if(loader) loader.style.display = 'flex';

// Verificar que el botón existe
console.log('Botón abrirModal:', abrir);
if(abrir) {
    console.log('Botón existe, display actual:', window.getComputedStyle(abrir).display);
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'error') {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    if(tipo === 'error') {
        notif.style.background = '#e74c3c';
        notif.style.color = 'white';
    } else if(tipo === 'success') {
        notif.style.background = '#27ae60';
        notif.style.color = 'white';
    } else if(tipo === 'info') {
        notif.style.background = '#3498db';
        notif.style.color = 'white';
    }
    
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    // Agregar animación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    if(!document.querySelector('style[data-notif]')) {
        style.setAttribute('data-notif', 'true');
        document.head.appendChild(style);
    }
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

async function convertirAWebP(archivo) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let ancho = img.width;
            let alto = img.height;
            const maxAncho = 1200;
            if (ancho > maxAncho) {
                alto = (alto * maxAncho) / ancho;
                ancho = maxAncho;
            }
            const canvas = document.createElement("canvas");
            canvas.width = ancho;
            canvas.height = alto;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, ancho, alto);
            canvas.toBlob((blob) => {
                resolve(blob);
            }, "image/webp", 0.85);
        };
        img.src = URL.createObjectURL(archivo);
    });
}

async function subirACloudinary(archivo) {
    const imagenWebP = await convertirAWebP(archivo);
    const formData = new FormData();
    formData.append("file", imagenWebP, "imagen.webp");
    formData.append("upload_preset", UPLOAD_PRESET);
    const respuesta = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
    );
    const datos = await respuesta.json();
    return datos.secure_url;
}

function ocultarSpinner() {
    if(loader) loader.style.display = 'none';
}

async function loadProfileByUid(uid){
    try {
        console.log('Cargando perfil público para uid:', uid);
        const userDocRef = doc(db, 'usuarios', uid);
        const userSnapshot = await getDoc(userDocRef);
        const profileData = userSnapshot.exists() ? userSnapshot.data() : null;
        console.log('Firestore profile data:', profileData);

        const displayName = profileData?.displayName || 'Perfil';
        const photoURL = profileData?.photoURL || null;
        const descripcion = profileData?.descripcion || '';
        
        console.log('Cargando perfil con displayName:', displayName, 'photoURL:', photoURL);

        // Mostrar el perfil primero
        perfilInfo.innerHTML = `
            <div style="display:flex;gap:12px;align-items:center">
                ${photoURL ? `<img src="${photoURL}" style="width:64px;height:64px;border-radius:50%">` : `<div style="width:64px;height:64px;border-radius:50%;background:#cfcfcf;display:flex;align-items:center;justify-content:center;font-weight:700">${(displayName||'U').charAt(0)}</div>`}
                <div>
                    <strong>${displayName}</strong>
                </div>
            </div>
        `;
        const descEl = document.getElementById('perfil-description');
        if(descEl){
            descEl.textContent = descripcion;
        }

        // Intentar cargar publicaciones sin orderBy (no requiere índice)
        try {
            console.log('Cargando publicaciones para uid:', uid);
            const q = query(collection(db, 'publicaciones'), where('usuarioId', '==', uid));
            const snapshot = await getDocs(q);
            console.log('Publicaciones encontradas:', snapshot.size);
            
            feed.innerHTML = '';

            if(snapshot.empty){
                feed.innerHTML = '<div id="sin-publicaciones"><h2>No hay publicaciones</h2></div>';
                ocultarSpinner();
                return;
            }

            // Ordenar por fecha en el cliente
            const posts = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
            posts.sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0));

            posts.forEach(d => {
                const card = document.createElement('div');
                card.className = 'card';
                const canDelete = auth.currentUser && auth.currentUser.uid === uid;
                card.innerHTML = `
                    <div class="post-header">
                        ${d.usuarioFoto ? `<img src="${d.usuarioFoto}" class="avatar">` : `<div class="avatar">${(d.usuario||'U').charAt(0)}</div>`}
                        <div class="post-meta">
                            <h3 class="post-title">${d.titulo}</h3>
                            <div class="post-sub">${d.fecha}</div>
                            ${canDelete ? `<div class="post-controls" style="margin-top:6px"><button class="delete-post" style="background:#e74c3c;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-weight:bold;">🗑️ Borrar</button></div>` : ''}
                        </div>
                    </div>
                    ${d.imagen ? `<img src="${d.imagen}" class="post-image">` : ''}
                    <div class="post-body">${d.descripcion}</div>
                `;
                feed.appendChild(card);
                
                // Agregar evento para borrar si es el dueño
                if(canDelete) {
                    const delBtn = card.querySelector('.delete-post');
                    if(delBtn) {
                        delBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            if(!confirm('¿Eliminar esta publicación?')) return;
                            try {
                                const postRef = doc(db, 'publicaciones', d.id);
                                await deleteDoc(postRef);
                                card.remove();
                                console.log('Publicación eliminada:', d.id);
                            } catch(error) {
                                console.error('Error al eliminar:', error);
                                mostrarNotificacion('Error al eliminar la publicación', 'error');
                            }
                        });
                    }
                }
            });
            ocultarSpinner();
        } catch(pubError) {
            console.error('Error cargando publicaciones:', pubError);
            feed.innerHTML = '<div id="sin-publicaciones"><h2>No hay publicaciones</h2></div>';
            ocultarSpinner();
        }
    } catch(error) {
        console.error('Error cargando perfil público:', error);
        perfilInfo.innerHTML = '<h2>Error al cargar el perfil</h2>';
        ocultarSpinner();
    }
}

// Manejar modal
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

if(modal){
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}

// Crear publicación
if(publicar){
    publicar.addEventListener("click", async () => {
        const titulo = document.getElementById('titulo')?.value || '';
        const descripcion = document.getElementById('descripcion')?.value || '';
        const fotoInput = document.getElementById('foto');

        if(!titulo || !descripcion){
            mostrarNotificacion('Por favor completa todos los campos', 'error');
            return;
        }

        publicar.disabled = true;
        publicar.textContent = 'Publicando...';
        if(loader) loader.style.display = 'flex';

        try {
            let imagen = null;
            if(fotoInput && fotoInput.files[0]){
                console.log('Subiendo imagen...');
                imagen = await subirACloudinary(fotoInput.files[0]);
                console.log('Imagen subida:', imagen);
            }

            const nuevaPublicacion = {
                titulo,
                descripcion,
                imagen: imagen || null,
                usuario: auth.currentUser.displayName || auth.currentUser.email,
                usuarioId: auth.currentUser.uid,
                usuarioFoto: auth.currentUser.photoURL || null,
                fecha: new Date().toLocaleDateString('es-ES'),
                fechaCreacion: Timestamp.now()
            };

            const docRef = await addDoc(collection(db, 'publicaciones'), nuevaPublicacion);
            console.log('Publicación creada con ID:', docRef.id);

            // Limpiar formulario
            document.getElementById('titulo').value = '';
            document.getElementById('descripcion').value = '';
            if(fotoInput) fotoInput.value = '';
            if(modal) modal.style.display = 'none';

            // Recargar publicaciones
            if(!uidParam){
                window.location.reload();
            }
        } catch(error) {
            console.error('Error creando publicación:', error);
            mostrarNotificacion('Error al publicar: ' + error.message, 'error');
        } finally {
            publicar.disabled = false;
            publicar.textContent = 'Publicar';
            if(loader) loader.style.display = 'none';
        }
    });
}

// Si es perfil público
if(uidParam){
    console.log('Perfil público para uid:', uidParam);
    
    // Esperar a que Auth cargue para comparar si es nuestro propio perfil
    auth.onAuthStateChanged((user) => {
        if(user && user.uid === uidParam) {
            // Es nuestro propio perfil, mostrar botón
            console.log('Es nuestro propio perfil, mostrando botón');
            if(abrir) abrir.style.display = 'block';
        } else {
            // Es perfil de otro usuario, ocultar botón
            console.log('Es perfil ajeno, ocultando botón');
            if(abrir) abrir.style.display = 'none';
        }
    });
    
    loadProfileByUid(uidParam).catch(err => {
        console.error('Error en loadProfileByUid:', err);
        ocultarSpinner();
    });
} else {
    // Perfil propio (sin uid en URL) - NO tocar el display del botón, ya está visible
    console.log('Perfil propio (sin uid) - botón visible');
    
    auth.onAuthStateChanged(async (user) => {
        if(!user){
            window.location.href = '../index.html';
            return;
        }

        try {
            console.log('Cargando perfil para usuario:', user.uid);
            console.log('Auth user displayName:', user.displayName);
            console.log('Auth user photoURL:', user.photoURL);
            
            const userProfileSnap = await getDoc(doc(db, 'usuarios', user.uid));
            const profileData = userProfileSnap.exists() ? userProfileSnap.data() : null;
            console.log('Firestore profile data:', profileData);
            
            const displayName = profileData?.displayName || user.displayName || user.email;
            const photoURL = profileData?.photoURL || user.photoURL || null;
            const descripcion = profileData?.descripcion || '';
            
            console.log('Usando displayName:', displayName, 'photoURL:', photoURL);

            perfilInfo.innerHTML = `
                <div style="display:flex;gap:12px;align-items:center">
                    ${photoURL ? `<img src="${photoURL}" style="width:64px;height:64px;border-radius:50%">` : `<div style="width:64px;height:64px;border-radius:50%;background:#cfcfcf;display:flex;align-items:center;justify-content:center;font-weight:700">${(displayName||'U').charAt(0)}</div>`}
                    <div>
                        <strong>${displayName}</strong>
                        <div style="font-size:0.9rem;color:#6b7280">${user.email}</div>
                    </div>
                </div>
            `;
            const descEl = document.getElementById('perfil-description');
            if(descEl){
                descEl.textContent = descripcion;
            }

            // cargar publicaciones del usuario
            const q = query(collection(db, 'publicaciones'), where('usuarioId', '==', user.uid), orderBy('fechaCreacion', 'desc'));
            const snapshot = await getDocs(q);
            feed.innerHTML = '';
            if(snapshot.empty){
                feed.innerHTML = '<div id="sin-publicaciones"><h2>No tienes publicaciones aún</h2></div>';
                ocultarSpinner();
                return;
            }

            snapshot.forEach(docRef => {
                const d = docRef.data();
                console.log('Renderizando publicación:', d.titulo, 'id:', docRef.id);
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div class="post-header">
                        ${d.usuarioFoto ? `<img src="${d.usuarioFoto}" class="avatar">` : `<div class="avatar">${(d.usuario||'U').charAt(0)}</div>`}
                        <div class="post-meta">
                            <h3 class="post-title">${d.titulo}</h3>
                            <div class="post-sub">${d.fecha}</div>
                            <div class="post-controls" style="margin-top:6px"><button class="delete-post" style="background:#e74c3c;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-weight:bold;">🗑️ Borrar</button></div>
                        </div>
                    </div>
                    ${d.imagen ? `<img src="${d.imagen}" class="post-image">` : ''}
                    <div class="post-body">${d.descripcion}</div>
                `;
                feed.appendChild(card);

                // Agregar evento para borrar
                const delBtn = card.querySelector('.delete-post');
                console.log('Buscando botón de eliminar:', delBtn);
                if(delBtn) {
                    console.log('Botón encontrado, agregando evento para:', docRef.id);
                    delBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        console.log('Click en botón eliminar para:', docRef.id);
                        if(!confirm('¿Eliminar esta publicación?')) return;
                        try {
                            const postRef = doc(db, 'publicaciones', docRef.id);
                            await deleteDoc(postRef);
                            card.remove();
                            console.log('Publicación eliminada:', docRef.id);
                        } catch(error) {
                            console.error('Error al eliminar:', error);
                            alert('Error al eliminar la publicación');
                        }
                    });
                } else {
                    console.warn('No se encontró el botón de eliminar');
                }
            });
            ocultarSpinner();
        } catch(error) {
            console.error('Error cargando perfil:', error);
            feed.innerHTML = '<h2>Error al cargar el perfil</h2>';
            ocultarSpinner();
        }
    });
}
