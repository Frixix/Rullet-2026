// Mapeo número -> color (ruleta europea 0..36)
const RULETA_COLORES = {
    0: "verde",
    1: "rojo", 2: "negro", 3: "rojo", 4: "negro", 5: "rojo", 6: "negro",
    7: "rojo", 8: "negro", 9: "rojo", 10: "negro", 11: "negro", 12: "rojo",
    13: "negro", 14: "rojo", 15: "negro", 16: "rojo", 17: "negro", 18: "rojo",
    19: "rojo", 20: "negro", 21: "rojo", 22: "negro", 23: "rojo", 24: "negro",
    25: "rojo", 26: "negro", 27: "rojo", 28: "negro", 29: "negro", 30: "rojo",
    31: "negro", 32: "rojo", 33: "negro", 34: "rojo", 35: "negro", 36: "rojo"
};

// Patrones por número (C, D, E)
const PATRON_COLORES = {
    0: ["verde", "verde", "verde"],
    1: ["rojo", "rojo", "negro"], 2: ["rojo", "rojo", "rojo"], 3: ["rojo", "negro", "rojo"],
    4: ["negro", "negro", "negro"], 5: ["rojo", "negro", "rojo"], 6: ["negro", "negro", "negro"],
    7: ["rojo", "negro", "rojo"], 8: ["negro", "negro", "rojo"], 9: ["rojo", "negro", "rojo"],
    10: ["negro", "negro", "rojo"], 11: ["negro", "negro", "rojo"], 12: ["rojo", "rojo", "negro"],
    13: ["negro", "rojo", "negro"], 14: ["rojo", "rojo", "negro"], 15: ["negro", "rojo", "rojo"],
    16: ["rojo", "negro", "rojo"], 17: ["negro", "rojo", "negro"], 18: ["rojo", "negro", "rojo"],
    19: ["rojo", "negro", "rojo"], 20: ["negro", "rojo", "rojo"], 21: ["rojo", "rojo", "rojo"],
    22: ["negro", "rojo", "rojo"], 23: ["rojo", "negro", "rojo"], 24: ["negro", "rojo", "negro"],
    25: ["rojo", "negro", "rojo"], 26: ["negro", "negro", "rojo"], 27: ["rojo", "rojo", "negro"],
    28: ["negro", "negro", "rojo"], 29: ["negro", "negro", "rojo"], 30: ["rojo", "negro", "rojo"],
    31: ["negro", "rojo", "rojo"], 32: ["rojo", "negro", "rojo"], 33: ["negro", "negro", "rojo"],
    34: ["rojo", "rojo", "rojo"], 35: ["negro", "negro", "negro"], 36: ["rojo", "rojo", "rojo"]
};

class RuletaPredictor {
    constructor() {
        this.historialNumeros = [];
        this.patronActivo = false;
        this.patronActual = [];
        this.etapaActual = 0;
        this.config = {
            tipoRuleta: "Física",
            tipoJuego: "Contra humanos",
            usarMartingala: false,
            modoMartingala: 1,
            valorApuestaBase: 1000,
            nivelesMartingala: [500, 1000, 2000, 4000, 8000, 16000]
        };
        this.saldoMartingala = 0;
        this.nivelMartingala = 0;
        this.apuestaActual = 0;
    }

    getColor(numero) {
        return RULETA_COLORES[numero] || "desconocido";
    }

