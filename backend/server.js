const express = require('express');
const cors = require('cors');
const RuletaPredictor = require('./ruletaLogic');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Instancia global del predictor
const predictor = new RuletaPredictor();

// Endpoints
app.get('/api/estadisticas', (req, res) => {
    res.json(predictor.getEstadisticas());
});

app.post('/api/numero', (req, res) => {
    const { numero } = req.body;
    
    if (numero === undefined || numero < 0 || numero > 36) {
        return res.status(400).json({ error: 'Número inválido. Debe estar entre 0 y 36' });
    }
    
    const resultado = predictor.agregarNumero(numero);
    res.json(resultado);
});

app.post('/api/config', (req, res) => {
    const nuevaConfig = req.body;
    const config = predictor.actualizarConfig(nuevaConfig);
    res.json(config);
});

app.get('/api/historial', (req, res) => {
    res.json(predictor.historialNumeros);
});

app.post('/api/reset', (req, res) => {
    // Resetear el estado (para nueva sesión)
    predictor.historialNumeros = [];
    predictor.patronActivo = false;
    predictor.patronActual = [];
    predictor.etapaActual = 0;
    predictor.saldoMartingala = 0;
    predictor.nivelMartingala = 0;
    predictor.apuestaActual = 0;
    res.json({ message: 'Sesión reiniciada' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
