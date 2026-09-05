// admin.js - Lógica del Panel de Administración

// REEMPLAZAR ESTA URL CON LA MISMA URL QUE PUSISTE EN script.js
const SCRIPT_URL = 'ACA_VA_TU_URL_DE_APPS_SCRIPT'; 

// Elementos del DOM
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const adminPassword = document.getElementById('adminPassword');
const btnLogin = document.getElementById('btnLogin');
const loginError = document.getElementById('loginError');

const perfilIA = document.getElementById('perfilIA');
const btnSavePerfil = document.getElementById('btnSavePerfil');
const perfilStatus = document.getElementById('perfilStatus');

const stockContainer = document.getElementById('stockContainer');
const btnSaveStock = document.getElementById('btnSaveStock');
const stockStatus = document.getElementById('stockStatus');

let currentPassword = "";

// Función de login local
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
    if(SCRIPT_URL === 'ACA_VA_TU_URL_DE_APPS_SCRIPT') {
        stockContainer.innerText = '⚠️ Error: Falta configurar la URL de Apps Script en admin.js';
        return;
    }

    // Cargar Perfil
    fetch(SCRIPT_URL + "?action=getPerfil")
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                perfilIA.value = data.data;
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
}

function renderizarTablaStock(stockMatriz) {
    let html = '<table>';
    html += '<tr><th>ID</th><th>Tipo</th><th>Detalle</th><th>Cant. Disponible</th><th>Precio ($)</th></tr>';
    
    stockMatriz.forEach((fila, index) => {
        html += `<tr>
            <td>${fila[0]}</td>
            <td>${fila[1]}</td>
            <td>${fila[2]}</td>
            <td><input type="number" class="stock-input" id="stock_${index}_3" value="${fila[3]}"></td>
            <td><input type="number" class="stock-input" id="stock_${index}_4" value="${fila[4]}"></td>
        </tr>`;
    });
    
    html += '</table>';
    stockContainer.innerHTML = html;
    
    // Guardar la data original globalmente para poder reconstruirla al guardar
    window.stockActual = stockMatriz;
}

// Guardar nuevo perfil
btnSavePerfil.addEventListener('click', () => {
    btnSavePerfil.innerText = 'Guardando...';
    
    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'updatePerfil',
            password: currentPassword,
            nuevoPerfil: perfilIA.value
        })
    })
    .then(res => res.json())
    .then(data => {
        btnSavePerfil.innerText = 'Guardar Perfil';
        if(data.status === 'success') {
            perfilStatus.innerText = '¡Guardado!';
            setTimeout(() => perfilStatus.innerText = '', 3000);
        }
    });
});

// Guardar stock editado
btnSaveStock.addEventListener('click', () => {
    btnSaveStock.innerText = 'Guardando...';
    
    // Reconstruir la matriz de stock con los nuevos valores
    let nuevasFilas = [];
    window.stockActual.forEach((fila, index) => {
        let nuevaFila = [...fila];
        nuevaFila[3] = document.getElementById(`stock_${index}_3`).value;
        nuevaFila[4] = document.getElementById(`stock_${index}_4`).value;
        nuevasFilas.push(nuevaFila);
    });

    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'updateStock',
            password: currentPassword,
            stockRows: nuevasFilas
        })
    })
    .then(res => res.json())
    .then(data => {
        btnSaveStock.innerText = 'Guardar Cambios de Stock';
        if(data.status === 'success') {
            stockStatus.innerText = '¡Stock actualizado!';
            setTimeout(() => stockStatus.innerText = '', 3000);
        }
    });
});
