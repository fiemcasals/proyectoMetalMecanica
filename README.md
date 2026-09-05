# Proyecto MetalMecánica - Gonzalo 🛢️

Sistema de reventa de bidones de aceite con gestión de stock y Asistente de IA (Gemini 1.5 Flash).
Construido de forma encapsulada (HTML, CSS y JS separados) y utilizando Google Sheets + Apps Script como backend y base de datos.

## 🛠️ Paso 1: Configurar la Base de Datos (Google Sheets)
1. Abrí la hoja de cálculo de tu proyecto.
2. Andá a **Extensiones > Apps Script**.
3. Borrá todo el código que aparezca y pegá el contenido completo del archivo `codigo.gs` de este repositorio.
4. Guardá el proyecto (ícono de disquete).
5. Arriba en el menú, seleccioná la función **`inicializarHojas`** y dale al botón **Ejecutar**. 
   - *Nota: Te va a pedir permisos. Aceptalos (Avanzado > Ir a...).*
6. Volvé a tu Excel. Vas a ver que mágicamente se crearon las pestañas `Stock` y `Configuracion` con datos de ejemplo. (Podés borrar la "Hoja 1" que venía por defecto).

## 🔑 Paso 2: Obtener la Clave de la IA (Gemini API)
Para que el chat inteligente funcione sin gastar dinero, usamos Gemini 1.5 Flash:
1. Gonzalo debe entrar a [Google AI Studio](https://aistudio.google.com/) con su cuenta de Google.
2. Hacer clic en **"Get API key"** (arriba a la izquierda).
3. Clic en **"Create API key"** y luego **"Create API key in new project"**.
4. Copiar esa clave larguísima (ej: `AIzaSy...`).
5. **En tu Google Apps Script**, andá a la tuerquita (Configuración del proyecto) en la barra izquierda.
6. Bajá hasta **Propiedades del script** y hacé clic en "Agregar propiedad de la secuencia de comandos".
7. Escribí en Propiedad: `GEMINI_API_KEY` y en Valor pegá la clave que copiaste. Guardá. *(Esto mantiene la clave 100% secreta de los alumnos y del código público de GitHub).*

## 🚀 Paso 3: Publicar el Backend (Apps Script)
1. En Apps Script, hacé clic arriba a la derecha en **Implementar > Nueva implementación**.
2. Tipo: **Aplicación Web**.
3. Descripción: "API MetalMecánica".
4. Ejecutar como: **Yo**.
5. Quién tiene acceso: **Cualquier persona**.
6. Implementar. Copiá la **URL de la aplicación web**.

## 💻 Paso 4: Conectar el Frontend
1. Abrí los archivos `script.js` y `admin.js` de este repositorio.
2. En la primera línea de ambos archivos vas a encontrar la constante `SCRIPT_URL`.
3. Pegá ahí tu **URL de la aplicación web** del paso anterior.
4. Guardá, hacé un `git push` y activá GitHub Pages. 

---
### 🔒 Uso del Sistema
- **Vista Cliente (`index.html`):** Interfaz para charlar con la IA y consultar bidones. Tiene un ícono de engranaje ⚙️ oculto para ir al admin.
- **Vista Admin (`admin.html`):** Pide la contraseña (**PWIGSM**). Permite actualizar el stock y modificar si la IA es más "fría" o "cálida" alterando su Prompt maestro.
