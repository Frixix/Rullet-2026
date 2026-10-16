const STORAGE_KEY = 'ruletaPredictorState';
const DEFAULT_LATEST_MESSAGE = 'Ningún número registrado aún.';
const MAX_HISTORIAL_REGISTROS = 1000;

// ─────────────────────────────────────────────
// COLORES OFICIALES DE RULETA EUROPEA (0 - 36)
// ─────────────────────────────────────────────
const RULETA_COLORES = {
  0: 'verde',
  1: 'rojo', 2: 'negro', 3: 'rojo', 4: 'negro', 5: 'rojo', 6: 'negro',
  7: 'rojo', 8: 'negro', 9: 'rojo', 10: 'negro', 11: 'negro', 12: 'rojo',
  13: 'negro', 14: 'rojo', 15: 'negro', 16: 'rojo', 17: 'negro', 18: 'rojo',
  19: 'rojo', 20: 'negro', 21: 'rojo', 22: 'negro', 23: 'rojo', 24: 'negro',
  25: 'rojo', 26: 'negro', 27: 'rojo', 28: 'negro', 29: 'negro', 30: 'rojo',
  31: 'negro', 32: 'rojo', 33: 'negro', 34: 'rojo', 35: 'negro', 36: 'rojo'
};

// ─────────────────────────────────────────────
// MAPA DE SECUENCIA C — D — E (PATRÓN DE COLORES)
// Define las 3 etapas encadenadas para cada número
// ─────────────────────────────────────────────
const PATRON_COLORES = {
  0: ['verde', 'verde', 'verde'],
  1: ['rojo', 'rojo', 'negro'],
  2: ['negro', 'negro', 'negro'],
  3: ['rojo', 'negro', 'rojo'],
  4: ['negro', 'negro', 'negro'],
  5: ['rojo', 'negro', 'rojo'],
  6: ['negro', 'negro', 'negro'],
  7: ['rojo', 'negro', 'rojo'],
  8: ['negro', 'negro', 'rojo'],
  9: ['rojo', 'negro', 'rojo'],
  10: ['negro', 'negro', 'rojo'],
  11: ['negro', 'negro', 'rojo'],
  12: ['rojo', 'rojo', 'negro'],
  13: ['negro', 'rojo', 'negro'],
  14: ['rojo', 'rojo', 'negro'],
  15: ['negro', 'rojo', 'rojo'],
  16: ['rojo', 'negro', 'rojo'],
  17: ['negro', 'rojo', 'negro'],
  18: ['rojo', 'negro', 'rojo'],
  19: ['rojo', 'negro', 'rojo'],
  20: ['negro', 'rojo', 'rojo'],
  21: ['rojo', 'rojo', 'rojo'],
  22: ['negro', 'rojo', 'rojo'],
  23: ['rojo', 'negro', 'rojo'],
  24: ['negro', 'rojo', 'negro'],
  25: ['rojo', 'negro', 'rojo'],
  26: ['negro', 'negro', 'rojo'],
  27: ['rojo', 'rojo', 'negro'],
  28: ['negro', 'negro', 'rojo'],
  29: ['negro', 'negro', 'rojo'],
  30: ['rojo', 'negro', 'rojo'],
  31: ['negro', 'rojo', 'rojo'],
  32: ['rojo', 'negro', 'rojo'],
  33: ['negro', 'negro', 'rojo'],
  34: ['rojo', 'rojo', 'rojo'],
  35: ['negro', 'negro', 'negro'],
  36: ['rojo', 'rojo', 'rojo']
};

// ─────────────────────────────────────────────
// CLASE PRINCIPAL: RULETA PREDICTOR & ANTIGRAVITY
// ─────────────────────────────────────────────
class RuletaPredictor {
  constructor() {
    this.resetState();
  }

  calcularNivelesMartingala(base) {
    const b = Number(base) || 1000;
    return [b, b * 2, b * 4, b * 8]; // Límite estricto de 4 niveles para control de varianza
  }

  getDefaultConfig() {
    const base = 1000;
    return {
      tipoRuleta: 'Europea',
      umbralRacha: 4, // Calibrado para respuesta en sesiones reales (1 en ~18 tiradas)
      umbralZScore: 1.5,
      usarMartingala: false,
      modoMartingala: 1, // 1: Plana condicional, 2: Escalonada
      valorApuestaBase: base,
      nivelesMartingala: this.calcularNivelesMartingala(base)
    };
  }

  resetState() {
    const config = this.getDefaultConfig();
    this.historialNumeros = [];
    this.totalTiradasContador = 0;

    // Estado del Patrón Secuencial C-D-E
    this.patronActivo = false;
    this.patronNumeroOrigen = null;
    this.patronActual = [];
    this.etapaActual = 0; // 0: C, 1: D, 2: E
    this.ultimoPatronResultado = null;

    // Configuración y Capital
    this.config = { ...config };
    this.saldoMartingala = 0;
    this.nivelMartingala = 0;
    this.apuestaActual = config.valorApuestaBase;
    this.posicionAbierta = null;

    // Diagnósticos y Línea temporal de velas
    this.ultimoResultado = null;
    this.ultimoAnalisis = null;
    this.balanceTimeline = [];
  }

  loadState(state) {
    if (!state) return;
    this.historialNumeros = Array.isArray(state.historialNumeros) ? state.historialNumeros : [];
    if (this.historialNumeros.length > MAX_HISTORIAL_REGISTROS) {
      this.historialNumeros = this.historialNumeros.slice(-MAX_HISTORIAL_REGISTROS);
    }
    this.totalTiradasContador = typeof state.totalTiradasContador === 'number'
      ? state.totalTiradasContador
      : this.historialNumeros.length;

    // Restaurar patrón C-D-E
    this.patronActivo = Boolean(state.patronActivo);
    this.patronNumeroOrigen = state.patronNumeroOrigen ?? null;
    this.patronActual = Array.isArray(state.patronActual) ? state.patronActual : [];
    this.etapaActual = typeof state.etapaActual === 'number' ? state.etapaActual : 0;
    this.ultimoPatronResultado = state.ultimoPatronResultado || null;

    // Configuración
    this.config = { ...this.getDefaultConfig(), ...state.config };
    if (!Array.isArray(this.config.nivelesMartingala) || !this.config.nivelesMartingala.length) {
      this.config.nivelesMartingala = this.calcularNivelesMartingala(this.config.valorApuestaBase);
    }
    this.saldoMartingala = state.saldoMartingala ?? 0;
    this.nivelMartingala = state.nivelMartingala ?? 0;
    this.apuestaActual =
      typeof state.apuestaActual === 'number' ? state.apuestaActual : this.config.valorApuestaBase;
    this.posicionAbierta = state.posicionAbierta || null;
    this.ultimoResultado = state.ultimoResultado || null;
    this.ultimoAnalisis = state.ultimoAnalisis || null;
    this.balanceTimeline = Array.isArray(state.balanceTimeline) ? state.balanceTimeline : [];
    if (this.balanceTimeline.length > MAX_HISTORIAL_REGISTROS) {
      this.balanceTimeline = this.balanceTimeline.slice(-MAX_HISTORIAL_REGISTROS);
    }

    // Re-evaluar motor si hay tiradas pero falta análisis
    if (this.historialNumeros.length > 0 && !this.ultimoAnalisis) {
      const ultimo = this.historialNumeros[this.historialNumeros.length - 1];
      this.ultimoAnalisis = this.evaluarMotorAntigravity(ultimo.numero, this.ultimoPatronResultado);
    }
  }

  serializeState() {
    return {
      historialNumeros: this.historialNumeros,
      totalTiradasContador: this.totalTiradasContador,
      patronActivo: this.patronActivo,
      patronNumeroOrigen: this.patronNumeroOrigen,
      patronActual: this.patronActual,
      etapaActual: this.etapaActual,
      ultimoPatronResultado: this.ultimoPatronResultado,
      config: this.config,
      saldoMartingala: this.saldoMartingala,
      nivelMartingala: this.nivelMartingala,
      apuestaActual: this.apuestaActual,
      posicionAbierta: this.posicionAbierta,
      ultimoResultado: this.ultimoResultado,
      ultimoAnalisis: this.ultimoAnalisis,
      balanceTimeline: this.balanceTimeline
    };
  }

  getColor(numero) {
    return RULETA_COLORES[numero] || 'verde';
  }

  getPropiedades(numero) {
    const color = this.getColor(numero);
    let paridad = 'cero';
    let rango = 'cero';
    let docena = 'cero';
    let columna = 'cero';

    if (numero > 0) {
      paridad = numero % 2 === 0 ? 'par' : 'impar';
      rango = numero <= 18 ? 'falta' : 'pasa';
      docena = Math.ceil(numero / 12);
      columna = ((numero - 1) % 3) + 1;
    }
    return { numero, color, paridad, rango, docena, columna };
  }

