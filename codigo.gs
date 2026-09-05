const CONFIG = {
  adminPassword: "PWIGSM" // Contraseña maestra para el admin
};

// ==========================================
// FUNCIÓN PARA PREPARAR EL EXCEL POR 1RA VEZ
// ==========================================
function inicializarHojas() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Crear Hoja de Stock si no existe
  let hojaStock = libro.getSheetByName("Stock");
  if (!hojaStock) {
    hojaStock = libro.insertSheet("Stock");
    hojaStock.appendRow(["ID", "Tipo de Bidón", "Detalle/Litros", "Cantidad Disponible", "Precio"]);
    hojaStock.getRange("A1:E1").setFontWeight("bold");
    
    // Datos de ejemplo para Gonzalo
    hojaStock.appendRow(["B001", "Plástico", "20 Litros", 50, 15000]);
    hojaStock.appendRow(["B002", "Metálico", "200 Litros", 10, 85000]);
    hojaStock.appendRow(["B003", "Plástico Reciclado", "10 Litros", 120, 8000]);
  }
  
  // 2. Crear Hoja de Configuración si no existe
  let hojaConfig = libro.getSheetByName("Configuracion");
  if (!hojaConfig) {
    hojaConfig = libro.insertSheet("Configuracion");
    hojaConfig.appendRow(["Parametro", "Valor"]);
    hojaConfig.getRange("A1:B1").setFontWeight("bold");
    
    // Perfil inicial de la IA (Gonzalo puede editar esto después para que sea más fría o cálida)
    const perfilBase = "Sos el asistente virtual de 'MetalMecánica Gonzalo', una empresa que revende bidones de aceite. Respondés de forma súper cálida, amigable y usando emojis. Tu objetivo es ayudar al cliente a encontrar el bidón que busca. Solo podés vender los productos que te paso en mi contexto. Sé conciso y directo.";
    hojaConfig.appendRow(["Perfil_IA", perfilBase]);
  }
}


// ==========================================
// RESPONDER PETICIONES GET (Leer Datos)
// ==========================================
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === "getStock") {
    const stock = obtenerStock();
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: stock })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "getPerfil") {
    const perfil = obtenerPerfilIA();
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: perfil })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput("Acción no reconocida.");
}


// ==========================================
// RESPONDER PETICIONES POST (Guardar o Hablar con IA)
// ==========================================
function doPost(e) {
  // Manejar el formato de los datos que vienen del frontend
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  // RUTAS PÚBLICAS (IA)
  if (action === "chatIA") {
    const respuestaIA = llamarGemini(data.mensaje);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", reply: respuestaIA })).setMimeType(ContentService.MimeType.JSON);
  }

  // RUTAS PROTEGIDAS (Admin)
  if (data.password !== CONFIG.adminPassword) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Contraseña incorrecta." })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "updatePerfil") {
    actualizarPerfilIA(data.nuevoPerfil);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Perfil de IA actualizado correctamente." })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "updateStock") {
    actualizarStock(data.stockRows);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Stock guardado correctamente." })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Acción no reconocida." })).setMimeType(ContentService.MimeType.JSON);
}


// ==========================================
// FUNCIONES AUXILIARES (Base de Datos)
// ==========================================
function obtenerStock() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Stock");
  const datos = hoja.getDataRange().getValues();
  // Quitar la fila de encabezados y devolver el resto
  return datos.slice(1);
}

function actualizarStock(filasModificadas) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Stock");
  // Por simplicidad, borramos los datos viejos (manteniendo encabezado) y sobreescribimos
  // Esto es ideal para una app interna con pocos productos
  hoja.getRange(2, 1, hoja.getLastRow(), hoja.getLastColumn()).clearContent();
  hoja.getRange(2, 1, filasModificadas.length, filasModificadas[0].length).setValues(filasModificadas);
}

function obtenerPerfilIA() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Configuracion");
  const datos = hoja.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === "Perfil_IA") {
      return datos[i][1];
    }
  }
  return "";
}

function actualizarPerfilIA(nuevoPerfil) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Configuracion");
  const datos = hoja.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === "Perfil_IA") {
      hoja.getRange(i + 1, 2).setValue(nuevoPerfil);
      return;
    }
  }
}


// ==========================================
// INTEGRACIÓN CON GEMINI 1.5 FLASH (Google AI)
// ==========================================
function llamarGemini(mensajeUsuario) {
  // Sacamos la clave secreta guardada en Apps Script
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return "Error: La API Key de Gemini no está configurada en Apps Script.";

  const perfil = obtenerPerfilIA();
  const stockActual = JSON.stringify(obtenerStock()); // Le pasamos el stock a la IA para que sepa qué vender

  const promptMaestro = `${perfil}\n\nStock actual disponible en tu base de datos (Formato: ID, Tipo, Litros, Cantidad, Precio): ${stockActual}\n\nMensaje del cliente: ${mensajeUsuario}`;

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: promptMaestro }] }]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    if (json.candidates && json.candidates.length > 0) {
      return json.candidates[0].content.parts[0].text;
    } else {
      return "Hubo un error al procesar tu respuesta con la IA. Detalle: " + response.getContentText();
    }
  } catch (e) {
    return "Error de conexión con la IA.";
  }
}
