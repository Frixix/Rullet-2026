const STORAGE_KEY = 'ruletaPredictorState';
const DEFAULT_LATEST_MESSAGE = 'Ningún número registrado aún.';
const MAX_HISTORIAL_REGISTROS = 1000;

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
// MOTOR CUANTITATIVO ANTIGRAVITY (PROBABILÍSTICO)
// ─────────────────────────────────────────────
class RuletaPredictor {
  constructor() {
    this.resetState();
  }

  calcularNivelesMartingala(base) {
    const b = Number(base) || 1000;
    return [b, b * 2, b * 4, b * 8]; // Límite estricto de 4 escalones para control de varianza
  }

  getDefaultConfig() {
    const base = 1000;
    return {
      tipoRuleta: 'Europea',
      umbralRacha: 6,
      umbralZScore: 2.0,
      usarMartingala: false,
      modoMartingala: 1, // 1: Apuesta plana condicional, 2: Escalonada
      valorApuestaBase: base,
      nivelesMartingala: this.calcularNivelesMartingala(base)
    };
  }

  resetState() {
    const config = this.getDefaultConfig();
    this.historialNumeros = [];
    this.totalTiradasContador = 0;
    this.config = { ...config };
    this.saldoMartingala = 0;
    this.nivelMartingala = 0;
    this.apuestaActual = config.valorApuestaBase;
    this.posicionAbierta = null;
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

    // Re-evaluar motor si hay historial pero falta el análisis
    if (this.historialNumeros.length > 0 && !this.ultimoAnalisis) {
      const ultimoNum = this.historialNumeros[this.historialNumeros.length - 1].numero;
      this.ultimoAnalisis = this.evaluarMotorAntigravity(ultimoNum);
    }
  }