  // ─────────────────────────────────────────────
  // 1. ANÁLISIS DE PATRÓN SECUENCIAL C — D — E
  // ─────────────────────────────────────────────
  analizarPatron(numero) {
    const colorReal = this.getColor(numero);

    // Si cae 0, el patrón secuencial se reinicia automáticamente (factor disyuntor de la casa)
    if (numero === 0) {
      this.patronActivo = false;
      this.patronNumeroOrigen = null;
      this.patronActual = [];
      this.etapaActual = 0;
      const res = {
        mensaje: 'Aparición del 0 (Verde). Margen de la casa aplicado. Secuencia C-D-E reiniciada.',
        acierto: null,
        etapa: null,
        completo: false,
        siguienteEsperado: null
      };
      this.ultimoPatronResultado = res;
      return res;
    }

    if (!PATRON_COLORES[numero]) {
      this.patronActivo = false;
      this.patronNumeroOrigen = null;
      this.patronActual = [];
      this.etapaActual = 0;
      const res = {
        mensaje: `Número ${numero} sin patrón asignado. Secuencia reseteada.`,
        acierto: null,
        etapa: null,
        completo: false,
        siguienteEsperado: null
      };
      this.ultimoPatronResultado = res;
      return res;
    }

    const letras = ['C', 'D', 'E'];

    // Si NO hay patrón activo, la tirada actual define e inaugura la secuencia
    if (!this.patronActivo) {
      this.patronActual = [...PATRON_COLORES[numero]];
      this.patronNumeroOrigen = numero;
      this.patronActivo = true;
      this.etapaActual = 0;

      const esperadoC = this.patronActual[0];
      if (colorReal === esperadoC) {
        // Etapa C superada inmediatamente con el número de inicio
        this.etapaActual = 1; // Avanza a esperar Etapa D
        const res = {
          mensaje: `Patrón activado por #${numero}. Etapa C superada ✅. Próximo color esperado (Etapa D): ${this.patronActual[1].toUpperCase()}`,
          acierto: true,
          etapa: 'C',
          completo: false,
          siguienteEsperado: this.patronActual[1],
          esperado: esperadoC,
          salio: colorReal
        };
        this.ultimoPatronResultado = res;
        return res;
      }

      // No coincidió con la primera fase teórica
      this.patronActivo = false;
      this.patronNumeroOrigen = null;
      this.patronActual = [];
      this.etapaActual = 0;
      const res = {
        mensaje: `Patrón activado por #${numero}, pero no coincidió con Etapa C (esperado: ${esperadoC}, salió: ${colorReal}). Se reinicia.`,
        acierto: false,
        etapa: 'C',
        completo: false,
        siguienteEsperado: null,
        esperado: esperadoC,
        salio: colorReal
      };
      this.ultimoPatronResultado = res;
      return res;
    }

    // Si ya HAY un patrón activo en curso (esperando Etapa D o Etapa E)
    const esperado = this.patronActual[this.etapaActual];
    const etapaLetra = letras[this.etapaActual];

    if (colorReal === esperado) {
      this.etapaActual++;

      if (this.etapaActual === 3) {
        // ¡Etapa E completada con éxito!
        this.patronActivo = false;
        this.patronNumeroOrigen = null;
        this.patronActual = [];
        this.etapaActual = 0;
        const res = {
          mensaje: `🎯 ¡Acierto en Etapa E! Secuencia C-D-E completada con éxito. Reiniciando ciclo secuencial.`,
          acierto: true,
          etapa: 'E',
          completo: true,
          siguienteEsperado: null,
          esperado,
          salio: colorReal
        };
        this.ultimoPatronResultado = res;
        return res;
      }

      // Etapa D superada, ahora esperando Etapa E (fase de entrada/apuesta)
      const res = {
        mensaje: `✅ Acierto en Etapa ${etapaLetra}. ¡Atención! Próximo color esperado (Etapa ${letras[this.etapaActual]} - Fase de Disparo): ${this.patronActual[this.etapaActual].toUpperCase()}`,
        acierto: true,
        etapa: etapaLetra,
        completo: false,
        siguienteEsperado: this.patronActual[this.etapaActual],
        esperado,
        salio: colorReal
      };
      this.ultimoPatronResultado = res;
      return res;
    }

    // Fallo en la etapa en curso
    const falloLetra = etapaLetra;
    this.patronActivo = false;
    this.patronNumeroOrigen = null;
    this.patronActual = [];
    this.etapaActual = 0;
    const res = {
      mensaje: `❌ Fallo en Etapa ${falloLetra}. Color esperado: ${esperado.toUpperCase()}, Salió: ${colorReal.toUpperCase()}. Patrón reiniciado.`,
      acierto: false,
      etapa: falloLetra,
      completo: false,
      siguienteEsperado: null,
      esperado,
      salio: colorReal
    };
    this.ultimoPatronResultado = res;
    return res;
  }

  // ─────────────────────────────────────────────
  // 2. CÁLCULO DE RACHAS (TEMPORALES)
  // ─────────────────────────────────────────────
  calcularRachas() {
    if (!this.historialNumeros.length) return null;
    const n = this.historialNumeros.length;
    const ultimo = this.historialNumeros[n - 1];

    // Racha de color
    let countColor = 0;
    for (let i = n - 1; i >= 0; i--) {
      if (this.historialNumeros[i].color === ultimo.color) countColor++;
      else break;
    }

    // Racha de paridad
    let countParidad = 0;
    if (ultimo.paridad !== 'cero') {
      for (let i = n - 1; i >= 0; i--) {
        if (this.historialNumeros[i].paridad === ultimo.paridad) countParidad++;
        else break;
      }
    }

    // Racha de rango (falta / pasa)
    let countRango = 0;
    if (ultimo.rango !== 'cero') {
      for (let i = n - 1; i >= 0; i--) {
        if (this.historialNumeros[i].rango === ultimo.rango) countRango++;
        else break;
      }
    }

    const pSimple = 18 / 37;
    const probColor = ultimo.color === 'verde'
      ? Math.pow(1 / 37, countColor)
      : Math.pow(pSimple, countColor);
    const probParidad = Math.pow(pSimple, countParidad);
    const probRango = Math.pow(pSimple, countRango);

    const probRupturaColor = (1 - probColor) * 100;
    const probRupturaParidad = (1 - probParidad) * 100;

    const formatProb = (p) => {
      const pct = p * 100;
      return pct < 0.01 ? `${pct.toExponential(2)}%` : `${pct.toFixed(2)}%`;
    };

    return {
      color: {
        tipo: ultimo.color,
        count: countColor,
        probabilidad: formatProb(probColor),
        probRaw: probColor,
        probRuptura: probRupturaColor.toFixed(1),
        texto: `${countColor} ${ultimo.color.toUpperCase()}`
      },
      paridad: {
        tipo: ultimo.paridad,
        count: countParidad,
        probabilidad: formatProb(probParidad),
        probRaw: probParidad,
        probRuptura: probRupturaParidad.toFixed(1),
        texto: `${countParidad} ${ultimo.paridad.toUpperCase()}`
      },
      rango: {
        tipo: ultimo.rango,
        count: countRango,
        probabilidad: formatProb(probRango),
        probRaw: probRango,
        texto: `${countRango} ${ultimo.rango.toUpperCase()}`
      }
    };
  }

  // ─────────────────────────────────────────────
  // 3. DESVIACIÓN ESTÁNDAR (Z-SCORE)
  // ─────────────────────────────────────────────
  calcularZScores() {
    const total = this.historialNumeros.length;
    if (!total) return { local: 0, macro: 0 };

    const p = 18 / 37;
    const windowSize = Math.min(20, total);
    const windowItems = this.historialNumeros.slice(-windowSize);

    let rojoLocal = 0, negroLocal = 0, verdeLocal = 0;
    windowItems.forEach((item) => {
      if (item.color === 'rojo') rojoLocal++;
      else if (item.color === 'negro') negroLocal++;
      else if (item.color === 'verde') verdeLocal++;
    });

    const expLocal = windowSize * p;
    const sigmaLocal = Math.sqrt(windowSize * p * (1 - p));

    const ultimo = this.historialNumeros[total - 1];
    let obsLocal = 0;
    if (ultimo.color === 'rojo') obsLocal = rojoLocal;
    else if (ultimo.color === 'negro') obsLocal = negroLocal;

    const zLocal = sigmaLocal > 0 ? (obsLocal - expLocal) / sigmaLocal : 0;

    let rojoMacro = 0, negroMacro = 0;
    this.historialNumeros.forEach((item) => {
      if (item.color === 'rojo') rojoMacro++;
      else if (item.color === 'negro') negroMacro++;
    });

    const expMacro = total * p;
    const sigmaMacro = Math.sqrt(total * p * (1 - p));
    const obsMacro = ultimo.color === 'rojo' ? rojoMacro : (ultimo.color === 'negro' ? negroMacro : 0);
    const zMacro = sigmaMacro > 0 ? (obsMacro - expMacro) / sigmaMacro : 0;

    return {
      local: Number(zLocal.toFixed(2)),
      macro: Number(zMacro.toFixed(2)),
      rojoLocal,
      negroLocal,
      verdeLocal,
      windowSize
    };
  }

  // ─────────────────────────────────────────────
  // 4. GESTIÓN DEL FACTOR CERO
  // ─────────────────────────────────────────────
  calcularEstadisticasCero() {
    const total = this.historialNumeros.length;
    if (!total) return { count: 0, gap: 0, ratio: '0.0', expectedRatio: '2.70' };

    let count = 0;
    let gap = 0;
    let zeroFound = false;

    for (let i = total - 1; i >= 0; i--) {
      if (this.historialNumeros[i].numero === 0) {
        count++;
        zeroFound = true;
      } else if (!zeroFound) {
        gap++;
      }
    }
    if (!zeroFound) gap = total;

    const ratio = ((count / total) * 100).toFixed(1);
    return { count, gap, ratio, expectedRatio: '2.70' };
  }

