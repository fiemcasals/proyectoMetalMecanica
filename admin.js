// REEMPLAZAR CON TU URL DE APPS SCRIPT
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyaXnjduXA65Uc0LpJZA8FRGlha1wuJKqEMUGfQq6l7SbFXeP0hO2cZ9DQImM3ztASz/exec'; 

const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const adminPassword = document.getElementById('adminPassword');
const btnLogin = document.getElementById('btnLogin');
const loginError = document.getElementById('loginError');

const perfilIA = document.getElementById('perfilIA');
const reglasIA = document.getElementById('reglasIA');
const btnSaveConfig = document.getElementById('btnSaveConfig');
const configStatus = document.getElementById('configStatus');

const stockContainer = document.getElementById('stockContainer');
const btnSaveStock = document.getElementById('btnSaveStock');
const stockStatus = document.getElementById('stockStatus');

const ticketsContainer = document.getElementById('ticketsContainer');

let currentPassword = "";

btnLogin.addEventListener('click', () => {
    if (adminPassword.value === 'PWIGSM') {
        currentPassword = adminPassword.value;
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'flex';
        cargarDatosDelServidor();
    } else {
        loginError.style.display = 'block';
    }
});

function cargarDatosDelServidor() {
    // Cargar Configuración (Perfil y Reglas)
    fetch(SCRIPT_URL + "?action=getConfig")
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                perfilIA.value = data.perfil;
                reglasIA.value = data.reglas;
            }
        });

    // Cargar Stock
    fetch(SCRIPT_URL + "?action=getStock")
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                renderizarTablaStock(data.data);
            }
        });

    // Cargar Tickets
    fetch(SCRIPT_URL + "?action=getTickets")
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                renderizarTickets(data.data);
            }
        });
}

function renderizarTablaStock(stockMatriz) {
    let html = '<table>';
    html += '<tr><th>ID</th><th>Tipo</th><th>Detalle</th><th>Cant. Disp.</th><th>Precio ($)</th></tr>';
    stockMatriz.forEach((fila, index) => {
        html += `<tr>
            <td>${fila[0]}</td><td>${fila[1]}</td><td>${fila[2]}</td>
            <td><input type="number" class="stock-input" id="stock_${index}_3" value="${fila[3]}"></td>
            <td><input type="number" class="stock-input" id="stock_${index}_4" value="${fila[4]}"></td>
        </tr>`;
    });
    html += '</table>';
    stockContainer.innerHTML = html;
    window.stockActual = stockMatriz;
}

function renderizarTickets(tickets) {
    if(tickets.length === 0) {
        ticketsContainer.innerHTML = "<p>✅ No hay consultas pendientes.</p>";
        return;
    }

    let html = '';
    tickets.forEach(ticket => {
        const idTicket = ticket[0];
        const pregunta = ticket[2];
        const correo = ticket[3];
        html += `
        <div class="ticket-box" id="box_${idTicket}">
            <p><strong>De:</strong> ${correo}</p>
            <p><strong>Pregunta:</strong> ${pregunta}</p>
            <textarea id="respuesta_${idTicket}" rows="3" placeholder="Escribí tu respuesta acá..."></textarea>
            <button onclick="responderTicket('${idTicket}', '${correo}', '${pregunta.replace(/'/g, "\\'")}')">Enviar Respuesta y Aprender</button>
        </div>`;
    });
    ticketsContainer.innerHTML = html;
}

btnSaveConfig.addEventListener('click', () => {
    btnSaveConfig.innerText = 'Guardando...';
    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'updateConfig',
            password: currentPassword,
            perfil: perfilIA.value,
            reglas: reglasIA.value
        })
    }).then(res => res.json()).then(data => {
        btnSaveConfig.innerText = 'Guardar Configuración';
        if(data.status === 'success') {
            configStatus.innerText = '¡Guardado!';
            setTimeout(() => configStatus.innerText = '', 3000);
        }
    });
});

btnSaveStock.addEventListener('click', () => {
    btnSaveStock.innerText = 'Guardando...';
    let nuevasFilas = [];
    window.stockActual.forEach((fila, index) => {
        let nuevaFila = [...fila];
        nuevaFila[3] = document.getElementById(`stock_${index}_3`).value;
        nuevaFila[4] = document.getElementById(`stock_${index}_4`).value;
        nuevasFilas.push(nuevaFila);
    });

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateStock', password: currentPassword, stockRows: nuevasFilas })
    }).then(res => res.json()).then(data => {
        btnSaveStock.innerText = 'Guardar Cambios de Stock';
        if(data.status === 'success') {
            stockStatus.innerText = '¡Actualizado!';
            setTimeout(() => stockStatus.innerText = '', 3000);
        }
    });
});

window.responderTicket = function(idTicket, correo, pregunta) {
    const respuesta = document.getElementById(`respuesta_${idTicket}`).value;
    if(!respuesta) { alert("Escribí una respuesta primero"); return; }
    
    document.getElementById(`box_${idTicket}`).innerHTML = "<i>Enviando correo y procesando...</i>";

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'responderTicket',
            password: currentPassword,
            idTicket: idTicket,
            correo: correo,
            pregunta: pregunta,
            respuesta: respuesta
        })
    }).then(res => res.json()).then(data => {
        if(data.status === 'success') {
            document.getElementById(`box_${idTicket}`).innerHTML = "<p style='color:green'>✅ Respondido y aprendido por la IA.</p>";
        } else {
            document.getElementById(`box_${idTicket}`).innerHTML = "<p style='color:red'>❌ Error al enviar.</p>";
        }
    });
};
