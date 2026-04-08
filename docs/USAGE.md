# Uso de Ruleta Predictor

Este documento guía cómo usar la aplicación completa una vez que backend y frontend están corriendo.

## 1. Entorno típico
1. Backend escuchando en `http://localhost:5000`.
2. Frontend ejecutándose en `http://localhost:3000` y consumiendo la API del backend.

## 2. Panel principal
Al abrir el frontend verás tres bloques principales:
- **Configuración**: muestra `tipoRuleta`, `tipoJuego`, `usarMartingala`, modo y apuesta base. Usa el botón *Editar* para abrir el modal y modificar los valores. Al guardar, la UI vuelve a cargar estadísticas del backend.
- **Ingresar número**: ingresa un número entre 0 y 36.
  - Si activas Martingala en el backend, verás el saldo actualizado cada vez que se complete la etapa E del patrón.
  - Se muestran notificaciones (react-hot-toast) con aciertos/fallos y el mensaje del predictor.
- **Estadísticas**: combinación de gráfico circular de distribución de colores, top 5 números en barras y tarjetas rápidas con total de tiradas, saldo Martingala y apuesta base.
- **Historial**: lista inversa (los últimos 15) con color y hora local. El backend registra un `timestamp` por entrada.

## 3. Flechas rápidas
- **Reiniciar sesión**: borra historial, patrón, martingala y apuesta actual. Útil para limpiar antes de una nueva simulación.
- **Exportar CSV**: actualmente muestra notificación “Funcionalidad en desarrollo”.

## 4. API directa (opcional)
Puedes llamar los endpoints manualmente desde Postman u otra herramienta:

```http
POST http://localhost:5000/api/numero
Content-Type: application/json

{"numero": 17}
```

El backend responde con:
```json
{
  "numero": 17,
  "color": "negro",
  "resultado": {...},
  "martingala": {...},
  "estadisticas": {...}
}
```

Usa `/config` para cambiar ajustes y `/reset` para limpiar la sesión.