  // ─────────────────────────────────────────────
  // 5. EVALUACIÓN CONJUNTA ANTIGRAVITY + C-D-E
  // ─────────────────────────────────────────────
  evaluarMotorAntigravity(nuevoNumero, resultadoPatron) {
    const rachas = this.calcularRachas();
    const zScores = this.calcularZScores();
    const ceroStats = this.calcularEstadisticasCero();

    if (!rachas) {
      return {
        signal: 'ESPERAR',
        target: null,
        targetType: null,
        rachaActiva: null,
        zScore: zScores,
        riesgo: 'BAJO',
        filtroFrenoActivo: true,
        ceroStats,
        diagnostico: 'Inicializando radar cuantitativo. Registra tiradas para calibrar la varianza.',
        mensajeLog: 'Sistema en espera de datos.'
      };
    }

    const umbralRacha = Number(this.config.umbralRacha) || 4;
    const umbralZ = Number(this.config.umbralZScore) || 1.5;

    const rColor = rachas.color;
    const rParidad = rachas.paridad;

    let rachaDominante = rColor;
    if (rParidad && rParidad.count > rachaDominante.count) rachaDominante = rParidad;

    let signal = 'ESPERAR';
    let target = null;
    let targetType = null;
    let riesgo = 'BAJO';
    let diagnostico = '';
    let mensajeLog = '';

    // Condición de racha de color Antigravity
    const esRachaColorSignificativa = rColor.count >= umbralRacha;
    const targetOpuestoColor = rColor.tipo === 'rojo' ? 'NEGRO' : 'ROJO';

    // Condición de racha de paridad
    const esRachaParidadSignificativa = rParidad && rParidad.tipo !== 'cero' && rParidad.count >= umbralRacha;
    const targetOpuestoParidad = rParidad?.tipo === 'par' ? 'IMPAR' : 'PAR';

    // Estado del patrón C-D-E actual
    const enEtapaE = this.patronActivo && this.etapaActual === 2;
    const enEtapaD = this.patronActivo && this.etapaActual === 1;
    const colorEsperadoE = enEtapaE ? this.patronActual[2]?.toUpperCase() : null;
    const colorEsperadoD = enEtapaD ? this.patronActual[1]?.toUpperCase() : null;

    // 1. CASO CERO (0)
    if (nuevoNumero === 0) {
      signal = 'ESPERAR';
      target = null;
      riesgo = 'MEDIO';
      diagnostico = `Aparición del Cero (0). Se aplicó la absorción del margen de la casa (2.70%). Simetrías suspendidas temporalmente.`;
      mensajeLog = `Tirada #${this.totalTiradasContador} → #0 Verde | Disrupción por Cero. Filtro: [ESPERAR].`;
    }
    // 2. CONFLUENCIA MÁXIMA: ETAPA E + RACHA DE VARIANZA ALINEADA
    else if (enEtapaE && esRachaColorSignificativa && targetOpuestoColor === colorEsperadoE) {
      signal = 'CONFLUENCIA_ALTA';
      target = colorEsperadoE;
      targetType = 'color';
      riesgo = 'BAJO';
      diagnostico = `⚡ ¡MÁXIMA CONFLUENCIA ESTADÍSTICA! La Etapa E del Patrón coincide exactamente con la reversión de racha Antigravity (${rColor.count} ${rColor.tipo.toUpperCase()}S, ruptura: ${rColor.probRuptura}%). Entrada recomendada hacia ${target}.`;
      mensajeLog = `Tirada #${this.totalTiradasContador} → CONFLUENCIA ALTA | Patrón Etapa E + Racha de ${rColor.count} ${rColor.tipo.toUpperCase()} | Objetivo: [${target}].`;
    }
    // 3. ACCIÓN POR ETAPA E DEL PATRÓN
    else if (enEtapaE) {
      signal = 'ACCION_PATRON_E';
      target = colorEsperadoE;
      targetType = 'color';
      riesgo = 'MEDIO';
      diagnostico = `🎯 FASE DE DISPARO: La Secuencia C-D-E alcanzó la Etapa E. Próxima tirada es el objetivo de acción hacia ${target}.`;
      mensajeLog = `Tirada #${this.totalTiradasContador} → Disparo Etapa E | Objetivo de patrón: [${target}].`;
    }
    // 4. CONDICIÓN FAVORABLE POR RACHA ANTIGRAVITY (COLOR)
    else if (esRachaColorSignificativa) {
      signal = 'CONDICION_FAVORABLE';
      target = targetOpuestoColor;
      targetType = 'color';
      riesgo = rColor.count >= 6 ? 'MEDIO-ALTO' : 'MEDIO';
      diagnostico = `FILTRO DE FRENO SUPERADO: Racha activa de ${rColor.count} ${rColor.tipo.toUpperCase()}S (Z = ${zScores.local >= 0 ? '+' : ''}${zScores.local}σ, P(ruptura) = ${rColor.probRuptura}%). Desviación estadística propicia para reversión a ${target}.`;
      mensajeLog = `Tirada #${this.totalTiradasContador} → Racha ${rColor.count} ${rColor.tipo.toUpperCase()} | Z: ${zScores.local}σ | Señal: [CONDICIÓN FAVORABLE] → ${target}.`;
    }
    // 5. CONDICIÓN FAVORABLE POR RACHA ANTIGRAVITY (PARIDAD)
    else if (esRachaParidadSignificativa) {
      signal = 'CONDICION_FAVORABLE';
      target = targetOpuestoParidad;
      targetType = 'paridad';
      riesgo = rParidad.count >= 6 ? 'MEDIO-ALTO' : 'MEDIO';
      diagnostico = `FILTRO DE FRENO SUPERADO: Racha de ${rParidad.count} ${rParidad.tipo.toUpperCase()}ES (P(ruptura) = ${rParidad.probRuptura}%). Entrada favorable hacia ${target}.`;
      mensajeLog = `Tirada #${this.totalTiradasContador} → Racha paridad ${rParidad.count} | Señal: [CONDICIÓN FAVORABLE] → ${target}.`;
    }
    // 6. PRE-ALERTA (RACHA DE 3)
    else if (rColor.count === 3) {
      signal = 'PRE_ALERTA';
      target = targetOpuestoColor;
      targetType = 'color';
      riesgo = 'BAJO';
      diagnostico = `PRE-ALERTA ANTIGRAVITY: Racha de 3 ${rColor.tipo.toUpperCase()}S (88.5% prob. teórica de ruptura). La tensión estadística aumenta; preparar posición para posible entrada en tirada 4.`;
      mensajeLog = `Tirada #${this.totalTiradasContador} → Pre-alerta Racha 3 ${rColor.tipo.toUpperCase()} | Reversión potencial a ${target}.`;
    }
    // 7. SEGUIMIENTO DE PATRÓN (ETAPA C SUPERADA, ESPERANDO ETAPA D)
    else if (enEtapaD) {
      signal = 'SEGUIMIENTO_PATRON';
      target = colorEsperadoD;
      targetType = 'color';
      riesgo = 'BAJO';
      diagnostico = `SEGUIMIENTO DE SECUENCIA: Etapa C superada. En espera de confirmación en Etapa D hacia ${target}. Filtro de Freno activo para apuestas.`;
      mensajeLog = `Tirada #${this.totalTiradasContador} → Patrón en Etapa D | Esperado: [${target}].`;
    }
    // 8. FILTRO DE FRENO ACTIVO (ESPERAR)
    else {
      signal = 'ESPERAR';
      target = null;
      riesgo = 'BAJO';
      diagnostico = `FILTRO DE FRENO ACTIVO: Distribución dentro de varianza ordinaria (|Z| = ${Math.abs(zScores.local)}σ). Preservar capital y evitar apuestas no autorizadas hasta superar umbral (Racha ≥ ${umbralRacha} o avance a Etapa E).`;
      mensajeLog = `Tirada #${this.totalTiradasContador} → #${nuevoNumero} ${rColor.tipo.toUpperCase()} | Racha: ${rColor.count} | Filtro: [ESPERAR].`;
    }

    return {
      signal,
      target,
      targetType,
      rachaActiva: rachaDominante,
      zScore: zScores,
      riesgo,
      filtroFrenoActivo: signal === 'ESPERAR' || signal === 'SEGUIMIENTO_PATRON',
      ceroStats,
      diagnostico,
      mensajeLog
    };
  }

  // ─────────────────────────────────────────────
  // 6. PROCESAMIENTO DE CAPITAL Y APUESTAS
  // ─────────────────────────────────────────────
  procesarApuestaCondicional(propsNumero) {
    if (!this.config.usarMartingala) return null;

    let cambio = null;
    const pos = this.posicionAbierta;

    if (pos) {
      let acierto = false;
      if (pos.targetType === 'color') {
        const esperado = pos.target.toLowerCase();
        acierto = propsNumero.color === esperado;
      } else if (pos.targetType === 'paridad') {
        const esperado = pos.target.toLowerCase();
        acierto = propsNumero.paridad === esperado;
      }

      const monto = pos.monto || this.apuestaActual;

      if (acierto) {
        this.saldoMartingala += monto;
        this.nivelMartingala = 0;
        this.apuestaActual = this.config.nivelesMartingala[0] || this.config.valorApuestaBase;
        cambio = { tipo: 'acierto', saldo: this.saldoMartingala, monto, acierto: true };
      } else {
        this.saldoMartingala -= monto;
        if (this.config.modoMartingala === 2) {
          this.nivelMartingala++;
          if (this.nivelMartingala >= this.config.nivelesMartingala.length) {
            this.nivelMartingala = 0; // Reseteo para evitar descapitalización
          }
          this.apuestaActual = this.config.nivelesMartingala[this.nivelMartingala] || this.config.valorApuestaBase;
        } else {
          this.apuestaActual = this.config.valorApuestaBase;
        }
        cambio = {
          tipo: 'fallo',
          saldo: this.saldoMartingala,
          monto,
          acierto: false,
          nivel: this.nivelMartingala
        };
      }
      this.posicionAbierta = null;
    }

    return cambio;
  }

