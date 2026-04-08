# Ruleta Predictor

Backend y frontend para capturar los resultados de una ruleta europea y seguir patrones C‑D‑E con apoyo opcional de Martingala.

## Arquitectura
- **backend/**: API Express que expone la lógica del predictor (`RuletaPredictor`) y mantiene el historial, estadísticas y configuración en memoria.
- **frontend/**: Aplicación React (CRA + Tailwind) que consume los endpoints del backend, muestra estadísticas, historial y permite ingresar números o modificar parámetros.

## Prerrequisitos
1. Node.js 18+ (incluye npm).
2. `npm` (se instala con Node.js).

## Instalación

### Backend
```bash
cd backend
npm install
```

Entrena y prueba el predictor con:

| Script | Descripción |
| --- | --- |
| `npm run dev` | Arranca `nodemon` para desarrollo |
| `npm start` | Inicia el servidor Express (modo producción) |

### Frontend
```bash
cd frontend
npm install
```

Los scripts disponibles (CRA + Tailwind/PostCSS):

| Script | Descripción |
| --- | --- |
| `npm start` | Servidor de desarrollo React (puerto 3000) |
| `npm run build` | Genera la carpeta `build/` optimizada |
| `npm test` | Ejecuta tests (configuración CRA por defecto) |
| `npm run eject` | Eject opcional de CRA (no recomendado si no entiende los riesgos) |


## API principal (http://localhost:5000/api)

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/estadisticas` | Devuelve totales, distribución de colores, top 15 números, saldo Martingala y configuración |
| `GET` | `/historial` | Lista completa del historial con timestamps |
| `POST` | `/numero` | Recibe `{ numero: 0..36 }`, ejecuta `RuletaPredictor.agregarNumero()` y retorna resultado + estadísticas actualizadas |
| `POST` | `/config` | Actualiza la configuración del predictor en memoria |
| `POST` | `/reset` | Reinicia historial, patrón, martingala y apuesta actual |

## Uso básico
1. Levanta el backend (`npm run dev`).
2. Levanta el frontend (`npm start`). La UI se comunica con el backend en `http://localhost:5000/api`.
3. Registra números en el panel izquierdo, ajusta la configuración si lo deseas y visualiza estadísticas e historial.
4. Reinicia la sesión para limpiar el historial o exporta los datos (separador TODO).

## Notas importantes
- La configuración `usarMartingala` activa cálculo de saldo y niveles. Por el momento la exportación CSV solo muestra notificación en el frontend.
- Todo el estado se guarda en memoria. Para persistencia real hay que conectar persistencia o mover la lógica a un almacenamiento compartido.