  serializeState() {
    return {
      historialNumeros: this.historialNumeros,
      totalTiradasContador: this.totalTiradasContador,
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
        texto: `${countColor} ${ultimo.color.toUpperCase()}`
      },
      paridad: {
        tipo: ultimo.paridad,
        count: countParidad,
        probabilidad: formatProb(probParidad),
        probRaw: probParidad,
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

  evaluarMotorAntigravity(nuevoNumero) {
    const rachas = this.calcularRachas();
    const zScores = this.calcularZScores();
    const ceroStats = this.calcularEstadisticasCero();

    if (!rachas) {
      return {
        signal: 'ESPERAR',
        target: null,
        rachaActiva: null,
        zScore: zScores,
        riesgo: 'BAJO',
        filtroFrenoActivo: true,
        ceroStats,
        diagnostico: 'Inicializando motor cuantitativo. Registra tiradas para calibrar la varianza.',
        mensajeLog: 'Sistema en espera de datos.'
      };
    }

    const umbralRacha = Number(this.config.umbralRacha) || 6;
    const umbralZ = Number(this.config.umbralZScore) || 2.0;

    const rColor = rachas.color;
    const rParidad = rachas.paridad;
    const rRango = rachas.rango;

    let rachaDominante = rColor;
    if (rParidad && rParidad.count > rachaDominante.count) rachaDominante = rParidad;
    if (rRango && rRango.count > rachaDominante.count) rachaDominante = rRango;

    let signal = 'ESPERAR';
    let target = null;
    let targetType = null;
    let riesgo = 'BAJO';
    let diagnostico = '';
    let mensajeLog = '';

    const dintelRachaColor = Math.max(7, umbralRacha);
    const cumpleDintelColor =
      (rColor.count >= umbralRacha && Math.abs(zScores.local) >= umbralZ) ||
      rColor.count >= dintelRachaColor;

    const dintelRachaParidad = Math.max(7, umbralRacha);
    const cumpleDintelParidad =
      rParidad &&
      rParidad.tipo !== 'cero' &&
      ((rParidad.count >= umbralRacha && Math.abs(zScores.local) >= umbralZ) ||
        rParidad.count >= dintelRachaParidad);

    // Gestión del Cero (0)
    if (nuevoNumero === 0) {
      signal = 'ESPERAR';
      target = null;
      riesgo = 'MEDIO';
      diagnostico = `Aparición del Cero (0). Se aplicó la absorción del margen de la casa (2.70%). Las simetrías de suertes simples quedan suspendidas.`;
      mensajeLog = `Tirada #${this.totalTiradasContador} → #0 Verde | Disrupción por Cero. Filtro: [ESPERAR].`;
    }
    // Filtro de Freno: Condición Favorable para Color
    else if (cumpleDintelColor) {
      signal = 'CONDICION_FAVORABLE';
      target = rColor.tipo === 'rojo' ? 'NEGRO' : 'ROJO';
      targetType = 'color';
      riesgo = rColor.count >= 8 ? 'ALTO' : 'MEDIO';
      diagnostico = `ANOMALÍA DETECTADA: Racha de ${rColor.count} ${rColor.tipo.toUpperCase()}S con Z-Score de ${zScores.local >= 0 ? '+' : ''}${zScores.local}σ (P = ${rColor.probabilidad}). Dintel superado: entrada válida buscando reversión hacia ${target}.`;
      mensajeLog = `Tirada #${this.totalTiradasContador} → #${nuevoNumero} ${rColor.tipo.toUpperCase()} | Racha crítica ${rColor.count} (${rColor.probabilidad}) | Z: ${zScores.local}σ | Señal: [CONDICIÓN FAVORABLE] → ${target}.`;
    }
    // Filtro de Freno: Condición Favorable para Paridad
    else if (cumpleDintelParidad) {
      signal = 'CONDICION_FAVORABLE';
      target = rParidad.tipo === 'par' ? 'IMPAR' : 'PAR';
      targetType = 'paridad';
      riesgo = rParidad.count >= 8 ? 'ALTO' : 'MEDIO';
      diagnostico = `ANOMALÍA DETECTADA: Racha de ${rParidad.count} ${rParidad.tipo.toUpperCase()}ES (P = ${rParidad.probabilidad}). Dintel superado: entrada válida buscando reversión hacia ${target}.`;
      mensajeLog = `Tirada #${this.totalTiradasContador} → #${nuevoNumero} | Racha paridad ${rParidad.count} (${rParidad.probabilidad}) | Señal: [CONDICIÓN FAVORABLE] → ${target}.`;
    }
    // Filtro de Freno: Estado por defecto ESPERAR
    else {
      signal = 'ESPERAR';
      target = null;
      if (rColor.count >= 4) {
        riesgo = 'MEDIO';
        diagnostico = `Racha de ${rColor.count} ${rColor.tipo.toUpperCase()}S en formación (Z = ${zScores.local >= 0 ? '+' : ''}${zScores.local}σ). FILTRO DE FRENO ACTIVO: No operar prematuramente (evitar falacia del apostador).`;
      } else if (Math.abs(zScores.local) < 1.0) {
        riesgo = 'BAJO';
        diagnostico = `Distribución local en equilibrio estocástico (|Z| < 1.0σ). Sin asimetría aprovechable. Paciencia y preservación de capital.`;
      } else {
        riesgo = 'BAJO';
        diagnostico = `Tensión de varianza moderada (Z = ${zScores.local >= 0 ? '+' : ''}${zScores.local}σ). No alcanza el umbral de entrada (Racha < ${umbralRacha} o |Z| < ${umbralZ}σ).`;
      }
      mensajeLog = `Tirada #${this.totalTiradasContador} → #${nuevoNumero} ${rColor.tipo.toUpperCase()} | Racha: ${rColor.count} | Z: ${zScores.local}σ | Señal: [ESPERAR].`;
    }

    return {
      signal,
      target,
      targetType,
      rachaActiva: rachaDominante,
      zScore: zScores,
      riesgo,
      filtroFrenoActivo: signal === 'ESPERAR',
      ceroStats,
      diagnostico,
      mensajeLog
    };
  }

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
            this.nivelMartingala = 0;
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

  agregarNumero(numero) {
    const props = this.getPropiedades(numero);
    const previousBalance = this.saldoMartingala;

    // 1. Resolver posición condicional previa si existía
    const martingala = this.procesarApuestaCondicional(props);

    // 2. Registrar en historial
    this.totalTiradasContador++;
    const registro = {
      numero,
      color: props.color,
      paridad: props.paridad,
      rango: props.rango,
      docena: props.docena,
      columna: props.columna,
      timestamp: new Date().toISOString(),
      tiradaNumero: this.totalTiradasContador
    };
    this.historialNumeros.push(registro);
    if (this.historialNumeros.length > MAX_HISTORIAL_REGISTROS) {
      this.historialNumeros.shift();
    }

    // 3. Evaluar estado analítico cuantitativo
    const analisis = this.evaluarMotorAntigravity(numero);
    this.ultimoAnalisis = analisis;

    // 4. Si la señal es favorable y las apuestas están activas, preparar posición para la siguiente tirada
    if (this.config.usarMartingala && analisis.signal === 'CONDICION_FAVORABLE') {
      this.posicionAbierta = {
        target: analisis.target,
        targetType: analisis.targetType,
        monto: this.apuestaActual
      };
    } else {
      this.posicionAbierta = null;
    }

    // 5. Registrar en gráfico de balance
    this.recordBalanceStep(previousBalance, martingala, this.totalTiradasContador);

    this.ultimoResultado = {
      numero,
      color: props.color,
      analisis,
      martingala,
      tiradaNumero: this.totalTiradasContador
    };

    return {
      ...this.ultimoResultado,
      estadisticas: this.getEstadisticas(),
      logTexto: analisis.mensajeLog,
      logTone:
        analisis.signal === 'CONDICION_FAVORABLE'
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
// INSTANCIA Y ELEMENTOS DOM
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

  // Panel Co-Piloto Antigravity
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

  // Config pills en el hero
  heroConfigTipoRuleta: document.getElementById('heroConfigTipoRuleta'),
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

  // Canvas y controles de gráfico
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
  downloadTemplateBtn: document.getElementById('downloadTemplateBtn')
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
// LOG
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
  if (elements.logList.childElementCount > 20) elements.logList.lastElementChild.remove();
};

// ─────────────────────────────────────────────
// PLANTILLA DESCARGABLE
// ─────────────────────────────────────────────
const downloadTemplate = () => {
  const ejemplo = [0, 5, 12, 3, 27, 36, 14, 8, 0, 19, 22, 7, 31, 0, 4];
  const contenido = `// Predictor de Ruleta 2026 — Plantilla de tiradas
// Formato: arreglo de números entre 0 y 36
// Puedes poner varios números separados por comas
// Ejemplo real abajo, reemplaza con tus propios datos:

[${ejemplo.join(', ')}]
`;
  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-tiradas-ruleta.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  logMessage('Plantilla .txt descargada correctamente.', 'success');
};

// ─────────────────────────────────────────────
// FILE INPUT CUSTOM
// ─────────────────────────────────────────────
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

  area.addEventListener('dragleave', () => {
    area.classList.remove('drag-over');
  });

  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.txt')) {
      // Asignar al input de archivo vía DataTransfer
      const dt = new DataTransfer();
      dt.items.add(file);
      elements.simulationFile.files = dt.files;
      handleFileChange();
    } else {
      logMessage('Solo se aceptan archivos .txt', 'error');
    }
  });
};

