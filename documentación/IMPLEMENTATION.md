# Implementación y flujo

Este documento describe cómo funciona la lógica del predictor y cómo se conecta con el frontend.

## RuletaPredictor (`backend/ruletaLogic.js`)
1. **Estado principal**
   - `historialNumeros`: array con cada resultado (número, color, timestamp y resultado del patrón).
   - `config`: opciones como `tipoRuleta`, `usarMartingala`, `modoMartingala`, `valorApuestaBase` y `nivelesMartingala`.
   - Variables auxiliares para rastrear si hay un patrón activo (`patronActivo`, `patronActual`, `etapaActual`) y la Martingala (`saldoMartingala`, `nivelMartingala`, `apuestaActual`).

2. **Patrones C‑D‑E**
   - `RULETA_COLORES` mapea 0‑36 a rojo/negro/verde.
   - `PATRON_COLORES` define una secuencia de tres colores (C, D, E) por cada número.
   - `analizarPatron(numero)`:
     - Reinicia si cae un 0 o no hay patrón para el número.
     - Si no hay patrón activo, se inicia con el número actual y se verifica la etapa C.
     - Cuando hay patrón activo se compara el color recibido con el esperado en la etapa actual, se guarda `mensaje`, `acierto`, `etapa`, `completo` y se resetea al finalizar.

3. **Martingala**
   - `procesarMartingala(resultado)` solo opera si `config.usarMartingala` está en `true`.
   - Modo 1 (conteo básico): suma/resta 1 del saldo al acertar/fallar en etapa E.
   - Modo 2 (escalonada): usa `nivelesMartingala` para ajustar `apuestaActual`, `saldoMartingala` y `nivelMartingala` al fallar o ganarse la secuencia E.

4. **Estadísticas**
   - `getEstadisticas()` calcula conteo de colores, top 15 números y devuelve el saldo/ configuración actuales junto con el total de tiradas.

5. **Interacción del frontend**
   - `server.js` expone endpoints que llaman a los métodos anteriores y mantienen el estado en memoria.
   - `/api/numero` usa `RuletaPredictor.agregarNumero()` y responde con data compuesta.
   - `/api/config` delega en `actualizarConfig()` para repetir la configuración y reiniciar la martingala si se activa.
   - `/api/reset` borra todo el estado relevante.

## Frontend (React + Tailwind)
1. **Arquitectura**
   - `App.js`: maneja la lógica de carga de datos (`cargarEstadisticas`, `cargarHistorial`) y envía números/configuración.
   - Se usan componentes dedicados para interacción (`IngresarNumero`, `Configuracion`) y visualización (`Estadisticas`, `Historial`).

2. **Componentes clave**
   - `Configuracion`: muestra el estado actual y abre un modal para editar valores, llama al backend y refresca los datos.
   - `IngresarNumero`: valida 0‑36, llama `onSubmit` para enviar al backend y muestra el último resultado junto con el saldo Martingala si aplica.
   - `Estadisticas`: usa `recharts` para graficar colores + top 5 y tarjetas con totales.
   - `Historial`: lista los últimos 15 resultados con su timestamp local y estilo basado en el color.

3. **Flujo de datos**
   - El backend mantiene el “estado maestro”; el frontend solo lo consume y lo refleja.
   - Cada envío de número actualiza estadísticas e historial para mantener la UI sincronizada.

4. **Extensiones sugeridas**
   - Persistir `historialNumeros` en una base de datos o almacenamiento cuando se quiera analizar patrones largos.
   - Automatizar exportación CSV/Descargas en `/api/historial`.
   - Agregar validaciones/secure headers en Express si se expone el API públicamente.
