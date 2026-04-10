# Ruleta Predictor (Standalone)

La aplicación ahora se ejecuta íntegramente en el navegador. No hay backend ni dependencias externas: todo el flujo (patrones C‑D‑E, martingala, historial y estadísticas) vive en `docs/main.js` y se guarda automáticamente mediante `localStorage`.

## Estructura del proyecto

- `docs/index.html`: entrada única que agrupa hero, configuración, captura de números, estadísticas, historial y bitácora.
- `docs/styles.css`: sistema de cuadrículas, tarjetas, barras de color y modal que mantienen la UI organizada sin depender de frameworks.
- `docs/main.js`: implementa la clase `RuletaPredictor` (transporte directo de la lógica del backend anterior), administra el estado local y actualiza toda la UI. Persiste el estado bajo la clave `ruletaPredictorState`.

## Cómo ejecutar

1. **Abrir el archivo**  
   Simplemente abre `docs/index.html` en cualquier navegador moderno. Como no hacemos ninguna petición de red ni uso de módulos remotos, funciona con un doble clic.

2. **(Opcional) Ejecutar desde un servidor local**  
   Si prefieres un entorno servidor (para evitar limitaciones del protocolo `file://`), usa un servicio estático mínimo:
   ```bash
   cd docs
   npx http-server -p 8080
   # o
   python -m http.server 8000
   ```
   Luego visita `http://localhost:8080` o el puerto elegido.

3. **Interactuar con la app**  
   - El panel de configuración abre un modal donde eliges ruleta, tipo de juego y parámetros de martingala.  
   - Registra números entre `0` y `36` y observa el historial, los totales y la bitácora.  
   - El botón “Reiniciar sesión” borra el historial y reinicia la lógica (también se puede limpiar directamente desde las herramientas del navegador vaciando `localStorage`).

## Persistencia local

- El estado completo (historial, avances del patrón, martingala, configuración y último resultado) se guarda automáticamente en `localStorage` bajo la clave `ruletaPredictorState`.
- Si quieres compartir o versionar el estado, puedes copiar el JSON desde las herramientas de desarrollo e importarlo manualmente.
- Para ver cómo se guarda el patrón lógicamente, revisa `docs/main.js`: se copiaron los mismos mapas `RULETA_COLORES`, `PATRON_COLORES` y los motores de análisis.

## Notas

- No se mantiene ningún servidor Node/Express. El directorio `backend/` se eliminó porque ya no se usa.  
- Todo el flujo es local, lo que evita esperas de red y facilita experimentar directamente con HTML/CSS/JS.  
- La sección de balance incluye ahora un diagrama tipo velas con ejes, valores negativos y una línea cero que cambia a rojo cuando el saldo está debajo de 0, para que veas exactamente cuándo ganas o pierdes según la apuesta activa.
- Si más adelante quieres añadir almacenamiento remoto o colaboración, considera conectar estos hooks con un servicio ligero, pero la base lógica seguirá estando en `docs/main.js`.