  recordBalanceStep(previousBalance, martingalaCambio, tiradaNumero) {
    const open = previousBalance;
    const close = this.saldoMartingala;
    const high = Math.max(open, close);
    const low = Math.min(open, close);
    const tipo = martingalaCambio?.tipo || null;
    this.balanceTimeline.push({ open, high, low, close, tipo, tiradaNumero });
    if (this.balanceTimeline.length > MAX_HISTORIAL_REGISTROS) {
      this.balanceTimeline.shift();
    }
  }

  getBalanceTimeline() {
    return this.balanceTimeline;
  }

  getBalanceExtremes() {
    if (!this.balanceTimeline.length) return { high: 0, low: 0 };
    let high = -Infinity, low = Infinity;
    this.balanceTimeline.forEach((entry) => {
      if (entry.high > high) high = entry.high;
      if (entry.low < low) low = entry.low;
    });
    return { high, low };
  }

  // ─────────────────────────────────────────────
  // 7. REGISTRAR NÚMERO (PIPELINE PRINCIPAL)
  // ─────────────────────────────────────────────
  agregarNumero(numero) {
    const props = this.getPropiedades(numero);
    const previousBalance = this.saldoMartingala;

    // 1. Resolver posición previa en juego
    const martingala = this.procesarApuestaCondicional(props);

    // 2. Incrementar contador global
    this.totalTiradasContador++;

    // 3. Ejecutar análisis del patrón secuencial C-D-E
    const resultadoPatron = this.analizarPatron(numero);

    // 4. Guardar tirada en historial
    const registro = {
      numero,
      color: props.color,
      paridad: props.paridad,
      rango: props.rango,
      docena: props.docena,
      columna: props.columna,
      timestamp: new Date().toISOString(),
      tiradaNumero: this.totalTiradasContador,
      resultadoPatron
    };
    this.historialNumeros.push(registro);
    if (this.historialNumeros.length > MAX_HISTORIAL_REGISTROS) {
      this.historialNumeros.shift();
    }

    // 5. Evaluar radar Antigravity combinando con el patrón
    const analisis = this.evaluarMotorAntigravity(numero, resultadoPatron);
    this.ultimoAnalisis = analisis;

    // 6. Preparar posición para la siguiente tirada si las condiciones habilitan entrada
    const esAccionable =
      analisis.signal === 'CONFLUENCIA_ALTA' ||
      analisis.signal === 'CONDICION_FAVORABLE' ||
      analisis.signal === 'ACCION_PATRON_E';

    if (this.config.usarMartingala && esAccionable && analisis.target) {
      this.posicionAbierta = {
        target: analisis.target,
        targetType: analisis.targetType,
        monto: this.apuestaActual,
        origen: analisis.signal
      };
    } else {
      this.posicionAbierta = null;
    }

    // 7. Grabar vela en la curva de balance
    this.recordBalanceStep(previousBalance, martingala, this.totalTiradasContador);

    this.ultimoResultado = {
      numero,
      color: props.color,
      resultadoPatron,
      analisis,
      martingala,
      tiradaNumero: this.totalTiradasContador
    };

    return {
      ...this.ultimoResultado,
      estadisticas: this.getEstadisticas(),
      logTexto: `${resultadoPatron.mensaje} | Radar: ${analisis.mensajeLog}`,
      logTone: esAccionable
        ? 'success'
        : props.color === 'verde'
          ? 'warn'
          : 'info'
    };
  }

  getEstadisticas() {
    const total = this.totalTiradasContador || this.historialNumeros.length;
    const totalHistorial = this.historialNumeros.length;
    const colores = { rojo: 0, negro: 0, verde: 0 };
    const frecuenciaNumeros = {};

    this.historialNumeros.forEach((item) => {
      colores[item.color] = (colores[item.color] || 0) + 1;
      frecuenciaNumeros[item.numero] = (frecuenciaNumeros[item.numero] || 0) + 1;
    });

    const topNumeros = Object.entries(frecuenciaNumeros)
      .map(([num, count]) => ({ numero: parseInt(num, 10), veces: count }))
      .sort((a, b) => b.veces - a.veces)
      .slice(0, 15);

    return {
      total,
      totalHistorial,
      colores,
      topNumeros,
      saldoMartingala: this.saldoMartingala,
      config: this.config
    };
  }

  actualizarConfig(nuevaConfig) {
    const baseAnterior = this.config.valorApuestaBase;
    this.config = { ...this.config, ...nuevaConfig };

    if (this.config.valorApuestaBase !== baseAnterior || !this.config.nivelesMartingala?.length) {
      this.config.nivelesMartingala = this.calcularNivelesMartingala(this.config.valorApuestaBase);
    }

    if (this.config.usarMartingala) {
      if (this.nivelMartingala >= this.config.nivelesMartingala.length) {
        this.nivelMartingala = 0;
      }
      this.apuestaActual =
        this.config.nivelesMartingala[this.nivelMartingala] || this.config.valorApuestaBase;
    }
    return this.config;
  }
}

// ─────────────────────────────────────────────
// INSTANCIA Y REFERENCIAS DEL DOM
// ─────────────────────────────────────────────
const predictor = new RuletaPredictor();

const elements = {
  lastSync: document.getElementById('lastSync'),
  heroLevel: document.getElementById('heroLevel'),
  logList: document.getElementById('logList'),
  historyList: document.getElementById('historyList'),
  topNumbersList: document.getElementById('topNumbersList'),
  barRojo: document.getElementById('barRojo'),
  barNegro: document.getElementById('barNegro'),
  barVerde: document.getElementById('barVerde'),
  labelRojo: document.getElementById('labelRojo'),
  labelNegro: document.getElementById('labelNegro'),
  labelVerde: document.getElementById('labelVerde'),
  totalTiradas: document.getElementById('totalTiradas'),
  saldoMartingala: document.getElementById('saldoMartingala'),
  valorApuesta: document.getElementById('valorApuesta'),

  // Monitor Secuencia C-D-E
  patternStatusBadge: document.getElementById('patternStatusBadge'),
  patternBadgeText: document.getElementById('patternBadgeText'),
  stepCardC: document.getElementById('stepCardC'),
  stepStateC: document.getElementById('stepStateC'),
  stepChipC: document.getElementById('stepChipC'),
  stepCardD: document.getElementById('stepCardD'),
  stepStateD: document.getElementById('stepStateD'),
  stepChipD: document.getElementById('stepChipD'),
  stepCardE: document.getElementById('stepCardE'),
  stepStateE: document.getElementById('stepStateE'),
  stepChipE: document.getElementById('stepChipE'),
  patternNextBanner: document.getElementById('patternNextBanner'),
  patternNextColor: document.getElementById('patternNextColor'),

  // Radar Antigravity
  copilotSignal: document.getElementById('copilotSignal'),
  signalText: document.getElementById('signalText'),
  copilotStreak: document.getElementById('copilotStreak'),
  copilotStreakProb: document.getElementById('copilotStreakProb'),
  copilotZScore: document.getElementById('copilotZScore'),
  copilotVarianceStatus: document.getElementById('copilotVarianceStatus'),
  copilotRisk: document.getElementById('copilotRisk'),
  copilotFilterStatus: document.getElementById('copilotFilterStatus'),
  copilotZeroGap: document.getElementById('copilotZeroGap'),
  copilotZeroRatio: document.getElementById('copilotZeroRatio'),
  copilotTarget: document.getElementById('copilotTarget'),
  copilotDiagnosis: document.getElementById('copilotDiagnosis'),

  // Hero Pills
  heroConfigTipoRuleta: document.getElementById('heroConfigTipoRuleta'),
  heroConfigPatron: document.getElementById('heroConfigPatron'),
  heroConfigFiltro: document.getElementById('heroConfigFiltro'),
  heroConfigMartingala: document.getElementById('heroConfigMartingala'),
  heroConfigModo: document.getElementById('heroConfigModo'),
  heroConfigApuesta: document.getElementById('heroConfigApuesta'),

  // Controles
  openConfigBtn: document.getElementById('openConfigBtn'),
  resetBtn: document.getElementById('resetBtn'),

  // Modal
  configModal: document.getElementById('configModal'),
  closeConfigModal: document.getElementById('closeConfigModal'),
  cancelConfig: document.getElementById('cancelConfig'),
  configForm: document.getElementById('configForm'),
  usarMartingala: document.getElementById('usarMartingala'),
  martingalaDetails: document.querySelector('[data-martingala-details]'),
  modoMartingala: document.getElementById('modoMartingala'),
  valorApuestaBase: document.getElementById('valorApuestaBase'),
  tipoRuleta: document.getElementById('tipoRuleta'),
  umbralRacha: document.getElementById('umbralRacha'),
  umbralZScore: document.getElementById('umbralZScore'),

  // Gráfico de Balance
  balanceCanvas: document.getElementById('balanceCanvas'),
  balanceHigh: document.getElementById('balanceHigh'),
  balanceLow: document.getElementById('balanceLow'),
  balanceDiff: document.getElementById('balanceDiff'),
  balanceCurrent: document.getElementById('balanceCurrent'),
  zoomRange: document.getElementById('zoomRange'),
  zoomValue: document.getElementById('zoomValue'),
  hoverLaunch: document.getElementById('hoverLaunch'),
  hoverSaldo: document.getElementById('hoverSaldo'),

  // Simulación
  simulationForm: document.getElementById('simulationForm'),
  simulationFile: document.getElementById('simulationFile'),
  fileUploadArea: document.getElementById('fileUploadArea'),
  fileUploadName: document.getElementById('fileUploadName'),
  suggestionsList: document.getElementById('suggestionsList'),
  downloadTemplateBtn: document.getElementById('downloadTemplateBtn'),

  // Entrada Sagaz / Pegar Arreglo Rápido
  quickArrayInput: document.getElementById('quickArrayInput'),
  quickArraySubmitBtn: document.getElementById('quickArraySubmitBtn'),
  quickArrayPasteBtn: document.getElementById('quickArrayPasteBtn'),
  quickArrayClearBtn: document.getElementById('quickArrayClearBtn')
};

