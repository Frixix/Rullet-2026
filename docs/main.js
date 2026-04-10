const STORAGE_KEY = 'ruletaPredictorState';
const DEFAULT_LATEST_MESSAGE = 'Ningún número registrado aún.';

const RULETA_COLORES = {
  0: 'verde',
  1: 'rojo', 2: 'negro', 3: 'rojo', 4: 'negro', 5: 'rojo', 6: 'negro',
  7: 'rojo', 8: 'negro', 9: 'rojo', 10: 'negro', 11: 'negro', 12: 'rojo',
  13: 'negro', 14: 'rojo', 15: 'negro', 16: 'rojo', 17: 'negro', 18: 'rojo',
  19: 'rojo', 20: 'negro', 21: 'rojo', 22: 'negro', 23: 'rojo', 24: 'negro',
  25: 'rojo', 26: 'negro', 27: 'rojo', 28: 'negro', 29: 'negro', 30: 'rojo',
  31: 'negro', 32: 'rojo', 33: 'negro', 34: 'rojo', 35: 'negro', 36: 'rojo'
};

const PATRON_COLORES = {
  0: ['verde', 'verde', 'verde'],
  1: ['rojo', 'rojo', 'negro'], 2: ['rojo', 'rojo', 'rojo'], 3: ['rojo', 'negro', 'rojo'],
  4: ['negro', 'negro', 'negro'], 5: ['rojo', 'negro', 'rojo'], 6: ['negro', 'negro', 'negro'],
  7: ['rojo', 'negro', 'rojo'], 8: ['negro', 'negro', 'rojo'], 9: ['rojo', 'negro', 'rojo'],
  10: ['negro', 'negro', 'rojo'], 11: ['negro', 'negro', 'rojo'], 12: ['rojo', 'rojo', 'negro'],
  13: ['negro', 'rojo', 'negro'], 14: ['rojo', 'rojo', 'negro'], 15: ['negro', 'rojo', 'rojo'],
  16: ['rojo', 'negro', 'rojo'], 17: ['negro', 'rojo', 'negro'], 18: ['rojo', 'negro', 'rojo'],
  19: ['rojo', 'negro', 'rojo'], 20: ['negro', 'rojo', 'rojo'], 21: ['rojo', 'rojo', 'rojo'],
  22: ['negro', 'rojo', 'rojo'], 23: ['rojo', 'negro', 'rojo'], 24: ['negro', 'rojo', 'negro'],
  25: ['rojo', 'negro', 'rojo'], 26: ['negro', 'negro', 'rojo'], 27: ['rojo', 'rojo', 'negro'],
  28: ['negro', 'negro', 'rojo'], 29: ['negro', 'negro', 'rojo'], 30: ['rojo', 'negro', 'rojo'],
  31: ['negro', 'rojo', 'rojo'], 32: ['rojo', 'negro', 'rojo'], 33: ['negro', 'negro', 'rojo'],
  34: ['rojo', 'rojo', 'rojo'], 35: ['negro', 'negro', 'negro'], 36: ['rojo', 'rojo', 'rojo']
};

class RuletaPredictor {
  constructor() {
    this.resetState();
  }

  getDefaultConfig() {
    return {
      tipoRuleta: 'Física',
      tipoJuego: 'Contra humanos',
      usarMartingala: false,
      modoMartingala: 1,
      valorApuestaBase: 1000,
      nivelesMartingala: [500, 1000, 2000, 4000, 8000, 16000]
    };
  }

  resetState() {
    const config = this.getDefaultConfig();
    this.historialNumeros = [];
    this.patronActivo = false;
    this.patronActual = [];
    this.etapaActual = 0;
    this.config = { ...config };
    this.saldoMartingala = 0;
    this.nivelMartingala = 0;
    this.apuestaActual = config.valorApuestaBase;
    this.ultimoResultado = null;
    this.balanceTimeline = [];
  }

