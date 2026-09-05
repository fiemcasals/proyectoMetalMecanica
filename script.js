// script.js - Lógica del Cliente (Chat con IA)

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyaXnjduXA65Uc0LpJZA8FRGlha1wuJKqEMUGfQq6l7SbFXeP0hO2cZ9DQImM3ztASz/exec'; 

const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const btnSend = document.getElementById('btnSend');

// --- SISTEMA DE MEMORIA ---
let historial = [];
let resumenGlobal = "";
// LÍMITES DIDÁCTICOS (1 Token ≈ 4 caracteres)
// Puesto en 4000 caracteres (aprox 1000 tokens) para permitir una compra fluida antes de resumir
const MAX_CARACTERES_HISTORIAL = 4000; 
const MAX_CARACTERES_RESUMEN = 4000;

function agregarMensaje(texto, sender) {
    const div = document.createElement('div');
    div.classList.add('mensaje');
    div.classList.add(sender === 'user' ? 'msg-user' : 'msg-bot');
    div.innerText = texto;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function mostrarCarga(texto) {
    const div = document.createElement('div');
    div.id = 'loadingIndicator';
    div.classList.add('mensaje', 'msg-bot');
    div.style.fontStyle = 'italic';
    div.innerText = texto;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function quitarCarga() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.remove();
}

function enviarMensaje() {
    const mensaje = userInput.value.trim();
    if (!mensaje) return;

    agregarMensaje(mensaje, 'user');
    userInput.value = '';
    
    // Guardamos en memoria
    historial.push("Cliente: " + mensaje);

    // 1. Verificar si la memoria total explotó
    if (resumenGlobal.length > MAX_CARACTERES_RESUMEN) {
        agregarMensaje('⚠️ Memoria llena. El contexto es demasiado largo. Por favor, recargá la página para iniciar una nueva consulta.', 'bot');
        return;
    }

    // 2. Verificar si toca hacer resumen
    let textoHistorial = historial.join("\n");
    
    if (textoHistorial.length > MAX_CARACTERES_HISTORIAL) {
        mostrarCarga('Pensando mucho... (Resumiendo contexto previo) 🧠');
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'summarize', historial: historial })
        })
        .then(res => res.json())
        .then(data => {
            quitarCarga();
            // Guardamos el nuevo resumen y reseteamos el historial dejando solo el mensaje actual
            resumenGlobal = data.summary;
            historial = ["Cliente: " + mensaje]; 
            // Ahora sí, llamamos a la IA para responder
            llamarBackendChat();
        })
        .catch(err => {
            quitarCarga();
            agregarMensaje('Error de conexión al resumir.', 'bot');
        });
    } else {
        // Chat normal sin resumir
        llamarBackendChat();
    }
}

function llamarBackendChat() {
    mostrarCarga('Escribiendo...');
    
    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'chatIA',
            historial: historial,
            resumen: resumenGlobal
        })
    })
    .then(response => response.json())
    .then(data => {
        quitarCarga();
        if(data.status === 'success') {
            agregarMensaje(data.reply, 'bot');
            historial.push("Asistente: " + data.reply);
        } else {
            agregarMensaje('Error en el sistema. Intente de nuevo.', 'bot');
        }
    })
    .catch(error => {
        quitarCarga();
        agregarMensaje('Error de conexión.', 'bot');
    });
}

btnSend.addEventListener('click', enviarMensaje);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarMensaje();
});
