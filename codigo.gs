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
    hojaConfig.appendRow(["Perfil_IA", "Sos el asistente virtual de 'MetalMecánica Gonzalo', una empresa que revende bidones de aceite. Respondés de forma súper cálida, amigable y usando emojis. Tu objetivo es ayudar al cliente a encontrar el bidón que busca. Solo podés vender los productos que te paso en mi contexto. Sé conciso y directo."]);
    hojaConfig.appendRow(["Reglas_IA", "1. NO INVENTES DATOS. Si te preguntan algo que no está en tu Stock o FAQ, respondé que no sabés y PEDILE SU CORREO ELECTRÓNICO para que Gonzalo le responda más tarde.\n2. NO ASUMAS NADA."]);
    hojaConfig.appendRow(["Admin_Email", "tu_correo@ejemplo.com"]);
  }

  let hojaFAQ = libro.getSheetByName("Preguntas_Frecuentes");
  if (!hojaFAQ) {
    hojaFAQ = libro.insertSheet("Preguntas_Frecuentes");
    hojaFAQ.appendRow(["Pregunta", "Respuesta"]);
    hojaFAQ.getRange("A1:B1").setFontWeight("bold");
  }

  let hojaTickets = libro.getSheetByName("Consultas_Pendientes");
  if (!hojaTickets) {
    hojaTickets = libro.insertSheet("Consultas_Pendientes");
    hojaTickets.appendRow(["ID_Ticket", "Fecha", "Pregunta", "Correo"]);
    hojaTickets.getRange("A1:D1").setFontWeight("bold");
  }
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === "getStock") return ContentService.createTextOutput(JSON.stringify({ status: "success", data: obtenerStock() })).setMimeType(ContentService.MimeType.JSON);
  if (action === "getConfig") return ContentService.createTextOutput(JSON.stringify({ status: "success", perfil: obtenerConfig("Perfil_IA"), reglas: obtenerConfig("Reglas_IA"), adminEmail: obtenerConfig("Admin_Email") })).setMimeType(ContentService.MimeType.JSON);
  if (action === "getTickets") return ContentService.createTextOutput(JSON.stringify({ status: "success", data: obtenerTickets() })).setMimeType(ContentService.MimeType.JSON);
  return ContentService.createTextOutput("Acción no reconocida.");
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  // RUTAS PÚBLICAS
  if (action === "chatIA") {
    let respuestaIA = llamarGeminiChat(data.historial, data.resumen);
    
    // Extraer ticket si existe
    if (respuestaIA.includes("||TICKET||")) {
      const partes = respuestaIA.split("||TICKET||");
      respuestaIA = partes[0].trim(); // Lo que se muestra al usuario
      
      const ticketInfo = partes[1].split("||");
      if(ticketInfo.length >= 2) {
         guardarTicketNuevo(ticketInfo[0].trim(), ticketInfo[1].trim());
      }
    }

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

  if (action === "updateConfig") {
    actualizarConfig("Perfil_IA", data.perfil);
    actualizarConfig("Reglas_IA", data.reglas);
    actualizarConfig("Admin_Email", data.adminEmail);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Configuración actualizada." })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "updateStock") {
    actualizarStock(data.stockRows);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Stock actualizado." })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "responderTicket") {
    const result = enviarEmailYGuardarFAQ(data.idTicket, data.correo, data.pregunta, data.respuesta);
    return ContentService.createTextOutput(JSON.stringify({ status: result.success ? "success" : "error", message: result.success ? "Email enviado y FAQ guardada." : result.error })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Acción no reconocida." })).setMimeType(ContentService.MimeType.JSON);
}

// === LÓGICA DE BASE DE DATOS ===
function obtenerStock() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Stock").getDataRange().getValues().slice(1); }
function actualizarStock(filasModificadas) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Stock");
  if(hoja.getLastRow() > 1) hoja.getRange(2, 1, hoja.getLastRow()-1, hoja.getLastColumn()).clearContent();
  hoja.getRange(2, 1, filasModificadas.length, filasModificadas[0].length).setValues(filasModificadas);
}
function obtenerConfig(param) {
  const datos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Configuracion").getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) if (datos[i][0] === param) return datos[i][1];
  return "";
}
function actualizarConfig(param, valor) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Configuracion");
  const datos = hoja.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) if (datos[i][0] === param) { hoja.getRange(i + 1, 2).setValue(valor); return; }
}
function obtenerFAQ() { 
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Preguntas_Frecuentes");
  if(!hoja) return [];
  return hoja.getDataRange().getValues().slice(1); 
}
function obtenerTickets() { 
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Consultas_Pendientes");
  if(!hoja || hoja.getLastRow() <= 1) return [];
  return hoja.getDataRange().getValues().slice(1); 
}
function guardarTicketNuevo(pregunta, correo) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Consultas_Pendientes");
  const idTicket = "TKT-" + Date.now();
  const fecha = new Date().toLocaleString();
  hoja.appendRow([idTicket, fecha, pregunta, correo]);
  
  // Notificar al administrador
  try {
    const adminEmail = obtenerConfig("Admin_Email");
    if (adminEmail && adminEmail.includes("@")) {
      const asunto = "NUEVO TICKET: Pregunta en el bot de MetalMecánica";
      const cuerpo = `¡Hola!\n\nAlguien hizo una pregunta que el bot no supo responder.\n\nPregunta: "${pregunta}"\nCorreo del cliente: ${correo}\n\nIngresá al panel de administración web para responderle y enseñarle al bot.`;
      MailApp.sendEmail(adminEmail, asunto, cuerpo);
    }
  } catch(e) {}
}

