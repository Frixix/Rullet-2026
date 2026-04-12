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
  1: ['rojo', 'rojo', 'negro'], 2: ['negro', 'negro', 'negro'], 3: ['rojo', 'negro', 'rojo'],
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

// ─────────────────────────────────────────────
// CLASE PRINCIPAL
// ─────────────────────────────────────────────
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
    return { mensaje, acierto: false, etapa: falloLetra, esperado, salio: colorReal };
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
        cambio = { tipo: 'acierto', saldo: this.saldoMartingala, proximaApuesta: this.apuestaActual };
      } else if (esFalloE) {
        this.saldoMartingala -= this.apuestaActual;
        this.nivelMartingala++;
        if (this.nivelMartingala >= this.config.nivelesMartingala.length) {
          this.nivelMartingala = this.config.nivelesMartingala.length - 1;
        }
        this.apuestaActual = this.config.nivelesMartingala[this.nivelMartingala];
        cambio = { tipo: 'fallo', saldo: this.saldoMartingala, proximaApuesta: this.apuestaActual, nivel: this.nivelMartingala };
      }
    }

    return cambio;
  }

  recordBalanceStep(previousBalance, martingalaCambio) {
    const open = previousBalance;
    const close = this.saldoMartingala;
    const high = Math.max(open, close);
    const low  = Math.min(open, close);
    const tipo = martingalaCambio?.tipo || null; // 'acierto', 'fallo', o null
    this.balanceTimeline.push({ open, high, low, close, tipo });
    if (this.balanceTimeline.length > 500) this.balanceTimeline.shift();
  }

  getBalanceTimeline() { return this.balanceTimeline; }

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
    const color = this.getColor(numero);
    const previousBalance = this.saldoMartingala;
    const resultado = this.analizarPatron(numero);
    const martingala = this.procesarMartingala(resultado);

    // ← Siempre graba, no solo cuando martingala actúa
    this.recordBalanceStep(previousBalance, martingala);

    const registro = { numero, color, timestamp: new Date().toISOString(), resultado };
    this.historialNumeros.push(registro);
    if (this.historialNumeros.length > 1000) this.historialNumeros.shift();
    this.ultimoResultado = { numero, color, resultado, martingala };
    return { ...this.ultimoResultado, estadisticas: this.getEstadisticas() };
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

    return { total, colores, topNumeros, saldoMartingala: this.saldoMartingala, config: this.config };
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

  // Config pills en el hero (reemplaza al panel de config)
  heroConfigTipoRuleta: document.getElementById('heroConfigTipoRuleta'),
  heroConfigTipoJuego: document.getElementById('heroConfigTipoJuego'),
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
  tipoJuego: document.getElementById('tipoJuego'),

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
// LOG
// ─────────────────────────────────────────────
const logMessage = (text, tone = 'info') => {
  const card = document.createElement('div');
  card.className = 'log-card';
  card.dataset.tone = tone;
  const timestamp = new Date().toLocaleTimeString('es-CO');
  card.innerHTML = `<strong>${timestamp}</strong> — ${text}`;
  const firstChild = elements.logList.firstElementChild;
  if (firstChild && firstChild.classList.contains('placeholder')) firstChild.remove();
  elements.logList.prepend(card);
  if (elements.logList.childElementCount > 8) elements.logList.lastElementChild.remove();
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
    if (file && file.name.endsWith('.txt')) {
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
  const matches = text.match(/-?\d+/g) || [];
  return matches
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= 36);
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
  const state  = chartState.lastState;
  const canvas = elements.balanceCanvas;
  if (!canvas || !render || !state) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const { padLeft, chartWidth, timelineLength } = render;

  if (!timelineLength) { chartState.hoverIndex = null; updateHoverInfo(null); return; }

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
  elements.balanceHigh.textContent = `$${high.toLocaleString('es-CO')}`;
  elements.balanceLow.textContent = `$${low.toLocaleString('es-CO')}`;
  elements.balanceDiff.textContent = `$${(high - low).toLocaleString('es-CO')}`;
  if (elements.balanceCurrent) {
    const current = predictor.saldoMartingala;
    elements.balanceCurrent.textContent = `$${current.toLocaleString('es-CO')}`;
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
  updateZoomLabel(visibleLength);

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

  const timeTicks = Math.min(visibleLength, 8);
  for (let i = 0; i <= timeTicks; i++) {
    const idx = timeTicks === 0 ? 0 : Math.round((visibleLength - 1) * (i / timeTicks));
    const x   = toX(idx);
    ctx.fillStyle    = 'rgba(203,213,255,0.6)';
    ctx.font         = '10px "Space Grotesk", sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText((startIndex + idx + 1).toString(), x, PAD_TOP + chartHeight + 5);
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
    ctx.roundRect(tx, ty, TW, TH, 8);
    ctx.fill(); ctx.stroke();

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = 'rgba(203,213,255,0.6)';
    ctx.font      = '10px "Space Grotesk", sans-serif';
    ctx.fillText(`Tirada #${startIndex + hi + 1}`, tx + 10, ty + 10);

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
// RENDER CONFIG → PILLS DEL HERO
// ─────────────────────────────────────────────
const renderConfig = (config) => {
  if (!config) return;

  // Pills del hero
  if (elements.heroConfigTipoRuleta) elements.heroConfigTipoRuleta.textContent = config.tipoRuleta;
  if (elements.heroConfigTipoJuego)  elements.heroConfigTipoJuego.textContent  = config.tipoJuego;
  if (elements.heroConfigMartingala) elements.heroConfigMartingala.textContent = config.usarMartingala ? 'Activada ✅' : 'Desactivada';
  if (elements.heroConfigModo) {
    elements.heroConfigModo.textContent = config.usarMartingala && config.modoMartingala === 2
      ? 'Escalonada'
      : 'Conteo básico';
  }
  if (elements.heroConfigApuesta) {
    elements.heroConfigApuesta.textContent = `$${Number(config.valorApuestaBase).toLocaleString('es-CO')}`;
  }

  // Sincronizar valores en el form del modal
  if (elements.tipoRuleta) elements.tipoRuleta.value = config.tipoRuleta;
  if (elements.tipoJuego)  elements.tipoJuego.value  = config.tipoJuego;
  if (elements.usarMartingala) elements.usarMartingala.checked = Boolean(config.usarMartingala);
  if (elements.modoMartingala) elements.modoMartingala.value  = config.modoMartingala;
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
  const { colores, total, topNumeros, saldoMartingala: saldo, config } = stats;
  elements.totalTiradas.textContent = total;
  elements.saldoMartingala.textContent = saldo;
  elements.valorApuesta.textContent = `$${config.valorApuestaBase}`;

  const percent = (valor) => (total ? Math.round((valor / total) * 100) : 0);
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

const refreshUI = () => {
  const stats = predictor.getEstadisticas();
  renderStats(stats);
  renderHistory(predictor.historialNumeros);
  renderBalanceChart();
  updateBalanceSummary();
  updateLastSync();
};

const resetSession = () => {
  setHeroLevel('Reiniciando sesión...');
  predictor.resetState();
  saveState();
  renderStats(predictor.getEstadisticas());
  renderHistory(predictor.historialNumeros);
  logMessage('Sesión reiniciada en el cliente', 'success');
  setHeroLevel('Listo con estado limpio');
  updateLastSync();
};

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
const openModal = () => elements.configModal.setAttribute('aria-hidden', 'false');
const closeModal = () => elements.configModal.setAttribute('aria-hidden', 'true');

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

  setHeroLevel('Procesando número...');
  try {
    const payload = predictor.agregarNumero(selectedNumber);
    saveState();
    renderStats(payload.estadisticas);
    renderHistory(predictor.historialNumeros);
    renderBalanceChart();
    updateBalanceSummary();
    logMessage(
      `Número ${selectedNumber} → ${payload.resultado?.mensaje}`,
      payload.resultado?.acierto ? 'success' : 'warn'
    );
    setHeroLevel('Número procesado');
  } catch (error) {
    logMessage('Error al registrar número: ' + error.message, 'error');
    setHeroLevel('Error procesando número');
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

  // Cerrar modal con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
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
  if (elements.zoomRange) {
    elements.zoomRange.addEventListener('input', handleZoomChange);
    elements.zoomRange.value = chartState.windowSize.toString();
  }
  if (elements.balanceCanvas) {
    elements.balanceCanvas.addEventListener('mousemove', handleChartHover);
    elements.balanceCanvas.addEventListener('mouseleave', handleChartLeave);
    elements.balanceCanvas.addEventListener('touchmove', (e) => handleChartHover(e.touches?.[0] || e));
    elements.balanceCanvas.addEventListener('touchstart', (e) => handleChartHover(e.touches?.[0] || e));
    elements.balanceCanvas.addEventListener('touchend', handleChartLeave);
  }

  updateHoverInfo(null);
};

init();