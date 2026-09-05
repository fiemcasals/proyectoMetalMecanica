// script.js - Lógica del Cliente (Chat con IA)

// REEMPLAZAR ESTA URL CON LA QUE TE DÉ APPS SCRIPT AL "IMPLEMENTAR" COMO APP WEB
const SCRIPT_URL = 'ACA_VA_TU_URL_DE_APPS_SCRIPT'; 

const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const btnSend = document.getElementById('btnSend');

function agregarMensaje(texto, sender) {
    const div = document.createElement('div');
    div.classList.add('mensaje');
    div.classList.add(sender === 'user' ? 'msg-user' : 'msg-bot');
    div.innerText = texto;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function enviarMensaje() {
    const mensaje = userInput.value.trim();
    if (!mensaje) return;

    // Mostrar mensaje del usuario
    agregarMensaje(mensaje, 'user');
    userInput.value = '';

    // Validar si pegaron la URL
    if(SCRIPT_URL === 'ACA_VA_TU_URL_DE_APPS_SCRIPT') {
        agregarMensaje('⚠️ Error: Falta configurar la URL de Apps Script en script.js', 'bot');
        return;
    }

    // Mostrar indicador de carga
    const loadingId = 'loading-' + Date.now();
    const divLoading = document.createElement('div');
    divLoading.id = loadingId;
    divLoading.classList.add('mensaje', 'msg-bot');
    divLoading.style.fontStyle = 'italic';
    divLoading.innerText = 'Escribiendo...';
    chatBox.appendChild(divLoading);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Llamar a la API en Apps Script
    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        // En Apps Script doPost recibe e.postData.contents como string
        body: JSON.stringify({
            action: 'chatIA',
            mensaje: mensaje
        })
    })
    .then(response => response.json())
    .then(data => {
        // Remover indicador de carga
        document.getElementById(loadingId).remove();
        
        if(data.status === 'success') {
            agregarMensaje(data.reply, 'bot');
        } else {
            agregarMensaje('Error en el sistema. Intente de nuevo.', 'bot');
        }
    })
    .catch(error => {
        document.getElementById(loadingId).remove();
        agregarMensaje('Error de conexión.', 'bot');
    });
}

btnSend.addEventListener('click', enviarMensaje);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarMensaje();
});