let selectedNumber = null;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatCurrency = (val, showPlus = false) => {
  const num = Number(val) || 0;
  const isPos = num >= 0;
  const prefix = isPos ? (showPlus ? '+$' : '$') : '-$';
  return `${prefix}${Math.abs(Math.round(num)).toLocaleString('es-CO')}`;
};

// ─────────────────────────────────────────────
// BITÁCORA DE EVENTOS
// ─────────────────────────────────────────────
const logMessage = (text, tone = 'info') => {
  if (!elements.logList) return;
  const card = document.createElement('div');
  card.className = 'log-card';
  card.dataset.tone = tone;
  const strong = document.createElement('strong');
  strong.textContent = new Date().toLocaleTimeString('es-CO');
  card.appendChild(strong);
  card.appendChild(document.createTextNode(` — ${text}`));
  const firstChild = elements.logList.firstElementChild;
  if (firstChild && firstChild.classList.contains('placeholder')) firstChild.remove();
  elements.logList.prepend(card);
  if (elements.logList.childElementCount > 25) elements.logList.lastElementChild.remove();
};

// ─────────────────────────────────────────────
// RENDERIZADO MONITOR SECUENCIA C — D — E
// ─────────────────────────────────────────────
const renderSequenceMonitor = () => {
  if (!elements.patternStatusBadge) return;

  const activo = predictor.patronActivo;
  const etapa = predictor.etapaActual;
  const patron = predictor.patronActual;
  const origen = predictor.patronNumeroOrigen;
  const ult = predictor.ultimoPatronResultado;

  // 1. Badge de Estado General
  elements.patternStatusBadge.className = 'pattern-badge';
  if (!activo) {
    if (ult?.completo) {
      elements.patternStatusBadge.classList.add('badge-success');
      elements.patternBadgeText.textContent = '¡Patrón C-D-E Completado! 🎯';
    } else if (ult?.acierto === false) {
      elements.patternStatusBadge.classList.add('badge-failed');
      elements.patternBadgeText.textContent = `Fallo en Etapa ${ult.etapa || ''} (Reiniciado)`;
    } else {
      elements.patternStatusBadge.classList.add('badge-idle');
      elements.patternBadgeText.textContent = 'En espera de tirada';
    }
  } else {
    elements.patternStatusBadge.classList.add('badge-active');
    if (etapa === 1) {
      elements.patternBadgeText.textContent = `Patrón #${origen}: Etapa C Superada`;
    } else if (etapa === 2) {
      elements.patternStatusBadge.classList.add('badge-trigger');
      elements.patternBadgeText.textContent = `⚡ ¡ETAPA E ACTIVA! Disparo hacia ${patron[2]?.toUpperCase()}`;
    } else {
      elements.patternBadgeText.textContent = `Patrón #${origen} Iniciado`;
    }
  }

  // Helper para pintar chips de color
  const renderChip = (chipEl, stateEl, cardEl, color, stateText, cardClass) => {
    if (!chipEl || !stateEl || !cardEl) return;
    cardEl.className = `step-card ${cardClass}`;
    stateEl.textContent = stateText;

    if (!color) {
      chipEl.textContent = '—';
      chipEl.className = 'step-chip';
      return;
    }
    const colorLower = color.toLowerCase();
    chipEl.textContent = color.toUpperCase();
    chipEl.className = `step-chip chip-${colorLower}`;
  };

  // 2. Etapas C, D, E
  if (!activo) {
    // Si no está activo pero tenemos el último resultado, mostramos el histórico breve
    if (ult && patron.length === 3) {
      renderChip(elements.stepChipC, elements.stepStateC, elements.stepCardC, patron[0], 'Evaluado', 'step-done');
      renderChip(elements.stepChipD, elements.stepStateD, elements.stepCardD, patron[1], 'Evaluado', 'step-done');
      renderChip(elements.stepChipE, elements.stepStateE, elements.stepCardE, patron[2], ult.completo ? '¡Acierto! ✅' : 'Fallo ❌', ult.completo ? 'step-winner' : 'step-failed');
    } else {
      renderChip(elements.stepChipC, elements.stepStateC, elements.stepCardC, null, 'Inactivo', '');
      renderChip(elements.stepChipD, elements.stepStateD, elements.stepCardD, null, 'Inactivo', '');
      renderChip(elements.stepChipE, elements.stepStateE, elements.stepCardE, null, 'Inactivo', '');
    }
    elements.patternNextColor.textContent = 'Ninguno — Registra un número para iniciar';
    elements.patternNextColor.className = 'next-banner__color';
  } else {
    // Patrón ACTIVO
    const c0 = patron[0];
    const c1 = patron[1];
    const c2 = patron[2];

    // Etapa C
    renderChip(elements.stepChipC, elements.stepStateC, elements.stepCardC, c0, 'Superada ✅', 'step-done');

    // Etapa D
    if (etapa === 1) {
      renderChip(elements.stepChipD, elements.stepStateD, elements.stepCardD, c1, 'Esperando ⏳', 'step-waiting');
      renderChip(elements.stepChipE, elements.stepStateE, elements.stepCardE, c2, 'Pendiente', '');
      elements.patternNextColor.textContent = `Etapa D → Apostar o Validar: ${c1.toUpperCase()}`;
      elements.patternNextColor.className = `next-banner__color target-${c1.toLowerCase()}`;
    } else if (etapa === 2) {
      renderChip(elements.stepChipD, elements.stepStateD, elements.stepCardD, c1, 'Superada ✅', 'step-done');
      renderChip(elements.stepChipE, elements.stepStateE, elements.stepCardE, c2, '¡DISPARO! 🎯', 'step-action');
      elements.patternNextColor.textContent = `🎯 ETAPA E → DISPARO DE APUESTA A: ${c2.toUpperCase()}`;
      elements.patternNextColor.className = `next-banner__color target-${c2.toLowerCase()} target-pulse`;
    }
  }
};

// ─────────────────────────────────────────────
// RENDERIZADO RADAR ANTIGRAVITY
// ─────────────────────────────────────────────
const renderCopilot = (analisis) => {
  if (!elements.copilotSignal) return;

  if (!analisis) {
    elements.copilotSignal.className = 'copilot-signal signal-esperar';
    if (elements.signalText) elements.signalText.textContent = '[FILTRO DE FRENO: ESPERAR]';
    if (elements.copilotStreak) elements.copilotStreak.textContent = '0 — Neutro';
    if (elements.copilotStreakProb) elements.copilotStreakProb.textContent = 'P(ruptura): 0%';
    if (elements.copilotZScore) elements.copilotZScore.textContent = '0.00σ';
    if (elements.copilotVarianceStatus) elements.copilotVarianceStatus.textContent = 'Rango estocástico normal';
    if (elements.copilotRisk) {
      elements.copilotRisk.textContent = 'BAJO';
      elements.copilotRisk.className = 'copilot-card__value risk-low';
    }
    if (elements.copilotFilterStatus) elements.copilotFilterStatus.textContent = 'Filtro de Freno ACTIVO';
    if (elements.copilotZeroGap) elements.copilotZeroGap.textContent = '0 tiradas';
    if (elements.copilotZeroRatio) elements.copilotZeroRatio.textContent = 'Obs: 0% | Esp: 2.70%';
    if (elements.copilotTarget) elements.copilotTarget.textContent = 'Sin objetivo activo';
    if (elements.copilotDiagnosis) {
      elements.copilotDiagnosis.textContent =
        'Esperando tiradas para calibrar la varianza local frente a la tendencia de equilibrio macro.';
    }
    return;
  }

  // Determinación de estilo de señal
  const sig = analisis.signal;
  elements.copilotSignal.className = 'copilot-signal';

  if (sig === 'CONFLUENCIA_ALTA') {
    elements.copilotSignal.classList.add('signal-confluencia');
    elements.signalText.textContent = `[CONFLUENCIA ALTA: ${analisis.target}]`;
  } else if (sig === 'CONDICION_FAVORABLE') {
    elements.copilotSignal.classList.add('signal-accion');
    elements.signalText.textContent = `[CONDICIÓN FAVORABLE: ${analisis.target}]`;
  } else if (sig === 'ACCION_PATRON_E') {
    elements.copilotSignal.classList.add('signal-patron-e');
    elements.signalText.textContent = `[ACCIÓN ETAPA E: ${analisis.target}]`;
  } else if (sig === 'PRE_ALERTA') {
    elements.copilotSignal.classList.add('signal-alerta');
    elements.signalText.textContent = `[PRE-ALERTA: RACHA DE 3]`;
  } else if (sig === 'SEGUIMIENTO_PATRON') {
    elements.copilotSignal.classList.add('signal-seguimiento');
    elements.signalText.textContent = `[SEGUIMIENTO: ETAPA D]`;
  } else {
    elements.copilotSignal.classList.add('signal-esperar');
    elements.signalText.textContent = '[FILTRO DE FRENO: ESPERAR]';
  }

  // Racha
  const r = analisis.rachaActiva;
  if (elements.copilotStreak) {
    elements.copilotStreak.textContent = r?.texto || '0 — Neutro';
  }
  if (elements.copilotStreakProb) {
    elements.copilotStreakProb.textContent = r ? `P(ruptura): ${r.probRuptura}%` : 'P(ruptura): 0%';
  }

  // Z-Score
  const zVal = analisis.zScore?.local ?? 0;
  if (elements.copilotZScore) {
    elements.copilotZScore.textContent = `${zVal >= 0 ? '+' : ''}${zVal.toFixed(2)}σ`;
  }
  if (elements.copilotVarianceStatus) {
    elements.copilotVarianceStatus.textContent =
      Math.abs(zVal) >= 2.0
        ? 'Desviación Crítica (|Z| ≥ 2.0σ)'
        : Math.abs(zVal) >= 1.5
          ? 'Tensión de Varianza Alta'
          : Math.abs(zVal) >= 1.0
            ? 'Tensión Moderada'
            : 'Rango Estocástico Normal';
  }

  // Riesgo
  if (elements.copilotRisk) {
    elements.copilotRisk.textContent = analisis.riesgo || 'BAJO';
    const riskClass =
      analisis.riesgo === 'ALTO' || analisis.riesgo === 'MEDIO-ALTO'
        ? 'risk-high'
        : analisis.riesgo === 'MEDIO'
          ? 'risk-med'
          : 'risk-low';
    elements.copilotRisk.className = `copilot-card__value ${riskClass}`;
  }

  if (elements.copilotFilterStatus) {
    elements.copilotFilterStatus.textContent =
      sig === 'CONFLUENCIA_ALTA' || sig === 'CONDICION_FAVORABLE' || sig === 'ACCION_PATRON_E'
        ? 'Dintel SUPERADO (Acción Válida)'
        : sig === 'PRE_ALERTA'
          ? 'Precalentando Dintel'
          : 'Filtro de Freno ACTIVO';
  }

  // Factor Cero
  const c = analisis.ceroStats;
  if (c) {
    if (elements.copilotZeroGap) {
      elements.copilotZeroGap.textContent = `${c.gap} tiradas sin caer`;
      if (c.gap >= 35) {
        elements.copilotZeroGap.classList.add('text-warn');
      } else {
        elements.copilotZeroGap.classList.remove('text-warn');
      }
    }
    if (elements.copilotZeroRatio) {
      elements.copilotZeroRatio.textContent = `Obs: ${c.ratio}% | Esp: 2.70% (${c.count} ceros)`;
    }
  }

  // Objetivo y Diagnóstico
  if (elements.copilotTarget) {
    elements.copilotTarget.textContent = analisis.target
      ? `Objetivo: Entrada a ${analisis.target}`
      : 'Sin objetivo (Preservación de capital)';
  }
  if (elements.copilotDiagnosis) {
    elements.copilotDiagnosis.textContent = analisis.diagnostico || '';
  }
};

