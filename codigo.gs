const CONFIG = {
  adminPassword: "PWIGSM"
};

function inicializarHojas() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  
  let hojaStock = libro.getSheetByName("Stock");
  if (!hojaStock) {
    hojaStock = libro.insertSheet("Stock");
    hojaStock.appendRow(["ID", "Tipo de Bidón", "Detalle/Litros", "Cantidad Disponible", "Precio"]);
    hojaStock.getRange("A1:E1").setFontWeight("bold");
    hojaStock.appendRow(["B001", "Plástico", "20 Litros", 50, 15000]);
    hojaStock.appendRow(["B002", "Metálico", "200 Litros", 10, 85000]);
    hojaStock.appendRow(["B003", "Plástico Reciclado", "10 Litros", 120, 8000]);
  }
  
  let hojaConfig = libro.getSheetByName("Configuracion");
  if (!hojaConfig) {
    hojaConfig = libro.insertSheet("Configuracion");
    hojaConfig.appendRow(["Parametro", "Valor"]);
    hojaConfig.getRange("A1:B1").setFontWeight("bold");
    const perfilBase = "Sos el asistente virtual de 'MetalMecánica Gonzalo', una empresa que revende bidones de aceite. Respondés de forma súper cálida, amigable y usando emojis. Tu objetivo es ayudar al cliente a encontrar el bidón que busca. Solo podés vender los productos que te paso en mi contexto. Sé conciso y directo.";
    hojaConfig.appendRow(["Perfil_IA", perfilBase]);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === "getStock") return ContentService.createTextOutput(JSON.stringify({ status: "success", data: obtenerStock() })).setMimeType(ContentService.MimeType.JSON);
  if (action === "getPerfil") return ContentService.createTextOutput(JSON.stringify({ status: "success", data: obtenerPerfilIA() })).setMimeType(ContentService.MimeType.JSON);
  return ContentService.createTextOutput("Acción no reconocida.");
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  // RUTAS PÚBLICAS
  if (action === "chatIA") {
    const respuestaIA = llamarGeminiChat(data.historial, data.resumen);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", reply: respuestaIA })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "summarize") {
    const nuevoResumen = llamarGeminiResumen(data.historial);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", summary: nuevoResumen })).setMimeType(ContentService.MimeType.JSON);
  }

  // RUTAS PROTEGIDAS
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

// === LÓGICA DE BASE DE DATOS ===
function obtenerStock() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Stock").getDataRange().getValues().slice(1); }
function actualizarStock(filasModificadas) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Stock");
  hoja.getRange(2, 1, hoja.getLastRow(), hoja.getLastColumn()).clearContent();
  hoja.getRange(2, 1, filasModificadas.length, filasModificadas[0].length).setValues(filasModificadas);
}
function obtenerPerfilIA() {
  const datos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Configuracion").getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) if (datos[i][0] === "Perfil_IA") return datos[i][1];
  return "";
}
function actualizarPerfilIA(nuevoPerfil) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Configuracion");
  const datos = hoja.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) if (datos[i][0] === "Perfil_IA") { hoja.getRange(i + 1, 2).setValue(nuevoPerfil); return; }
}

// === INTEGRACIÓN CON GEMINI ===
function llamarGeminiChat(historialArr, resumenAnterior) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const perfil = obtenerPerfilIA();
  const stockActual = JSON.stringify(obtenerStock());

  let prompt = `${perfil}\n\n`;
  prompt += `REGLAS ESTRICTAS DE RESPUESTA:\n`;
  prompt += `1. NO INVENTES DATOS. Si el cliente pregunta algo que no está en tu Stock o en tu Perfil (como métodos de pago, envíos, o productos que no tenés), respondé amablemente que no tenés esa información por el momento.\n`;
  prompt += `2. NO ASUMAS NADA. Basate ÚNICAMENTE en la información explícita que se te provee a continuación.\n\n`;
  prompt += `Stock actual disponible (ID, Tipo, Detalle, Cantidad, Precio): ${stockActual}\n`;
  if (resumenAnterior && resumenAnterior.length > 0) {
    prompt += `\nRESUMEN DE LA CHARLA HASTA AHORA (Recordá esto para responder):\n${resumenAnterior}\n`;
  }
  prompt += `\nÚLTIMOS MENSAJES:\n${historialArr.join('\n')}\n\nEscribí tu próxima respuesta:`;

  return enviarPeticionGemini(apiKey, prompt);
}

function llamarGeminiResumen(historialArr) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const prompt = `Actuá como un secretario. Hacé un resumen MUY corto y directo de esta conversación entre un cliente y el bot. Extraé solamente los datos clave (qué bidón quiere, cantidad, y en qué estado está la venta):\n\n${historialArr.join('\n')}`;
  
  return enviarPeticionGemini(apiKey, prompt);
}

function enviarPeticionGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const options = { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    if (json.candidates && json.candidates.length > 0) return json.candidates[0].content.parts[0].text;
    return "Error al procesar la respuesta. Detalle: " + response.getContentText();
  } catch (e) {
    return "Error de conexión con la IA.";
  }
}

function debugModelos() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
  console.log(response.getContentText());
  return response.getContentText();
}