  loadState(state) {
    if (!state) return;
    this.historialNumeros = Array.isArray(state.historialNumeros) ? state.historialNumeros : [];
    this.patronActivo = state.patronActivo ?? false;
    this.patronActual = Array.isArray(state.patronActual) ? state.patronActual : [];
    this.etapaActual = state.etapaActual ?? 0;
    this.config = { ...this.getDefaultConfig(), ...state.config };
    this.saldoMartingala = state.saldoMartingala ?? 0;
    this.nivelMartingala = state.nivelMartingala ?? 0;
    this.apuestaActual =
      typeof state.apuestaActual === 'number' ? state.apuestaActual : this.config.valorApuestaBase;
    this.ultimoResultado = state.ultimoResultado || null;
    this.balanceTimeline = Array.isArray(state.balanceTimeline) ? state.balanceTimeline : [];
  }

  serializeState() {
    return {
      historialNumeros: this.historialNumeros,
      patronActivo: this.patronActivo,
      patronActual: this.patronActual,
      etapaActual: this.etapaActual,
      config: this.config,
      saldoMartingala: this.saldoMartingala,
      nivelMartingala: this.nivelMartingala,
      apuestaActual: this.apuestaActual,
      ultimoResultado: this.ultimoResultado,
      balanceTimeline: this.balanceTimeline
    };
  }

  getColor(numero) {
    return RULETA_COLORES[numero] || 'desconocido';
  }