// ─────────────────────────────────────────────
// RENDER CONFIG → PILLS DEL HERO
// ─────────────────────────────────────────────
const renderConfig = (config) => {
  if (!config) return;

  if (elements.heroConfigTipoRuleta) elements.heroConfigTipoRuleta.textContent = config.tipoRuleta;
  if (elements.heroConfigPatron) elements.heroConfigPatron.textContent = 'Secuencia C-D-E';
  if (elements.heroConfigFiltro) {
    elements.heroConfigFiltro.textContent = `Racha ≥ ${config.umbralRacha || 4} | Z ≥ ${config.umbralZScore || 1.5}σ`;
  }
  if (elements.heroConfigMartingala) {
    elements.heroConfigMartingala.textContent = config.usarMartingala ? 'Activada ✅' : 'Desactivada';
  }
  if (elements.heroConfigModo) {
    elements.heroConfigModo.textContent = config.usarMartingala
      ? (config.modoMartingala === 2 ? 'Escalonada (Max 4)' : 'Plana condicional')
      : 'Filtro Condicional';
  }
  if (elements.heroConfigApuesta) {
    elements.heroConfigApuesta.textContent = config.usarMartingala
      ? formatCurrency(config.valorApuestaBase)
      : 'Inactiva';
  }

  // Modal
  if (elements.tipoRuleta) elements.tipoRuleta.value = config.tipoRuleta;
  if (elements.umbralRacha) elements.umbralRacha.value = config.umbralRacha || 4;
  if (elements.umbralZScore) elements.umbralZScore.value = config.umbralZScore || 1.5;
  if (elements.usarMartingala) elements.usarMartingala.checked = Boolean(config.usarMartingala);
  if (elements.modoMartingala) elements.modoMartingala.value = config.modoMartingala;
  if (elements.valorApuestaBase) elements.valorApuestaBase.value = config.valorApuestaBase;
  toggleMartingalaFields(config.usarMartingala);
};

const toggleMartingalaFields = (show) => {
  if (elements.martingalaDetails) elements.martingalaDetails.style.display = show ? 'flex' : 'none';
};

// ─────────────────────────────────────────────
// RENDER STATS, HISTORIAL, BALANCE
// ─────────────────────────────────────────────
const renderStats = (stats) => {
  if (!stats) return;
  const { colores, total, totalHistorial, topNumeros, saldoMartingala: saldo, config } = stats;
  elements.totalTiradas.textContent = total;
  elements.saldoMartingala.textContent = formatCurrency(saldo);
  elements.valorApuesta.textContent = formatCurrency(config.valorApuestaBase);

  const sampleTotal = totalHistorial || total || 0;
  const percent = (valor) => (sampleTotal ? Math.round((valor / sampleTotal) * 100) : 0);
  elements.barRojo.style.width   = `${percent(colores.rojo)}%`;
  elements.barNegro.style.width  = `${percent(colores.negro)}%`;
  elements.barVerde.style.width  = `${percent(colores.verde)}%`;
  elements.labelRojo.textContent  = `${percent(colores.rojo)}%`;
  elements.labelNegro.textContent = `${percent(colores.negro)}%`;
  elements.labelVerde.textContent = `${percent(colores.verde)}%`;

  elements.topNumbersList.innerHTML = '';
  if (!topNumeros.length) {
    elements.topNumbersList.innerHTML = '<li class="placeholder">Sin tiradas suficientes aún.</li>';
  } else {
    topNumeros.slice(0, 5).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = `#${item.numero} (${item.veces} veces)`;
      elements.topNumbersList.appendChild(li);
    });
  }

  renderConfig(config);
};

const renderHistory = (historial) => {
  elements.historyList.innerHTML = '';
  if (!historial.length) {
    elements.historyList.innerHTML = '<li class="placeholder">Aún no hay tiradas registradas.</li>';
    return;
  }

  const latest = [...historial].reverse().slice(0, 15);
  latest.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const date = item.timestamp ? new Date(item.timestamp) : new Date();
    const time = Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('es-CO');
    li.innerHTML = `
      <div>
        <strong>#${item.numero}</strong>
        <span>${time}</span>
      </div>
      <span class="history-color ${item.color}">${item.color}</span>
    `;
    elements.historyList.appendChild(li);
  });
};

const updateLastSync = () => {
  elements.lastSync.textContent = `Última sincronización: ${new Date().toLocaleTimeString('es-CO')}`;
};

const setHeroLevel = (text) => {
  elements.heroLevel.textContent = text;
};

// ─────────────────────────────────────────────
// PERSISTENCIA LOCALSTORAGE
// ─────────────────────────────────────────────
const saveState = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(predictor.serializeState()));
  } catch (error) {
    console.warn('Almacenamiento local saturado; guardando estado compacto', error);
    try {
      const compactState = predictor.serializeState();
      compactState.historialNumeros = compactState.historialNumeros.slice(-250);
      compactState.balanceTimeline = compactState.balanceTimeline.slice(-250);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compactState));
    } catch {
      // Ignorar si aún excede
    }
  }
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    predictor.loadState(JSON.parse(raw));
  } catch (error) {
    console.warn('Estado local no válido, iniciando estado fresco', error);
    predictor.resetState();
  }
};

// ─────────────────────────────────────────────
// GRÁFICO CANDLESTICK DE CAPITAL (BALANCE)
// ─────────────────────────────────────────────
const chartState = {
  windowSize: Number(elements.zoomRange?.value) || 60,
  hoverIndex: null,
  lastRender: null,
  lastState: null
};

const updateZoomLabel = (value) => {
  if (elements.zoomValue) elements.zoomValue.textContent = value.toString();
};

const updateHoverInfo = (entry, absoluteIndex = null) => {
  if (!elements.hoverLaunch || !elements.hoverSaldo) return;
  if (!entry) {
    elements.hoverLaunch.textContent = 'Tirada: —';
    elements.hoverSaldo.textContent = 'Saldo: —';
    return;
  }
  const tiradaNum = entry.tiradaNumero ?? absoluteIndex ?? '—';
  elements.hoverLaunch.textContent = `Tirada: #${tiradaNum}`;
  elements.hoverSaldo.textContent = `Saldo: ${formatCurrency(entry.close)}`;
};

const handleZoomChange = () => {
  if (!elements.zoomRange) return;
  chartState.windowSize = Number(elements.zoomRange.value) || 60;
  updateZoomLabel(chartState.windowSize);
  renderBalanceChart();
};

const handleChartHover = (event) => {
  const render = chartState.lastRender;
  const state  = chartState.lastState;
  const canvas = elements.balanceCanvas;
  if (!canvas || !render || !state) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const { padLeft, chartWidth, timelineLength } = render;

  if (!timelineLength || chartWidth <= 0) {
    chartState.hoverIndex = null;
    updateHoverInfo(null);
    return;
  }

  const relX  = Math.max(0, Math.min(chartWidth, x - padLeft));
  const index = timelineLength > 1
    ? Math.round((relX / chartWidth) * (timelineLength - 1))
    : 0;

  chartState.hoverIndex = Math.max(0, Math.min(timelineLength - 1, index));
  const entry = state.timeline[chartState.hoverIndex];
  updateHoverInfo(entry, state.startIndex + chartState.hoverIndex + 1);
  renderBalanceChart();
};