    analizarPatron(numero) {
        if (numero === 0) {
            this.patronActivo = false;
            this.patronActual = [];
            this.etapaActual = 0;
            return { mensaje: "Cayó 0. El patrón se reinicia automáticamente.", acierto: null };
        }

        const colorReal = this.getColor(numero);
        
        if (!PATRON_COLORES[numero]) {
            this.patronActivo = false;
            this.patronActual = [];
            this.etapaActual = 0;
            return { mensaje: `Número ${numero} sin patrón definido. Se reinicia.`, acierto: null };
        }

        // Si no hay patrón activo
        if (!this.patronActivo) {
            this.patronActual = [...PATRON_COLORES[numero]];
            this.patronActivo = true;
            this.etapaActual = 0;
            const esperado = this.patronActual[this.etapaActual];
            
            if (colorReal === esperado) {
                this.etapaActual++;
                return { 
                    mensaje: `Patrón activado con número ${numero}. Acierto en etapa C. Esperando etapa D...`,
                    acierto: true,
                    etapa: "C",
                    siguienteEsperado: this.patronActual[this.etapaActual]
                };
            } else {
                this.patronActivo = false;
                this.patronActual = [];
                this.etapaActual = 0;
                return { 
                    mensaje: `Patrón activado con número ${numero}. Fallo en etapa C. Se reinicia.`,
                    acierto: false,
                    etapa: "C"
                };
            }
        }

        // Patrón activo
        if (this.etapaActual >= 3) {
            this.patronActivo = false;
            this.patronActual = [];
            this.etapaActual = 0;
            return { mensaje: "El patrón ya había finalizado. Se reinicia.", acierto: null };
        }

        const esperado = this.patronActual[this.etapaActual];
        const letras = ["C", "D", "E"];
        
        if (colorReal === esperado) {
            this.etapaActual++;
            if (this.etapaActual === 3) {
                this.patronActivo = false;
                this.patronActual = [];
                this.etapaActual = 0;
                return { 
                    mensaje: "✅ Acierto en etapa E. ¡Patrón completo exitoso! Se reinicia.",
                    acierto: true,
                    etapa: "E",
                    completo: true
                };
            } else {
                return { 
                    mensaje: `✅ Acierto en etapa ${letras[this.etapaActual - 1]}. Próximo color esperado: ${this.patronActual[this.etapaActual]} (etapa ${letras[this.etapaActual]})`,
                    acierto: true,
                    etapa: letras[this.etapaActual - 1],
                    siguienteEsperado: this.patronActual[this.etapaActual]
                };
            }
        } else {
            const falloLetra = letras[this.etapaActual];
            const mensaje = `❌ Fallo en etapa ${falloLetra}. Color esperado: ${esperado}. Salió: ${colorReal}. Se reinicia.`;
            this.patronActivo = false;
            this.patronActual = [];
            this.etapaActual = 0;
            return { 
                mensaje: mensaje,
                acierto: false,
                etapa: falloLetra,
                esperado: esperado,
                salio: colorReal
            };
        }
    }

    procesarMartingala(resultado) {
        if (!this.config.usarMartingala) return null;
        
        const modo = this.config.modoMartingala;
        const esAciertoE = resultado.acierto === true && resultado.etapa === "E";
        const esFalloE = resultado.acierto === false && resultado.etapa === "E";
        
        let cambio = null;
        
        if (modo === 1) {
            if (esAciertoE) {
                this.saldoMartingala += 1;
                cambio = { tipo: "acierto", saldo: this.saldoMartingala };
            } else if (esFalloE) {
                this.saldoMartingala -= 1;
                cambio = { tipo: "fallo", saldo: this.saldoMartingala };
            }
        } else {
            if (esAciertoE) {
                this.saldoMartingala += this.apuestaActual;
                this.nivelMartingala = 0;
                this.apuestaActual = this.config.nivelesMartingala[this.nivelMartingala];
                cambio = { 
                    tipo: "acierto", 
                    saldo: this.saldoMartingala, 
                    proximaApuesta: this.apuestaActual 
                };
            } else if (esFalloE) {
                this.saldoMartingala -= this.apuestaActual;
                this.nivelMartingala++;
                if (this.nivelMartingala >= this.config.nivelesMartingala.length) {
                    this.nivelMartingala = this.config.nivelesMartingala.length - 1;
                }
                this.apuestaActual = this.config.nivelesMartingala[this.nivelMartingala];
                cambio = { 
                    tipo: "fallo", 
                    saldo: this.saldoMartingala, 
                    proximaApuesta: this.apuestaActual,
                    nivel: this.nivelMartingala
                };
            }
        }
        
        return cambio;
    }

    agregarNumero(numero) {
        const color = this.getColor(numero);
        const resultado = this.analizarPatron(numero);
        const martingala = this.procesarMartingala(resultado);
        
        this.historialNumeros.push({
            numero,
            color,
            timestamp: new Date(),
            resultado
        });
        
        return {
            numero,
            color,
            resultado,
            martingala,
            estadisticas: this.getEstadisticas()
        };
    }

    getEstadisticas() {
        const total = this.historialNumeros.length;
        const colores = { rojo: 0, negro: 0, verde: 0 };
        const frecuenciaNumeros = {};
        
        this.historialNumeros.forEach(item => {
            colores[item.color]++;
            frecuenciaNumeros[item.numero] = (frecuenciaNumeros[item.numero] || 0) + 1;
        });
        
        const topNumeros = Object.entries(frecuenciaNumeros)
            .map(([num, count]) => ({ numero: parseInt(num), veces: count }))
            .sort((a, b) => b.veces - a.veces)
            .slice(0, 15);
        
        return {
            total,
            colores,
            topNumeros,
            saldoMartingala: this.saldoMartingala,
            config: this.config
        };
    }

    actualizarConfig(nuevaConfig) {
        this.config = { ...this.config, ...nuevaConfig };
        if (this.config.usarMartingala) {
            this.apuestaActual = this.config.valorApuestaBase;
            this.saldoMartingala = 0;
            this.nivelMartingala = 0;
        }
        return this.config;
    }
}

module.exports = RuletaPredictor;