// ─────────────────────────────────────────────
// SIMULACIÓN
// ─────────────────────────────────────────────
const parseNumbersFromText = (text) => {
  if (!text || typeof text !== 'string') return [];

  // 1. Eliminar comentarios multilínea (/* ... */)
  let clean = text.replace(/\/\*[\s\S]*?\*\//g, ' ');

  // 2. Eliminar comentarios de una línea (// o #), tanto líneas completas como comentarios al final de línea
  clean = clean
    .split(/\r?\n/)
    .map((line) => {
      const idx = line.search(/(\/\/|#)/);
      return idx !== -1 ? line.slice(0, idx) : line;
    })
    .join('\n');

  // 3. Normalizar guiones entre números (separadores como 10-20 o 10 - 20) por espacios
  clean = clean.replace(/(?<=\d)\s*-\s*(?=\d)/g, ' ');

  // 4. Si contiene corchetes [...], extraer prioritariamente el arreglo dentro de corchetes
  const bracketMatches = [...clean.matchAll(/\[([\s\S]*?)\]/g)]
    .map((m) => m[1])
    .join(' ');

  const targetText = bracketMatches.trim().length > 0 ? bracketMatches : clean;

  // 5. Capturar números enteros independientes (0 a 36), ignorando negativos o palabras
  const tokens = targetText.match(/-?\b\d+\b/g) || [];

  return tokens
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= 36);
};

const simulationSuggestions = [
  'Carga secuencias largas para afinar el conteo C‑D‑E antes de activar martingala.',
  'Cada cero reinicia el patrón; usa eso para evaluar qué tan seguido aparece.',
  'Si ves muchos colores repetidos, analiza si es mejor usar martingala escalonada.'
];

const renderSimulationSuggestions = () => {
  if (!elements.suggestionsList) return;
  elements.suggestionsList.innerHTML = '';
  simulationSuggestions.forEach((tip) => {
    const li = document.createElement('li');
    li.textContent = tip;
    elements.suggestionsList.appendChild(li);
  });
};

const handleSimulationUpload = (event) => {
  event.preventDefault();
  const file = elements.simulationFile?.files?.[0];
  if (!file) {
    alert('Selecciona un archivo .txt con los datos antes de procesar.');
    return;
  }

  const reader = new FileReader();
  setHeroLevel('Procesando simulación...');

  reader.onload = (loadEvent) => {
    const rawText = loadEvent.target?.result || '';
    const parsedNumbers = parseNumbersFromText(rawText);
    if (!parsedNumbers.length) {
      logMessage('El archivo no contenía números válidos (0‑36).', 'error');
      setHeroLevel('Nada procesado');
      return;
    }

    parsedNumbers.forEach((numero) => predictor.agregarNumero(numero));
    saveState();
    refreshUI();
    logMessage(`Simulación cargada: ${parsedNumbers.length} números procesados.`, 'success');
    setHeroLevel('Simulación aplicada');

    // Limpiar input
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
// CHART
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
    elements.hoverLaunch.textContent = 'Lanzamiento: —';
    elements.hoverSaldo.textContent = 'Saldo actual: —';
    return;
  }
  const tiradaNum = entry.tiradaNumero ?? absoluteIndex ?? '—';
  elements.hoverLaunch.textContent = `Lanzamiento: #${tiradaNum}`;
  elements.hoverSaldo.textContent = `Saldo actual: ${formatCurrency(entry.close)}`;
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

  if (!timelineLength || chartWidth <= 0) { chartState.hoverIndex = null; updateHoverInfo(null); return; }

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
    elements.balanceCurrent.style.color = current >= 0 ? 'rgb(34,197,94)' : 'rgb(239,68,68)';
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

  // ── Márgenes ──────────────────────────────────────────────────
  const PAD_LEFT   = 58;
  const PAD_RIGHT  = 16;
  const PAD_TOP    = 38;
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
    padding: PAD_LEFT,        // compatibilidad con handleChartHover
    timelineLength: visibleLength
  };
  if (visibleLength > 0) {
    chartState.hoverIndex = chartState.hoverIndex === null
      ? null
      : Math.min(Math.max(chartState.hoverIndex, 0), visibleLength - 1);
  } else {
    chartState.hoverIndex = null;
  }
  updateZoomLabel(chartState.windowSize);

  // ── Fondo ─────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(3,3,3,0.9)';
  ctx.fillRect(0, 0, width, height);

  if (!visibleLength) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '13px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Registra tiradas para ver el saldo en acción', width / 2, height / 2);
    return;
  }

  // ── Escala ────────────────────────────────────────────────────
  const closes = visibleTimeline.map(e => e.close);
  const maxVal = Math.max(...closes, 0);
  const minVal = Math.min(...closes, 0);
  // Añadir 8% de margen arriba y abajo para que los puntos no queden pegados al borde
  const padding8 = (maxVal - minVal) * 0.08 || 0.5;
  const domainMax = maxVal + padding8;
  const domainMin = minVal - padding8;
  const valueRange = Math.max(0.01, domainMax - domainMin);

  const toY = (val) => PAD_TOP + chartHeight - ((val - domainMin) / valueRange) * chartHeight;
  const toX = (i)   => PAD_LEFT + (visibleLength > 1 ? (i / (visibleLength - 1)) * chartWidth : chartWidth / 2);

  const yZero = toY(0);
  const currentBalance = predictor.saldoMartingala;

  // ── Grid horizontal ───────────────────────────────────────────
  const numGridLines = 5;
  for (let i = 0; i <= numGridLines; i++) {
    const val = domainMin + (valueRange / numGridLines) * i;
    const y   = toY(val);
    const isZeroLine = Math.abs(val) < valueRange / numGridLines / 2;

    ctx.strokeStyle = isZeroLine ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD_LEFT, y); ctx.lineTo(width - PAD_RIGHT, y); ctx.stroke();

    // Etiquetas del eje Y
    const roundedVal = Math.round(val);
    const isPos = roundedVal >= 0;
    ctx.fillStyle = isZeroLine ? 'rgba(255,255,255,0.7)' : 'rgba(203,213,255,0.55)';
    ctx.font = `${isZeroLine ? 'bold ' : ''}10px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      roundedVal === 0 ? '$0' : `${isPos ? '+' : '-'}$${Math.abs(roundedVal)}`,
      PAD_LEFT - 5, y
    );
  }

  // ── Línea de cero ─────────────────────────────────────────────
  const zeroColor = currentBalance >= 0 ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)';
  ctx.save();
  ctx.strokeStyle = zeroColor;
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(PAD_LEFT, yZero); ctx.lineTo(width - PAD_RIGHT, yZero); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── Área de relleno (verde arriba, rojo abajo) ────────────────
  // Construimos la forma: línea de closes + volver al cero
  const areaPath = new Path2D();
  areaPath.moveTo(toX(0), yZero);
  visibleTimeline.forEach((e, i) => areaPath.lineTo(toX(i), toY(e.close)));
  areaPath.lineTo(toX(visibleLength - 1), yZero);
  areaPath.closePath();

  // Zona positiva (clip arriba del cero)
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD_LEFT, PAD_TOP, chartWidth, Math.max(0, yZero - PAD_TOP));
  ctx.clip();
  const gradPos = ctx.createLinearGradient(0, PAD_TOP, 0, yZero);
  gradPos.addColorStop(0, 'rgba(34,197,94,0.35)');
  gradPos.addColorStop(1, 'rgba(34,197,94,0.04)');
  ctx.fillStyle = gradPos;
  ctx.fill(areaPath);
  ctx.restore();

  // Zona negativa (clip abajo del cero)
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD_LEFT, yZero, chartWidth, Math.max(0, (PAD_TOP + chartHeight) - yZero));
  ctx.clip();
  const gradNeg = ctx.createLinearGradient(0, yZero, 0, PAD_TOP + chartHeight);
  gradNeg.addColorStop(0, 'rgba(239,68,68,0.04)');
  gradNeg.addColorStop(1, 'rgba(239,68,68,0.35)');
  ctx.fillStyle = gradNeg;
  ctx.fill(areaPath);
  ctx.restore();

  // ── Línea de equity ───────────────────────────────────────────
  ctx.beginPath();
  visibleTimeline.forEach((e, i) => {
    const x = toX(i), y = toY(e.close);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  const lineGrad = ctx.createLinearGradient(0, PAD_TOP, 0, PAD_TOP + chartHeight);
  lineGrad.addColorStop(0,   '#22c55e');
  lineGrad.addColorStop(0.5, '#facc15');
  lineGrad.addColorStop(1,   '#ef4444');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.stroke();

  // ── Puntos de eventos (martingala win / loss) ─────────────────
  visibleTimeline.forEach((entry, i) => {
    if (!entry.tipo) return;
    const x     = toX(i);
    const y     = toY(entry.close);
    const isWin = entry.tipo === 'acierto';
    const dotColor = isWin ? '#22c55e' : '#ef4444';

    // Halo
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 12);
    glow.addColorStop(0, isWin ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();

    // Círculo relleno
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle   = dotColor; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

    // Delta encima del punto
    const diff  = entry.close - entry.open;
    const label = (diff >= 0 ? '+' : '') + '$' + Math.abs(Math.round(diff));
    ctx.fillStyle     = isWin ? '#86efac' : '#fca5a5';
    ctx.font          = 'bold 9px "Space Grotesk", sans-serif';
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'bottom';
    ctx.fillText(label, x, y - 9);
  });

  // ── Eje X ─────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, PAD_TOP + chartHeight);
  ctx.lineTo(width - PAD_RIGHT, PAD_TOP + chartHeight);
  ctx.stroke();

  const timeTicks = Math.min(visibleLength - 1, 8);
  for (let i = 0; i <= timeTicks; i++) {
    const idx = timeTicks === 0 ? 0 : Math.round((visibleLength - 1) * (i / timeTicks));
    const x   = toX(idx);
    const entry = visibleTimeline[idx];
    const tiradaNum = entry?.tiradaNumero ?? (startIndex + idx + 1);
    ctx.fillStyle    = 'rgba(203,213,255,0.6)';
    ctx.font         = '10px "Space Grotesk", sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(tiradaNum.toString(), x, PAD_TOP + chartHeight + 5);
  }
  ctx.fillStyle    = 'rgba(203,213,255,0.35)';
  ctx.font         = '10px "Space Grotesk", sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Tirada #', width / 2, PAD_TOP + chartHeight + 20);

  // ── Barra de stats (arriba del canvas) ───────────────────────
  const netChange = closes[closes.length - 1] - closes[0];
  const peak   = Math.max(...closes);
  const trough = Math.min(...closes);
  const isNetPos = netChange >= 0;

  ctx.font         = 'bold 10px "Space Grotesk", sans-serif';
  ctx.textBaseline = 'middle';
  const statsY = PAD_TOP / 2;

  ctx.fillStyle = isNetPos ? '#86efac' : '#fca5a5';
  ctx.textAlign = 'left';
  ctx.fillText(
    `${isNetPos ? '▲' : '▼'} Neto: ${isNetPos ? '+' : '-'}$${Math.abs(Math.round(netChange))}`,
    PAD_LEFT, statsY
  );

  ctx.fillStyle = '#86efac';
  ctx.textAlign = 'center';
  ctx.fillText(`Pico: +$${Math.round(peak)}`, width / 2 - 40, statsY);

  ctx.fillStyle = '#fca5a5';
  ctx.textAlign = 'center';
  ctx.fillText(`Valle: -$${Math.abs(Math.round(trough))}`, width / 2 + 40, statsY);

  ctx.fillStyle = currentBalance >= 0 ? '#86efac' : '#fca5a5';
  ctx.textAlign = 'right';
  ctx.fillText(
    `Actual: ${currentBalance >= 0 ? '+' : '-'}$${Math.abs(Math.round(currentBalance))}`,
    width - PAD_RIGHT, statsY
  );

  // ── Crosshair + tooltip ───────────────────────────────────────
  if (chartState.hoverIndex !== null && chartState.hoverIndex < visibleLength) {
    const hi    = chartState.hoverIndex;
    const hx    = toX(hi);
    const hEntry = visibleTimeline[hi];
    const hy    = toY(hEntry.close);
    const diff  = hEntry.close - hEntry.open;
    const isWin = diff > 0;

    // Líneas de crosshair
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(hx, PAD_TOP); ctx.lineTo(hx, PAD_TOP + chartHeight); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD_LEFT, hy); ctx.lineTo(width - PAD_RIGHT, hy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Punto de hover
    ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2);
    ctx.fillStyle   = hEntry.close >= 0 ? '#22c55e' : '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    // Tooltip
    const TW = 148, TH = 78;
    const tx = hx > width * 0.6 ? hx - TW - 10 : hx + 12;
    const ty = Math.min(Math.max(hy - TH / 2, PAD_TOP + 4), PAD_TOP + chartHeight - TH - 4);

    ctx.fillStyle   = 'rgba(5,5,5,0.94)';
    ctx.strokeStyle = hEntry.close >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)';
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(tx, ty, TW, TH, 8);
    } else {
      ctx.rect(tx, ty, TW, TH);
    }
    ctx.fill(); ctx.stroke();

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = 'rgba(203,213,255,0.6)';
    ctx.font      = '10px "Space Grotesk", sans-serif';
    const tiradaNum = hEntry?.tiradaNumero ?? (startIndex + hi + 1);
    ctx.fillText(`Tirada #${tiradaNum}`, tx + 10, ty + 10);

    ctx.fillStyle = hEntry.close >= 0 ? '#86efac' : '#fca5a5';
    ctx.font      = 'bold 16px "Space Grotesk", sans-serif';
    ctx.fillText(
      `${hEntry.close >= 0 ? '+' : '-'}$${Math.abs(Math.round(hEntry.close))}`,
      tx + 10, ty + 26
    );

    ctx.fillStyle = diff === 0 ? 'rgba(255,255,255,0.4)' : (isWin ? '#86efac' : '#fca5a5');
    ctx.font      = '11px "Space Grotesk", sans-serif';
    ctx.fillText(
      diff === 0
        ? '— Sin cambio'
        : `${isWin ? '▲ +' : '▼ -'}$${Math.abs(Math.round(diff))} vs anterior`,
      tx + 10, ty + 52
    );
  }
};


