import { auth } from "../firebase-config.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";






const btn = document.getElementById("loginBtn");
document.addEventListener("keydown",(e)=>{
    if(e.key === "Enter"){
        btn.click()
    }
})


btn.addEventListener("click", async () => {

    const correo = document.getElementById("correo").value;
    const password = document.getElementById("password").value; 

    try {

        const userCredential = await signInWithEmailAndPassword(auth, correo, password);

        // recargar perfil por si displayName no estaba actualizado y usarlo en la ventana modal
        await userCredential.user.reload();
        const displayName = userCredential.user.displayName || correo;
        document.querySelector(".h2").textContent = `Bienvenido ${displayName} a peats al poder `
        document.querySelector(".card-modal").style.display = "flex"
        
        const cerrar = document.getElementById("cerrarModal")
       document.addEventListener("keydown",(e)=>{
    if(e.key === "Enter"){
         cerrar.click()
        }
    })
        cerrar.addEventListener("click", () =>{
            cerraModal()
        })


    } catch (error) {

        alert("Error: " + error.message);

    }

});




        function cerraModal(){
            document.querySelector(".card-modal").style.display = "none"
        window.location.href = "../inicio.html";

        }