const handleChartLeave = () => {
  chartState.hoverIndex = null;
  updateHoverInfo(null);
  renderBalanceChart();
};

const updateBalanceSummary = () => {
  if (!elements.balanceHigh) return;
  const { high, low } = predictor.getBalanceExtremes();
  elements.balanceHigh.textContent = formatCurrency(high);
  elements.balanceLow.textContent = formatCurrency(low);
  elements.balanceDiff.textContent = formatCurrency(high - low);
  if (elements.balanceCurrent) {
    const current = predictor.saldoMartingala;
    elements.balanceCurrent.textContent = formatCurrency(current);
    elements.balanceCurrent.style.color = current >= 0 ? '#ccff00' : '#ef4444';
  }
};

const renderBalanceChart = () => {
  const canvas = elements.balanceCanvas;
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const rect   = canvas.getBoundingClientRect();
  const dpr    = window.devicePixelRatio || 1;
  const width  = rect.width;
  const height = rect.height;
  if (width <= 0 || height <= 0) return;

  const targetW = Math.round(width  * dpr);
  const targetH = Math.round(height * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width  = targetW;
    canvas.height = targetH;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const PAD_LEFT   = 60;
  const PAD_RIGHT  = 20;
  const PAD_TOP    = 34;
  const PAD_BOTTOM = 36;
  const chartWidth  = width  - PAD_LEFT - PAD_RIGHT;
  const chartHeight = height - PAD_TOP  - PAD_BOTTOM;

  const timeline       = predictor.getBalanceTimeline();
  const effectiveWin   = Math.max(Math.min(chartState.windowSize, Math.max(5, timeline.length)), 5);
  const startIndex     = Math.max(0, timeline.length - effectiveWin);
  const visibleTimeline = timeline.slice(startIndex);
  const visibleLength  = visibleTimeline.length;

  chartState.lastState  = { timeline: visibleTimeline, startIndex };
  chartState.lastRender = {
    width, height, chartWidth, chartHeight,
    padLeft: PAD_LEFT, padTop: PAD_TOP, padBottom: PAD_BOTTOM,
    timelineLength: visibleLength
  };

  // Fondo estilizado Nike Dark Obsidian
  ctx.fillStyle = '#08080c';
  ctx.fillRect(0, 0, width, height);

  if (!visibleLength) {
    ctx.fillStyle = '#71717a';
    ctx.font = '13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Registra tiradas para ver la curva de capital', width / 2, height / 2);
    return;
  }

  // Rango de escala
  let minVal = Infinity;
  let maxVal = -Infinity;
  visibleTimeline.forEach((t) => {
    if (t.low < minVal) minVal = t.low;
    if (t.high > maxVal) maxVal = t.high;
  });
  if (minVal === Infinity) { minVal = 0; maxVal = 1000; }
  if (minVal > 0) minVal = 0;
  if (maxVal < 0) maxVal = 0;
  if (minVal === maxVal) { minVal -= 1000; maxVal += 1000; }

  const margin = (maxVal - minVal) * 0.12;
  minVal -= margin;
  maxVal += margin;
  const range = maxVal - minVal;

  const getY = (val) => PAD_TOP + chartHeight - ((val - minVal) / range) * chartHeight;
  const getX = (idx) => visibleLength === 1
    ? PAD_LEFT + chartWidth / 2
    : PAD_LEFT + (idx / (visibleLength - 1)) * chartWidth;

  // Líneas de referencia horizontal (Grid)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const val = minVal + (s / steps) * range;
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(width - PAD_RIGHT, y);
    ctx.stroke();

    ctx.fillStyle = '#71717a';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatCurrency(val), PAD_LEFT - 8, y);
  }

  // Línea de cero (Punto de equilibrio)
  if (minVal <= 0 && maxVal >= 0) {
    const yZero = getY(0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, yZero);
    ctx.lineTo(width - PAD_RIGHT, yZero);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Dibujar curva / velas
  const candleW = Math.max(3, Math.min(14, (chartWidth / visibleLength) * 0.6));

  visibleTimeline.forEach((t, idx) => {
    const x = getX(idx);
    const yOpen = getY(t.open);
    const yClose = getY(t.close);
    const yHigh = getY(t.high);
    const yLow = getY(t.low);

    const isUp = t.close >= t.open;
    const color = isUp ? '#ccff00' : '#ef4444';

    // Mecha
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    // Cuerpo
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(3, Math.abs(yClose - yOpen));
    ctx.fillStyle = isUp ? '#ccff00' : '#ef4444';
    ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyHeight);
  });

  // Highlight de hover
  if (chartState.hoverIndex !== null && visibleTimeline[chartState.hoverIndex]) {
    const hIdx = chartState.hoverIndex;
    const hEntry = visibleTimeline[hIdx];
    const hX = getX(hIdx);
    const hY = getY(hEntry.close);

    ctx.strokeStyle = 'rgba(204, 255, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(hX, PAD_TOP);
    ctx.lineTo(hX, height - PAD_BOTTOM);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ccff00';
    ctx.beginPath();
    ctx.arc(hX, hY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
};

// ─────────────────────────────────────────────
// REFRESCAR UI GLOBAL
// ─────────────────────────────────────────────
const refreshUI = () => {
  const stats = predictor.getEstadisticas();
  renderStats(stats);
  renderSequenceMonitor();
  renderCopilot(predictor.ultimoAnalisis);
  renderHistory(predictor.historialNumeros);
  renderBalanceChart();
  updateBalanceSummary();
  updateLastSync();
};

const resetSession = () => {
  if (predictor.historialNumeros.length > 0) {
    const confirmReset = window.confirm('¿Reiniciar sesión? Se limpiará el historial de tiradas, el patrón C-D-E y el saldo acumulado.');
    if (!confirmReset) return;
  }
  setHeroLevel('Reiniciando sesión...');
  predictor.resetState();
  saveState();
  selectedNumber = null;
  document.querySelectorAll('#roulettePad button.selected')
    .forEach((b) => b.classList.remove('selected'));
  const display = document.getElementById('selectedDisplay');
  if (display) display.textContent = 'Ningún número seleccionado';
  refreshUI();
  logMessage('Sesión reiniciada con estado limpio', 'success');
  setHeroLevel('Motor Antigravity Listo ⚡');
};

// ─────────────────────────────────────────────
// MODAL DE CONFIGURACIÓN
// ─────────────────────────────────────────────
const openModal = () => {
  renderConfig(predictor.config);
  elements.configModal.setAttribute('aria-hidden', 'false');
};
const closeModal = () => elements.configModal.setAttribute('aria-hidden', 'true');

const handleConfigSubmit = (event) => {
  event.preventDefault();
  const rawBase = Number(elements.valorApuestaBase?.value);
  const valorApuestaBase = Number.isFinite(rawBase) && rawBase >= 100 ? Math.round(rawBase) : 1000;

  const payload = {
    tipoRuleta: elements.tipoRuleta?.value || 'Europea',
    umbralRacha: Number(elements.umbralRacha?.value) || 4,
    umbralZScore: Number(elements.umbralZScore?.value) || 1.5,
    usarMartingala: elements.usarMartingala?.checked ?? false,
    modoMartingala: Number(elements.modoMartingala?.value) || 1,
    valorApuestaBase
  };

  setHeroLevel('Guardando parámetros...');
  try {
    predictor.actualizarConfig(payload);
    saveState();
    refreshUI();
    logMessage('Parámetros estratégicos actualizados', 'success');
    closeModal();
  } catch (error) {
    logMessage('Error al guardar configuración: ' + error.message, 'error');
  } finally {
    setHeroLevel('Parámetros sincronizados');
    updateLastSync();
  }
};

// ─────────────────────────────────────────────
// CONSTRUCCIÓN DEL PAÑO DE RULETA (0 AL 36)
// ─────────────────────────────────────────────
const buildRoulettePad = () => {
  const pad = document.getElementById('roulettePad');
  if (!pad) return;
  pad.innerHTML = '';

  const rows = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
  ];

  rows.forEach((row) => {
    row.forEach((num) => {
      const color = RULETA_COLORES[num];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = num;
      btn.className = color === 'rojo' ? 'num-red' : 'num-black';
      btn.dataset.num = num;
      btn.addEventListener('click', () => selectNumber(num, btn));
      pad.appendChild(btn);
    });
  });

  const zeroBtn = document.createElement('button');
  zeroBtn.type = 'button';
  zeroBtn.textContent = '0';
  zeroBtn.className = 'num-green';
  zeroBtn.dataset.num = 0;
  zeroBtn.addEventListener('click', () => selectNumber(0, zeroBtn));
  pad.appendChild(zeroBtn);
};

const selectNumber = (num, btn) => {
  document.querySelectorAll('#roulettePad button.selected')
    .forEach((b) => b.classList.remove('selected'));
  selectedNumber = num;
  btn.classList.add('selected');
  const color = RULETA_COLORES[num];
  const label = color === 'rojo' ? 'Rojo' : color === 'negro' ? 'Negro' : 'Verde';
  const display = document.getElementById('selectedDisplay');
  if (display) display.textContent = `Seleccionado: #${num} — ${label}`;
};

const handlePadSubmit = () => {
  if (selectedNumber === null) {
    alert('Por favor selecciona un número en el paño antes de confirmar.');
    return;
  }

  setHeroLevel('Procesando tirada...');
  try {
    const payload = predictor.agregarNumero(selectedNumber);
    saveState();
    refreshUI();
    logMessage(payload.logTexto, payload.logTone);
    setHeroLevel('Tirada procesada');
  } catch (error) {
    logMessage('Error al procesar tirada: ' + error.message, 'error');
    setHeroLevel('Error procesando tirada');
  } finally {
    selectedNumber = null;
    document.querySelectorAll('#roulettePad button.selected')
      .forEach((b) => b.classList.remove('selected'));
    const display = document.getElementById('selectedDisplay');
    if (display) display.textContent = 'Ningún número seleccionado';
    updateLastSync();
  }
};