// ─────────────────────────────────────────────
// ESTADO Y PERSISTENCIA
// ─────────────────────────────────────────────
const updateLastSync = () => {
  elements.lastSync.textContent = `Última actualización: ${new Date().toLocaleTimeString('es-CO')}`;
};

const setHeroLevel = (text) => {
  elements.heroLevel.textContent = text;
};

const saveState = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(predictor.serializeState()));
  } catch (error) {
    console.warn('No se pudo guardar el estado localmente', error);
    try {
      const compactState = predictor.serializeState();
      compactState.historialNumeros = compactState.historialNumeros.slice(-300);
      compactState.balanceTimeline = compactState.balanceTimeline.slice(-300);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compactState));
    } catch {
      // Ignorar si aún excede cuota
    }
  }
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    predictor.loadState(JSON.parse(raw));
  } catch (error) {
    console.warn('Estado local corrupto, se iniciará desde cero', error);
    predictor.resetState();
  }
};

// ─────────────────────────────────────────────
// RENDER CO-PILOTO ANTIGRAVITY
// ─────────────────────────────────────────────
const renderCopilot = (analisis) => {
  if (!elements.copilotSignal) return;

  if (!analisis) {
    elements.copilotSignal.className = 'copilot-signal signal-esperar';
    if (elements.signalText) elements.signalText.textContent = '[ESPERAR]';
    if (elements.copilotStreak) elements.copilotStreak.textContent = '0 — Neutro';
    if (elements.copilotStreakProb) elements.copilotStreakProb.textContent = 'P(teórica): 100%';
    if (elements.copilotZScore) elements.copilotZScore.textContent = '0.00σ';
    if (elements.copilotVarianceStatus) elements.copilotVarianceStatus.textContent = 'Rango estocástico normal';
    if (elements.copilotRisk) {
      elements.copilotRisk.textContent = 'BAJO';
      elements.copilotRisk.className = 'copilot-card__value risk-low';
    }
    if (elements.copilotFilterStatus) elements.copilotFilterStatus.textContent = 'Filtro de freno ACTIVO';
    if (elements.copilotZeroGap) elements.copilotZeroGap.textContent = '0 tiradas';
    if (elements.copilotZeroRatio) elements.copilotZeroRatio.textContent = 'Obs: 0% | Esp: 2.70%';
    if (elements.copilotTarget) elements.copilotTarget.textContent = 'Sin objetivo activo';
    if (elements.copilotDiagnosis) {
      elements.copilotDiagnosis.textContent =
        'Esperando tiradas para calibrar la varianza local frente a la tendencia de equilibrio macro.';
    }
    return;
  }

  // Señal del Filtro de Freno
  const esFavorable = analisis.signal === 'CONDICION_FAVORABLE';
  elements.copilotSignal.className = `copilot-signal ${esFavorable ? 'signal-accion' : 'signal-esperar'}`;
  if (elements.signalText) {
    elements.signalText.textContent = esFavorable
      ? '[CONDICIÓN FAVORABLE PARA ACCIÓN]'
      : '[ESPERAR]';
  }

  // Racha
  const r = analisis.rachaActiva;
  if (elements.copilotStreak) {
    elements.copilotStreak.textContent = r?.texto || '0 — Neutro';
  }
  if (elements.copilotStreakProb) {
    elements.copilotStreakProb.textContent = r ? `P(teórica): ${r.probabilidad}` : 'P(teórica): 100%';
  }

  // Z-Score
  const zVal = analisis.zScore?.local ?? 0;
  if (elements.copilotZScore) {
    elements.copilotZScore.textContent = `${zVal >= 0 ? '+' : ''}${zVal.toFixed(2)}σ`;
  }
  if (elements.copilotVarianceStatus) {
    elements.copilotVarianceStatus.textContent =
      Math.abs(zVal) >= 2.0
        ? 'Anomalía estadística (|Z| ≥ 2.0σ)'
        : Math.abs(zVal) >= 1.5
          ? 'Tensión de varianza moderada'
          : 'Rango estocástico normal';
  }

  // Riesgo
  if (elements.copilotRisk) {
    elements.copilotRisk.textContent = analisis.riesgo || 'BAJO';
    const riskClass =
      analisis.riesgo === 'CRÍTICO'
        ? 'risk-critical'
        : analisis.riesgo === 'ALTO'
          ? 'risk-high'
          : analisis.riesgo === 'MEDIO'
            ? 'risk-med'
            : 'risk-low';
    elements.copilotRisk.className = `copilot-card__value ${riskClass}`;
  }

  if (elements.copilotFilterStatus) {
    elements.copilotFilterStatus.textContent = esFavorable
      ? 'Filtro SUPERADO (Entrada válida)'
      : 'Filtro de freno ACTIVO';
  }

  // Cero (0)
  const c = analisis.ceroStats;
  if (c) {
    if (elements.copilotZeroGap) elements.copilotZeroGap.textContent = `${c.gap} tiradas sin caer`;
    if (elements.copilotZeroRatio) {
      elements.copilotZeroRatio.textContent = `Obs: ${c.ratio}% | Esp: 2.70% (${c.count} veces)`;
    }
  }

  // Objetivo y Diagnóstico
  if (elements.copilotTarget) {
    elements.copilotTarget.textContent = analisis.target
      ? `Objetivo: Buscar reversión a ${analisis.target}`
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

  // Pills del hero
  if (elements.heroConfigTipoRuleta) elements.heroConfigTipoRuleta.textContent = config.tipoRuleta;
  if (elements.heroConfigFiltro) {
    elements.heroConfigFiltro.textContent = `Racha ≥ ${config.umbralRacha || 6} | Z ≥ ${config.umbralZScore || 2.0}σ`;
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
      : 'Inactivo';
  }

  // Sincronizar valores en el form del modal
  if (elements.tipoRuleta) elements.tipoRuleta.value = config.tipoRuleta;
  if (elements.umbralRacha) elements.umbralRacha.value = config.umbralRacha || 6;
  if (elements.umbralZScore) elements.umbralZScore.value = config.umbralZScore || 2.0;
  if (elements.usarMartingala) elements.usarMartingala.checked = Boolean(config.usarMartingala);
  if (elements.modoMartingala) elements.modoMartingala.value = config.modoMartingala;
  if (elements.valorApuestaBase) elements.valorApuestaBase.value = config.valorApuestaBase;
  toggleMartingalaFields(config.usarMartingala);
};

const toggleMartingalaFields = (show) => {
  if (elements.martingalaDetails) elements.martingalaDetails.style.display = show ? 'flex' : 'none';
};

// ─────────────────────────────────────────────
// RENDER STATS, HISTORY, UI
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
    elements.topNumbersList.innerHTML = '<li class="placeholder">Sin números populares aún.</li>';
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
    elements.historyList.innerHTML = '<li class="placeholder">Aún no hay tiradas.</li>';
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

const refreshUI = () => {
  const stats = predictor.getEstadisticas();
  renderStats(stats);
  renderCopilot(predictor.ultimoAnalisis);
  renderHistory(predictor.historialNumeros);
  renderBalanceChart();
  updateBalanceSummary();
  updateLastSync();
};

const resetSession = () => {
  if (predictor.historialNumeros.length > 0) {
    const confirmReset = window.confirm('¿Seguro que deseas reiniciar la sesión? Se borrará todo el historial y saldo acumulado.');
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
  setHeroLevel('Motor Antigravity Activo ⚡');
};

// ─────────────────────────────────────────────
// MODAL
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
    umbralRacha: Number(elements.umbralRacha?.value) || 6,
    umbralZScore: Number(elements.umbralZScore?.value) || 2.0,
    usarMartingala: elements.usarMartingala?.checked ?? false,
    modoMartingala: Number(elements.modoMartingala?.value) || 1,
    valorApuestaBase
  };

  setHeroLevel('Guardando parámetros...');
  try {
    const config = predictor.actualizarConfig(payload);
    saveState();
    refreshUI();
    logMessage('Parámetros del motor cuantitativo actualizados', 'success');
    closeModal();
  } catch (error) {
    logMessage('Error guardando configuración: ' + error.message, 'error');
  } finally {
    setHeroLevel('Motor Antigravity Activo ⚡');
    updateLastSync();
  }
};