function enviarEmailYGuardarFAQ(idTicket, correo, pregunta, respuesta) {
  try {
    // 1. Enviar Email
    const asunto = "Respuesta a tu consulta - MetalMecánica Gonzalo";
    const cuerpo = `¡Hola!\n\nNos consultaste lo siguiente:\n"${pregunta}"\n\nRespuesta:\n${respuesta}\n\n¡Gracias por contactarnos!\nSaludos,\nEl equipo de MetalMecánica Gonzalo`;
    MailApp.sendEmail(correo, asunto, cuerpo);
    
    // 2. Guardar en FAQ
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Preguntas_Frecuentes").appendRow([pregunta, respuesta]);
    
    // 3. Borrar el ticket de pendientes
    const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Consultas_Pendientes");
    const datos = hoja.getDataRange().getValues();
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0] === idTicket) {
        hoja.deleteRow(i + 1);
        break;
      }
    }
    return { success: true };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// === INTEGRACIÓN CON GEMINI ===
function llamarGeminiChat(historialArr, resumenAnterior) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const perfil = obtenerConfig("Perfil_IA");
  const reglas = obtenerConfig("Reglas_IA");
  const stockActual = JSON.stringify(obtenerStock());
  const faqActual = JSON.stringify(obtenerFAQ());

  let prompt = `${perfil}\n\n`;
  prompt += `REGLAS ESTRICTAS DE RESPUESTA:\n${reglas}\n`;
  prompt += `INSTRUCCIÓN ESPECIAL PARA CORREOS: Si pediste un correo y el cliente te lo da, agradecele y DEBES agregar AL FINAL de tu respuesta exactamente este texto oculto: ||TICKET||la pregunta original que no supiste responder||correo_del_cliente@ejemplo.com||\n\n`;
  
  prompt += `Stock actual disponible: ${stockActual}\n`;
  prompt += `Preguntas Frecuentes (Base de conocimiento histórica): ${faqActual}\n`;
  
  if (resumenAnterior && resumenAnterior.length > 0) {
    prompt += `\nRESUMEN DE LA CHARLA HASTA AHORA:\n${resumenAnterior}\n`;
  }
  prompt += `\nÚLTIMOS MENSAJES:\n${historialArr.join('\n')}\n\nEscribí tu próxima respuesta:`;

  return enviarPeticionGemini(apiKey, prompt);
}

function llamarGeminiResumen(historialArr) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const prompt = `Hacé un resumen conciso de esta conversación. Extraé solo datos clave:\n\n${historialArr.join('\n')}`;
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
    return "Error al procesar la respuesta.";
  } catch (e) { return "Error de conexión con la IA."; }
}