  analizarPatron(numero) {
    if (numero === 0) {
      this.patronActivo = false;
      this.patronActual = [];
      this.etapaActual = 0;
      return { mensaje: 'Cayó 0. El patrón se reinicia automáticamente.', acierto: null };
    }

    const colorReal = this.getColor(numero);

    if (!PATRON_COLORES[numero]) {
      this.patronActivo = false;
      this.patronActual = [];
      this.etapaActual = 0;
      return { mensaje: `Número ${numero} sin patrón definido. Se reinicia.`, acierto: null };
    }

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
          etapa: 'C',
          siguienteEsperado: this.patronActual[this.etapaActual]
        };
      }

      this.patronActivo = false;
      this.patronActual = [];
      this.etapaActual = 0;
      return {
        mensaje: `Patrón activado con número ${numero}. Fallo en etapa C. Se reinicia.`,
        acierto: false,
        etapa: 'C'
      };
    }

    if (this.etapaActual >= 3) {
      this.patronActivo = false;
      this.patronActual = [];
      this.etapaActual = 0;
      return { mensaje: 'El patrón ya había finalizado. Se reinicia.', acierto: null };
    }

    const esperado = this.patronActual[this.etapaActual];
    const letras = ['C', 'D', 'E'];

    if (colorReal === esperado) {
      this.etapaActual++;
      if (this.etapaActual === 3) {
        this.patronActivo = false;
        this.patronActual = [];
        this.etapaActual = 0;
        return {
          mensaje: '✅ Acierto en etapa E. ¡Patrón completo exitoso! Se reinicia.',
          acierto: true,
          etapa: 'E',
          completo: true
        };
      }
      return {
        mensaje: `✅ Acierto en etapa ${letras[this.etapaActual - 1]}. Próximo color esperado: ${this.patronActual[this.etapaActual]} (etapa ${letras[this.etapaActual]})`,
        acierto: true,
        etapa: letras[this.etapaActual - 1],
        siguienteEsperado: this.patronActual[this.etapaActual]
      };
    }

    const falloLetra = letras[this.etapaActual];
    const mensaje = `❌ Fallo en etapa ${falloLetra}. Color esperado: ${esperado}. Salió: ${colorReal}. Se reinicia.`;
    this.patronActivo = false;
    this.patronActual = [];
    this.etapaActual = 0;
    return {
      mensaje,
      acierto: false,
      etapa: falloLetra,
      esperado,
      salio: colorReal
    };
  }

  procesarMartingala(resultado) {
    if (!this.config.usarMartingala) return null;

    const modo = this.config.modoMartingala;
    const esAciertoE = resultado?.acierto === true && resultado?.etapa === 'E';
    const esFalloE = resultado?.acierto === false && resultado?.etapa === 'E';

    let cambio = null;

    if (modo === 1) {
      if (esAciertoE) {
        this.saldoMartingala += 1;
        cambio = { tipo: 'acierto', saldo: this.saldoMartingala };
      } else if (esFalloE) {
        this.saldoMartingala -= 1;
        cambio = { tipo: 'fallo', saldo: this.saldoMartingala };
      }
    } else {
      if (esAciertoE) {
        this.saldoMartingala += this.apuestaActual;
        this.nivelMartingala = 0;
        this.apuestaActual = this.config.nivelesMartingala[this.nivelMartingala];
        cambio = {
          tipo: 'acierto',
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
          tipo: 'fallo',
          saldo: this.saldoMartingala,
          proximaApuesta: this.apuestaActual,
          nivel: this.nivelMartingala
        };
      }
    }

    return cambio;
  }

  recordBalanceStep(previousBalance) {
    const open = previousBalance;
    const close = this.saldoMartingala;
    const high = Math.max(open, close);
    const low = Math.min(open, close);
    this.balanceTimeline.push({ open, high, low, close });
    if (this.balanceTimeline.length > 200) {
      this.balanceTimeline.shift();
    }
  }

  getBalanceTimeline() {
    return this.balanceTimeline;
  }

  getBalanceExtremes() {
    if (!this.balanceTimeline.length) {
      return { high: 0, low: 0 };
    }
    let high = -Infinity;
    let low = Infinity;
    this.balanceTimeline.forEach((entry) => {
      if (entry.high > high) high = entry.high;
      if (entry.low < low) low = entry.low;
    });
    return { high, low };
  }

  agregarNumero(numero) {
    const color = this.getColor(numero);
    const previousBalance = this.saldoMartingala;
    const resultado = this.analizarPatron(numero);
    const martingala = this.procesarMartingala(resultado);
    this.recordBalanceStep(previousBalance);
    
    const registro = {
      numero,
      color,
      timestamp: new Date().toISOString(),
      resultado
    };

    this.historialNumeros.push(registro);
    this.ultimoResultado = { numero, color, resultado, martingala };

    return {
      ...this.ultimoResultado,
      estadisticas: this.getEstadisticas()
    };
  }

  getEstadisticas() {
    const total = this.historialNumeros.length;
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

const predictor = new RuletaPredictor();

const elements = {
  numeroInput: document.getElementById('numeroInput'),
  numberForm: document.getElementById('numberForm'),
  latestMessage: document.getElementById('latestMessage'),
  latestMeta: document.getElementById('latestMeta'),
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
  configTipoRuleta: document.getElementById('configTipoRuleta'),
  configTipoJuego: document.getElementById('configTipoJuego'),
  configMartingala: document.getElementById('configMartingala'),
  configModo: document.getElementById('configModo'),
  configApuesta: document.getElementById('configApuesta'),
  configSummary: document.getElementById('configSummary'),
  openConfigBtn: document.getElementById('openConfigBtn'),
  openInlineConfig: document.getElementById('openInlineConfig'),
  resetBtn: document.getElementById('resetBtn'),
  configModal: document.getElementById('configModal'),
  closeConfigModal: document.getElementById('closeConfigModal'),
  cancelConfig: document.getElementById('cancelConfig'),
  configForm: document.getElementById('configForm'),
  usarMartingala: document.getElementById('usarMartingala'),
  martingalaDetails: document.querySelector('[data-martingala-details]'),
  modoMartingala: document.getElementById('modoMartingala'),
  valorApuestaBase: document.getElementById('valorApuestaBase'),
  tipoRuleta: document.getElementById('tipoRuleta'),
  tipoJuego: document.getElementById('tipoJuego'),
  balanceCanvas: document.getElementById('balanceCanvas'),
  balanceHigh: document.getElementById('balanceHigh'),
  balanceLow: document.getElementById('balanceLow'),
  balanceDiff: document.getElementById('balanceDiff'),
  balanceCurrent: document.getElementById('balanceCurrent'),
  zoomRange: document.getElementById('zoomRange'),
  zoomValue: document.getElementById('zoomValue'),
  hoverLaunch: document.getElementById('hoverLaunch'),
  hoverSaldo: document.getElementById('hoverSaldo')
};
elements.simulationForm = document.getElementById('simulationForm');
elements.simulationFile = document.getElementById('simulationFile');
elements.suggestionsList = document.getElementById('suggestionsList');

let lastPayload = null;

const logMessage = (text, tone = 'info') => {
  const card = document.createElement('div');
  card.className = 'log-card';
  card.dataset.tone = tone;
  const timestamp = new Date().toLocaleTimeString('es-CO');
  card.innerHTML = `<strong>${timestamp}</strong> — ${text}`;
  const firstChild = elements.logList.firstElementChild;
  if (firstChild && firstChild.classList.contains('placeholder')) {
    firstChild.remove();
  }
  elements.logList.prepend(card);
  if (elements.logList.childElementCount > 6) {
    elements.logList.lastElementChild.remove();
  }
};

const parseNumbersFromText = (text) => {
  const matches = text.match(/-?\d+/g) || [];
  return matches
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 36);
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

const chartState = {
  windowSize: Number(elements.zoomRange?.value) || 60,
  hoverIndex: null,
  lastRender: null,
  lastState: null
};

const updateZoomLabel = (value) => {
  if (elements.zoomValue) {
    elements.zoomValue.textContent = value.toString();
  }
};

const updateHoverInfo = (entry, absoluteIndex = null) => {
  if (!elements.hoverLaunch || !elements.hoverSaldo) return;
  if (!entry) {
    elements.hoverLaunch.textContent = 'Lanzamiento: —';
    elements.hoverSaldo.textContent = 'Saldo actual: —';
    return;
  }
  elements.hoverLaunch.textContent = `Lanzamiento: ${absoluteIndex ?? '—'}`;
  elements.hoverSaldo.textContent = `Saldo actual: $${entry.close.toLocaleString('es-CO')}`;
};

const handleZoomChange = () => {
  if (!elements.zoomRange) return;
  chartState.windowSize = Number(elements.zoomRange.value) || 60;
  renderBalanceChart();
};

const handleChartHover = (event) => {
  const render = chartState.lastRender;
  const state = chartState.lastState;
  const canvas = elements.balanceCanvas;
  if (!canvas || !render || !state) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(render.width, event.clientX - rect.left));
  const { padding, chartWidth, timelineLength } = render;
  if (!timelineLength) {
    chartState.hoverIndex = null;
    updateHoverInfo(null);
    return;
  }
  const relativeX = Math.max(0, Math.min(chartWidth, x - padding));
  const index =
    timelineLength > 1
      ? Math.round((relativeX / chartWidth) * (timelineLength - 1))
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
  elements.balanceHigh.textContent = `$${high.toLocaleString('es-CO')}`;
  elements.balanceLow.textContent = `$${low.toLocaleString('es-CO')}`;
  elements.balanceDiff.textContent = `$${(high - low).toLocaleString('es-CO')}`;
  if (elements.balanceCurrent) {
    const current = predictor.saldoMartingala;
    elements.balanceCurrent.textContent = `$${current.toLocaleString('es-CO')}`;
    elements.balanceCurrent.style.color =
      current >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
  }
};