// ─────────────────────────────────────────────
// PLANTILLA DESCARGABLE Y SIMULACIÓN
// ─────────────────────────────────────────────
const downloadTemplate = () => {
  const ejemplo = [26, 3, 3, 20, 9, 8, 17, 28, 21, 8, 17, 28, 21, 8, 26, 36, 24, 33, 2, 33, 34, 1, 12, 25, 19];
  const contenido = `// Antigravity 2026 — Plantilla de Tiradas
// Formato: Arreglo de números entre 0 y 36
// Ejemplo real listo para cargar:

[${ejemplo.join(', ')}]
`;
  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-tiradas-antigravity.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  logMessage('Plantilla .txt descargada correctamente.', 'success');
};

const handleFileChange = () => {
  const file = elements.simulationFile?.files?.[0];
  const nameEl = elements.fileUploadName;
  if (!nameEl) return;
  if (file) {
    nameEl.textContent = `📄 ${file.name}`;
    nameEl.classList.add('has-file');
  } else {
    nameEl.textContent = 'Ningún archivo seleccionado';
    nameEl.classList.remove('has-file');
  }
};

const setupDragAndDrop = () => {
  const area = elements.fileUploadArea;
  if (!area) return;

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('drag-over');
  });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.txt')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      elements.simulationFile.files = dt.files;
      handleFileChange();
    } else {
      logMessage('Solo se admiten archivos en formato .txt', 'error');
    }
  });
};

const parseNumbersFromText = (text) => {
  if (!text || typeof text !== 'string') return [];
  let clean = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
  clean = clean
    .split(/\r?\n/)
    .map((line) => {
      const idx = line.search(/(\/\/|#)/);
      return idx !== -1 ? line.slice(0, idx) : line;
    })
    .join('\n');
  clean = clean.replace(/(?<=\d)\s*-\s*(?=\d)/g, ' ');

  const bracketMatches = [...clean.matchAll(/\[([\s\S]*?)\]/g)]
    .map((m) => m[1])
    .join(' ');
  const targetText = bracketMatches.trim().length > 0 ? bracketMatches : clean;
  const tokens = targetText.match(/-?\b\d+\b/g) || [];

  return tokens
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= 36);
};

const handleSimulationUpload = (event) => {
  event.preventDefault();
  const file = elements.simulationFile?.files?.[0];
  if (!file) {
    alert('Selecciona un archivo .txt con números antes de procesar.');
    return;
  }

  setHeroLevel('Leyendo archivo de simulación...');
  const reader = new FileReader();

  reader.onload = (e) => {
    const raw = e.target.result;
    const numeros = parseNumbersFromText(raw);

    if (!numeros.length) {
      logMessage('No se encontraron números válidos entre 0 y 36 en el archivo.', 'error');
      setHeroLevel('Archivo sin números válidos');
      return;
    }

    setHeroLevel(`Simulando ${numeros.length} tiradas...`);
    let countAcciones = 0;
    let countCompletados = 0;

    numeros.forEach((num) => {
      const out = predictor.agregarNumero(num);
      if (out.resultadoPatron?.completo) countCompletados++;
      if (out.analisis?.signal === 'CONDICION_FAVORABLE' || out.analisis?.signal === 'CONFLUENCIA_ALTA') {
        countAcciones++;
      }
    });

    saveState();
    refreshUI();
    logMessage(
      `Simulación completada: ${numeros.length} tiradas procesadas. Patrones completados: ${countCompletados}. Señales de acción: ${countAcciones}.`,
      'success'
    );
    setHeroLevel(`Simulación completada (${numeros.length} tiradas)`);

    elements.simulationFile.value = '';
    handleFileChange();
  };

  reader.onerror = () => {
    logMessage('No se pudo leer el archivo seleccionado.', 'error');
    setHeroLevel('Error leyendo archivo');
  };

  reader.readAsText(file);
};

// ─────────────────────────────────────────────
// APARTADO DE PEGAR ARREGLO RÁPIDO (ENTRADA SAGAZ)
// ─────────────────────────────────────────────
const handleQuickArraySubmit = () => {
  const raw = elements.quickArrayInput?.value;
  if (!raw || !raw.trim()) {
    alert('Por favor pega un array de números en la caja de texto.');
    return;
  }

  const numeros = parseNumbersFromText(raw);
  if (!numeros.length) {
    alert('No se encontraron números válidos entre 0 y 36 en el texto ingresado.');
    return;
  }

  setHeroLevel(`Inyectando lote de ${numeros.length} tiradas...`);
  let countAcciones = 0;
  let countCompletados = 0;

  numeros.forEach((num) => {
    const out = predictor.agregarNumero(num);
    if (out.resultadoPatron?.completo) countCompletados++;
    if (out.analisis?.signal === 'CONDICION_FAVORABLE' || out.analisis?.signal === 'CONFLUENCIA_ALTA') {
      countAcciones++;
    }
  });

  saveState();
  refreshUI();
  logMessage(
    `⚡ Entrada Sagaz: ${numeros.length} tiradas inyectadas en lote. Patrones completados: ${countCompletados}. Señales activas: ${countAcciones}.`,
    'success'
  );
  setHeroLevel(`Lote de ${numeros.length} tiradas inyectado ⚡`);

  // Feedback visual en el botón
  if (elements.quickArraySubmitBtn) {
    const origText = elements.quickArraySubmitBtn.textContent;
    elements.quickArraySubmitBtn.textContent = '¡Inyectado con Éxito! ✓';
    setTimeout(() => {
      elements.quickArraySubmitBtn.textContent = origText;
    }, 1800);
  }
};

const handleQuickArrayClear = () => {
  if (elements.quickArrayInput) {
    elements.quickArrayInput.value = '';
    elements.quickArrayInput.focus();
    logMessage('Caja de array limpiada', 'info');
  }
};

const handleQuickArrayPaste = async () => {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text && elements.quickArrayInput) {
        elements.quickArrayInput.value = text;
        logMessage('Array pegado desde el portapapeles con éxito', 'info');
      }
    } else {
      alert('Tu navegador requiere usar Ctrl+V para pegar directamente en la caja.');
    }
  } catch (err) {
    logMessage('Usa Ctrl+V para pegar directamente en la caja de texto.', 'warn');
  }
};

// ─────────────────────────────────────────────
// INICIALIZACIÓN DE LA APLICACIÓN
// ─────────────────────────────────────────────
const init = () => {
  loadState();

  const statusMessage = predictor.historialNumeros.length
    ? 'Sesión restaurada desde almacenamiento local'
    : 'Sistema listo: registra un número en el paño para comenzar';
  logMessage(statusMessage, 'info');

  refreshUI();
  buildRoulettePad();

  // Listeners principales
  elements.openConfigBtn.addEventListener('click', openModal);
  elements.resetBtn.addEventListener('click', resetSession);
  elements.closeConfigModal.addEventListener('click', closeModal);
  elements.cancelConfig.addEventListener('click', closeModal);
  elements.configForm.addEventListener('submit', handleConfigSubmit);
  elements.usarMartingala.addEventListener('change', (e) => toggleMartingalaFields(e.target.checked));

  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && selectedNumber !== null) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
        e.preventDefault();
        handlePadSubmit();
      }
    }
  });

  const submitBtn = document.getElementById('submitNumBtn');
  if (submitBtn) submitBtn.addEventListener('click', handlePadSubmit);

  // Entrada Sagaz (Pegar Arreglo Rápido)
  if (elements.quickArraySubmitBtn) {
    elements.quickArraySubmitBtn.addEventListener('click', handleQuickArraySubmit);
  }
  if (elements.quickArrayClearBtn) {
    elements.quickArrayClearBtn.addEventListener('click', handleQuickArrayClear);
  }
  if (elements.quickArrayPasteBtn) {
    elements.quickArrayPasteBtn.addEventListener('click', handleQuickArrayPaste);
  }
  if (elements.quickArrayInput) {
    elements.quickArrayInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleQuickArraySubmit();
      }
    });
  }

  // Simulación
  if (elements.simulationForm) elements.simulationForm.addEventListener('submit', handleSimulationUpload);
  if (elements.simulationFile) elements.simulationFile.addEventListener('change', handleFileChange);
  setupDragAndDrop();

  if (elements.downloadTemplateBtn) elements.downloadTemplateBtn.addEventListener('click', downloadTemplate);

  // Gráfico
  window.addEventListener('resize', renderBalanceChart);
  if (window.ResizeObserver && elements.balanceCanvas?.parentElement) {
    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(renderBalanceChart);
    });
    ro.observe(elements.balanceCanvas.parentElement);
  }

  if (elements.zoomRange) {
    elements.zoomRange.addEventListener('input', handleZoomChange);
    elements.zoomRange.value = chartState.windowSize.toString();
  }

  if (elements.balanceCanvas) {
    const handleTouch = (e) => {
      if (e.touches && e.touches.length > 0) {
        handleChartHover(e.touches[0]);
      }
    };
    elements.balanceCanvas.addEventListener('mousemove', handleChartHover);
    elements.balanceCanvas.addEventListener('mouseleave', handleChartLeave);
    elements.balanceCanvas.addEventListener('touchmove', handleTouch, { passive: true });
    elements.balanceCanvas.addEventListener('touchstart', handleTouch, { passive: true });
    elements.balanceCanvas.addEventListener('touchend', handleChartLeave);
  }

  updateHoverInfo(null);
};

init();