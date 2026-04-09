const API_URL = 'http://localhost:5000/api';

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
};

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

const updateLastSync = () => {
  const time = new Date().toLocaleTimeString('es-CO');
  elements.lastSync.textContent = `Última actualización: ${time}`;
};

const setHeroLevel = (text) => {
  elements.heroLevel.textContent = text;
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
    topNumeros.slice(0, 5).forEach((item, index) => {
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
  }

  elements.latestMeta.textContent = meta.join(' • ');
};

const fetchStats = async () => {
  try {
    const response = await fetch(`${API_URL}/estadisticas`);
    if (!response.ok) throw new Error('No se pudo obtener estadísticas');
    const stats = await response.json();
    renderStats(stats);
    setHeroLevel('Estadísticas sincronizadas');
    updateLastSync();
    return stats;
  } catch (error) {
    logMessage('Error cargando estadísticas: ' + error.message, 'error');
    setHeroLevel('Error de sincronización');
  }
};

const fetchHistory = async () => {
  try {
    const response = await fetch(`${API_URL}/historial`);
    if (!response.ok) throw new Error('No se pudo obtener historial');
    const historial = await response.json();
    renderHistory(historial);
    return historial;
  } catch (error) {
    logMessage('Error cargando historial: ' + error.message, 'error');
  }
};

const refreshAll = async () => {
  const stats = await fetchStats();
  const historial = await fetchHistory();
  if (stats && historial) {
    logMessage('Datos sincronizados con el backend');
  }
};

const handleNumberSubmit = async (event) => {
  event.preventDefault();
  const value = parseInt(elements.numeroInput.value, 10);
  if (Number.isNaN(value) || value < 0 || value > 36) {
    alert('Ingresa un número válido entre 0 y 36');
    return;
  }

  setHeroLevel('Procesando número...');
  elements.numeroInput.disabled = true;
  try {
    const response = await fetch(`${API_URL}/numero`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: value }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || 'Error del servidor');
    }

    const payload = await response.json();
    lastPayload = payload;
    renderLatestResult(payload);
    renderStats(payload.estadisticas);
    await fetchHistory();
    logMessage(`Número ${value} enviado → ${payload.resultado?.mensaje}`, payload.resultado?.acierto ? 'success' : 'warn');
    setHeroLevel('Número procesado');
  } catch (error) {
    logMessage('Error al enviar número: ' + error.message, 'error');
    setHeroLevel('Error enviando número');
  } finally {
    elements.numeroInput.disabled = false;
    elements.numeroInput.value = '';
  }
};

const handleConfigSubmit = async (event) => {
  event.preventDefault();
  const payload = {
    tipoRuleta: elements.tipoRuleta.value,
    tipoJuego: elements.tipoJuego.value,
    usarMartingala: elements.usarMartingala.checked,
    modoMartingala: Number(elements.modoMartingala.value),
    valorApuestaBase: Number(elements.valorApuestaBase.value) || 1000,
  };

  setHeroLevel('Guardando configuración...');
  try {
    const response = await fetch(`${API_URL}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('No se pudo guardar la configuración');
    }

    const config = await response.json();
    renderConfig(config);
    logMessage('Configuración actualizada');
    closeModal();
  } catch (error) {
    logMessage('Error guardando configuración: ' + error.message, 'error');
  } finally {
    setHeroLevel('Configuración lista');
  }
};

const resetSession = async () => {
  setHeroLevel('Reiniciando sesión...');
  try {
    const response = await fetch(`${API_URL}/reset`, { method: 'POST' });
    if (!response.ok) throw new Error('No se pudo reiniciar');
    await refreshAll();
    elements.latestMessage.textContent = 'Sesión reiniciada. Ingresa un número para reactivar el flujo.';
    elements.latestMeta.textContent = '';
    logMessage('Sesión reiniciada desde el UI', 'success');
  } catch (error) {
    logMessage('Error reiniciando: ' + error.message, 'error');
  }
};

const openModal = () => {
  elements.configModal.setAttribute('aria-hidden', 'false');
};

const closeModal = () => {
  elements.configModal.setAttribute('aria-hidden', 'true');
};

const init = () => {
  refreshAll();
  elements.numberForm.addEventListener('submit', handleNumberSubmit);
  elements.openConfigBtn.addEventListener('click', openModal);
  elements.openInlineConfig.addEventListener('click', openModal);
  elements.closeConfigModal.addEventListener('click', closeModal);
  elements.cancelConfig.addEventListener('click', closeModal);
  elements.resetBtn.addEventListener('click', resetSession);
  elements.configForm.addEventListener('submit', handleConfigSubmit);
  elements.usarMartingala.addEventListener('change', (event) => toggleMartingalaFields(event.target.checked));
};

document.addEventListener('DOMContentLoaded', init);