const renderBalanceChart = () => {
  const canvas = elements.balanceCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width;
  const height = rect.height;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const timeline = predictor.getBalanceTimeline();
  const effectiveWindow = Math.max(
    Math.min(chartState.windowSize, Math.max(5, timeline.length)),
    5
  );
  const startIndex = Math.max(0, timeline.length - effectiveWindow);
  const visibleTimeline = timeline.slice(startIndex);
  const visibleLength = visibleTimeline.length;
  if (!visibleLength) {
    chartState.hoverIndex = null;
  } else {
    chartState.hoverIndex = Math.min(
      Math.max(chartState.hoverIndex ?? 0, 0),
      visibleLength - 1
    );
  }
  chartState.lastState = { timeline: visibleTimeline, startIndex };
  chartState.lastRender = {
    width,
    height,
    padding: 16,
    chartWidth: width - 32,
    chartHeight: height - 32,
    timelineLength: visibleLength
  };
  updateZoomLabel(visibleLength);

  if (!visibleLength) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '13px "Space Grotesk", sans-serif';
    ctx.fillText('Carga tiradas para ver el saldo en acción', 16, height / 2);
    return;
  }

  const highs = visibleTimeline.map((entry) => entry.high);
  const lows = visibleTimeline.map((entry) => entry.low);
  const maxValue = Math.max(...highs, 0);
  const minValue = Math.min(...lows, 0);
  const valueRange = Math.max(1, maxValue - minValue);
  const { padding, chartWidth, chartHeight } = chartState.lastRender;
  const stepX = visibleLength > 1 ? chartWidth / (visibleLength - 1) : chartWidth;
  const candleWidth = Math.min(18, Math.max(6, stepX * 0.6));

  ctx.fillStyle = 'rgba(3, 3, 3, 0.65)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  const priceTicks = 5;
  for (let i = 0; i <= priceTicks; i++) {
    const y = padding + (chartHeight / priceTicks) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    const value = maxValue - (valueRange / priceTicks) * i;
    ctx.fillStyle = '#cfd2e9';
    ctx.font = '11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`$${Math.round(value)}`, padding - 10, y);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Lanzamientos', width / 2, height - 14);

  const timeTicks = Math.min(visibleLength, 6);
  for (let i = 0; i <= timeTicks; i++) {
    const idx = timeTicks === 0 ? 0 : Math.round((visibleLength - 1) * (i / timeTicks));
    const x = padding + idx * (visibleLength === 1 ? stepX : stepX);
    ctx.beginPath();
    ctx.moveTo(x, height - padding);
    ctx.lineTo(x, height - padding + 6);
    ctx.stroke();
    const label = startIndex + idx + 1;
    ctx.fillStyle = '#cfd2e9';
    ctx.font = '11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label.toString(), x, height - padding + 8);
  }

  const currentBalance = predictor.saldoMartingala;
  const showZeroLine = minValue <= 0 && maxValue >= 0;
  if (showZeroLine) {
    const yZero =
      padding + chartHeight - ((0 - minValue) / valueRange) * chartHeight;
    ctx.strokeStyle =
      currentBalance >= 0 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, yZero);
    ctx.lineTo(width - padding, yZero);
    ctx.stroke();
  }

  visibleTimeline.forEach((entry, index) => {
    const x =
      padding +
      (visibleLength === 1 ? chartWidth / 2 : Math.min(chartWidth, index * stepX));
    const yHigh =
      padding + chartHeight - ((entry.high - minValue) / valueRange) * chartHeight;
    const yLow =
      padding + chartHeight - ((entry.low - minValue) / valueRange) * chartHeight;
    const yOpen =
      padding + chartHeight - ((entry.open - minValue) / valueRange) * chartHeight;
    const yClose =
      padding + chartHeight - ((entry.close - minValue) / valueRange) * chartHeight;
    const positive = entry.close >= entry.open;
    const color = positive ? '#22c55e' : '#ef4444';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(3, Math.abs(yClose - yOpen));
    ctx.fillStyle = positive ? 'rgba(34, 149, 86, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    ctx.strokeRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

    if (chartState.hoverIndex === index) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding, bodyTop);
      ctx.lineTo(width - padding, bodyTop);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  const hoverEntry =
    chartState.hoverIndex !== null && visibleLength
      ? visibleTimeline[chartState.hoverIndex]
      : null;
  if (hoverEntry) {
    const yHover =
      padding +
      chartHeight -
      ((hoverEntry.close - minValue) / valueRange) * chartHeight;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, yHover);
    ctx.lineTo(width - padding, yHover);
    ctx.stroke();
    ctx.setLineDash([]);
  }
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
    logMessage(
      `Simulación cargada (${parsedNumbers.length} números). Revisa el historial y el saldo.`,
      'success'
    );
    setHeroLevel('Simulación aplicada');
    elements.simulationFile.value = '';
  };
  reader.onerror = () => {
    logMessage('No se pudo leer el archivo seleccionado.', 'error');
    setHeroLevel('Error leyendo archivo');
  };
  reader.readAsText(file);
};