// ─────────────────────────────────────────────
// RULETA PAD
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
  if (display) display.textContent = `Seleccionado: ${num} — ${label}`;
};

const handlePadSubmit = () => {
  if (selectedNumber === null) {
    alert('Selecciona un número en el teclado primero.');
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
    logMessage('Error al registrar número: ' + error.message, 'error');
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
// INIT
// ─────────────────────────────────────────────
const init = () => {
  loadState();

  const statusMessage = predictor.historialNumeros.length
    ? 'Estado restaurado desde almacenamiento local'
    : 'Flujo en blanco: empieza registrando un número';
  logMessage(statusMessage, 'info');

  refreshUI();
  buildRoulettePad();

  // Botones principales
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
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag !== 'input' && activeTag !== 'select' && activeTag !== 'textarea') {
        e.preventDefault();
        handlePadSubmit();
      }
    }
  });

  // Botón submit del pad
  const submitBtn = document.getElementById('submitNumBtn');
  if (submitBtn) submitBtn.addEventListener('click', handlePadSubmit);

  // Simulación
  if (elements.simulationForm) elements.simulationForm.addEventListener('submit', handleSimulationUpload);
  if (elements.simulationFile) elements.simulationFile.addEventListener('change', handleFileChange);
  setupDragAndDrop();

  // Descargar plantilla
  if (elements.downloadTemplateBtn) elements.downloadTemplateBtn.addEventListener('click', downloadTemplate);

  renderSimulationSuggestions();

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