const updateLastSync = () => {
  const time = new Date().toLocaleTimeString('es-CO');
  elements.lastSync.textContent = `Última actualización: ${time}`;
};

const setHeroLevel = (text) => {
  elements.heroLevel.textContent = text;
};

const saveState = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(predictor.serializeState()));
  } catch (error) {
    console.warn('No se pudo guardar el estado localmente', error);
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

const renderConfig = (config) => {
  if (!config) return;
  elements.configTipoRuleta.textContent = config.tipoRuleta;
  elements.configTipoJuego.textContent = config.tipoJuego;
  elements.configMartingala.textContent = config.usarMartingala ? 'Activada' : 'Desactivada';
  elements.configModo.textContent =
    config.usarMartingala && config.modoMartingala === 2
      ? 'Escalonada'
      : 'Conteo básico';
  elements.configApuesta.textContent = `$${config.valorApuestaBase}`;

  elements.configSummary.innerHTML = `
    <p class="result-card__message">
      ${config.usarMartingala ? 'Martingala lista para operar.' : 'Martingala pausada.'}
    </p>
    <p class="result-card__meta">
      ${config.tipoRuleta} • ${config.tipoJuego}
    </p>
  `;

  elements.tipoRuleta.value = config.tipoRuleta;
  elements.tipoJuego.value = config.tipoJuego;
  elements.usarMartingala.checked = Boolean(config.usarMartingala);
  elements.modoMartingala.value = config.modoMartingala;
  elements.valorApuestaBase.value = config.valorApuestaBase;
  toggleMartingalaFields(config.usarMartingala);
};

const toggleMartingalaFields = (show) => {
  elements.martingalaDetails.style.display = show ? 'flex' : 'none';
};

const renderStats = (stats) => {
  if (!stats) return;
  const { colores, total, topNumeros, saldoMartingala: saldo, config } = stats;
  elements.totalTiradas.textContent = total;
  elements.saldoMartingala.textContent = saldo;
  elements.valorApuesta.textContent = `$${config.valorApuestaBase}`;

  const percent = (valor) => (total ? Math.round((valor / total) * 100) : 0);

  elements.barRojo.style.width = `${percent(colores.rojo)}%`;
  elements.barNegro.style.width = `${percent(colores.negro)}%`;
  elements.barVerde.style.width = `${percent(colores.verde)}%`;
  elements.labelRojo.textContent = `${percent(colores.rojo)}%`;
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
    const time = new Date(item.timestamp).toLocaleTimeString('es-CO');
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

const renderLatestResult = (payload) => {
  if (!payload) return;
  const { numero, color, resultado, martingala } = payload;
  const message = resultado?.mensaje || 'Respuesta procesada.';
  elements.latestMessage.textContent = message;

  const meta = [];
  if (numero !== undefined) meta.push(`Número: ${numero}`);
  if (color) meta.push(`Color: ${color}`);
  if (resultado?.etapa) meta.push(`Etapa: ${resultado.etapa}`);
  if (martingala) {
    meta.push(`Saldo Martingala: ${martingala.saldo ?? elements.saldoMartingala.textContent}`);
    if (martingala.proximaApuesta) {
      meta.push(`Próxima apuesta: ${martingala.proximaApuesta}`);
    }
  } else {
    meta.push(`Saldo Martingala: ${predictor.saldoMartingala}`);
  }

  elements.latestMeta.textContent = meta.join(' • ');
};

const refreshUI = () => {
  const stats = predictor.getEstadisticas();
  renderStats(stats);
  renderHistory(predictor.historialNumeros);
  renderBalanceChart();
  updateBalanceSummary();
  const payload = predictor.ultimoResultado;
  if (payload) {
    renderLatestResult(payload);
  } else {
    elements.latestMessage.textContent = DEFAULT_LATEST_MESSAGE;
    elements.latestMeta.textContent = '';
  }
  updateLastSync();
};

const handleNumberSubmit = (event) => {
  event.preventDefault();
  const value = parseInt(elements.numeroInput.value, 10);
  if (Number.isNaN(value) || value < 0 || value > 36) {
    alert('Ingresa un número válido entre 0 y 36');
    return;
  }

  setHeroLevel('Procesando número...');
  elements.numeroInput.disabled = true;
  try {
    const payload = predictor.agregarNumero(value);
    lastPayload = payload;
    saveState();
    renderLatestResult(payload);
    renderStats(payload.estadisticas);
    renderHistory(predictor.historialNumeros);
    logMessage(
      `Número ${value} registrado → ${payload.resultado?.mensaje}`,
      payload.resultado?.acierto ? 'success' : 'warn'
    );
    setHeroLevel('Número procesado');
  } catch (error) {
    logMessage('Error al registrar número: ' + error.message, 'error');
    setHeroLevel('Error procesando número');
  } finally {
    elements.numeroInput.disabled = false;
    elements.numeroInput.value = '';
    updateLastSync();
  }
};

const handleConfigSubmit = (event) => {
  event.preventDefault();
  const payload = {
    tipoRuleta: elements.tipoRuleta.value,
    tipoJuego: elements.tipoJuego.value,
    usarMartingala: elements.usarMartingala.checked,
    modoMartingala: Number(elements.modoMartingala.value),
    valorApuestaBase: Number(elements.valorApuestaBase.value) || 1000
  };

  setHeroLevel('Guardando configuración...');
  try {
    const config = predictor.actualizarConfig(payload);
    saveState();
    renderConfig(config);
    renderStats(predictor.getEstadisticas());
    logMessage('Configuración actualizada localmente', 'success');
    closeModal();
  } catch (error) {
    logMessage('Error guardando configuración: ' + error.message, 'error');
  } finally {
    setHeroLevel('Configuración lista');
    updateLastSync();
  }
};

const resetSession = () => {
  setHeroLevel('Reiniciando sesión...');
  predictor.resetState();
  saveState();
  renderStats(predictor.getEstadisticas());
  renderHistory(predictor.historialNumeros);
  elements.latestMessage.textContent = 'Sesión reiniciada. Ingresa un número para reactivar el flujo.';
  elements.latestMeta.textContent = '';
  logMessage('Sesión reiniciada en el cliente', 'success');
  setHeroLevel('Listo con estado limpio');
  updateLastSync();
};

const openModal = () => {
  elements.configModal.setAttribute('aria-hidden', 'false');
};

const closeModal = () => {
  elements.configModal.setAttribute('aria-hidden', 'true');
};

const init = () => {
  loadState();
  const statusMessage = predictor.historialNumeros.length
    ? 'Estado restaurado desde almacenamiento local'
    : 'Flujo en blanco: empieza registrando un número';
  logMessage(statusMessage, 'info');
  refreshUI();
  elements.numberForm.addEventListener('submit', handleNumberSubmit);
  elements.openConfigBtn.addEventListener('click', openModal);
  elements.openInlineConfig.addEventListener('click', openModal);
  elements.closeConfigModal.addEventListener('click', closeModal);
  elements.cancelConfig.addEventListener('click', closeModal);
  elements.resetBtn.addEventListener('click', resetSession);
  elements.configForm.addEventListener('submit', handleConfigSubmit);
  elements.usarMartingala.addEventListener('change', (event) => toggleMartingalaFields(event.target.checked));
  if (elements.simulationForm) {
    elements.simulationForm.addEventListener('submit', handleSimulationUpload);
  }
  renderSimulationSuggestions();
  window.addEventListener('resize', renderBalanceChart);
  if (elements.zoomRange) {
    elements.zoomRange.addEventListener('input', handleZoomChange);
    elements.zoomRange.value = chartState.windowSize.toString();
  }
  if (elements.balanceCanvas) {
    elements.balanceCanvas.addEventListener('mousemove', handleChartHover);
    elements.balanceCanvas.addEventListener('mouseleave', handleChartLeave);
    elements.balanceCanvas.addEventListener('touchmove', (event) => {
      handleChartHover(event.touches?.[0] || event);
    });
    elements.balanceCanvas.addEventListener('touchstart', (event) => {
      handleChartHover(event.touches?.[0] || event);
    });
    elements.balanceCanvas.addEventListener('touchend', handleChartLeave);
  }
  updateHoverInfo(null);
};

document.addEventListener('DOMContentLoaded', init);
