/**
 * Controle de Ponto - Aplicação Principal
 * Funciona 100% offline, compatível com GitHub Pages e celulares.
 */

// ==========================================
// Constantes e Configurações Padrão
// ==========================================

const DEFAULT_SCHEDULE = {
  segunda: { label: 'Segunda', times: ['08:00', '08:15', '08:45', '11:00', '11:30', '17:00', '18:00', '20:00'] },
  terca:   { label: 'Terça',   times: ['08:00', '18:00'] },
  quarta:  { label: 'Quarta',  times: ['08:00', '08:15', '08:45', '11:00', '11:30', '17:00', '18:00', '20:00'] },
  quinta:  { label: 'Quinta',  times: ['08:00', '18:00'] },
  sexta:   { label: 'Sexta',   times: ['08:00', '17:00', '18:00', '19:00'] },
  sabado:  { label: 'Sábado',  times: [] },
  domingo: { label: 'Domingo', times: [] }
};

const DAY_KEYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

const IMAGES = {
  orbAberta: 'assets/batida-aberta.png',
  orbCorreta: 'assets/batida-correta.png',
  orbFaltando: 'assets/batida-faltando.png',
  slotNaoMarcado: 'assets/nao-marcado.png',
  slotMarcado: 'assets/marcado.png'
};

const STORAGE_KEYS = {
  schedule: 'ponto_schedule_v1',
  records: 'ponto_records_v1',
  logs: 'ponto_logs_v1',
  sound: 'ponto_sound_v1'
};

// ==========================================
// Estado da Aplicação
// ==========================================

let schedule = loadSchedule();
let records = loadRecords();
let logs = loadLogs();
let soundEnabled = loadSoundSetting();
let currentViewingDate = new Date();
let pendingUnmark = null;

// ==========================================
// Inicialização
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupModals();
  setupQuickPunch();
  setupSettings();
  setupBackup();
  setupLogs();
  setupLiveClockAndSound();
  setupEditTime();
  renderBoard();
  registerServiceWorker();
});

function loadSoundSetting() {
  const saved = localStorage.getItem(STORAGE_KEYS.sound);
  return saved === null ? true : saved === 'true';
}

function saveSoundSetting(val) {
  soundEnabled = val;
  localStorage.setItem(STORAGE_KEYS.sound, String(val));
}

function setupLiveClockAndSound() {
  // Relógio em tempo real
  const clockElem = document.getElementById('liveClock');
  function tick() {
    if (clockElem) {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      clockElem.textContent = `${h}:${m}:${s}`;
    }
  }
  tick();
  setInterval(tick, 1000);

  // Botão de som
  const btnSound = document.getElementById('btnToggleSound');
  const iconSound = document.getElementById('soundIcon');
  if (btnSound && iconSound) {
    iconSound.textContent = soundEnabled ? '🔊' : '🔇';
    btnSound.addEventListener('click', () => {
      saveSoundSetting(!soundEnabled);
      iconSound.textContent = soundEnabled ? '🔊' : '🔇';
      showToast(soundEnabled ? 'Sons ativados 🔊' : 'Sons silenciados 🔇');
    });
  }
}

function setupEditTime() {
  const btnSave = document.getElementById('btnSaveEditedTime');
  const inputTime = document.getElementById('inputEditTime');
  if (btnSave && inputTime) {
    btnSave.addEventListener('click', () => {
      if (!pendingUnmark) return;
      const newTime = inputTime.value;
      if (!newTime) {
        alert('Por favor informe um horário válido.');
        return;
      }

      const { dateKey, dayLabel, slotTime } = pendingUnmark;
      if (records[dateKey] && records[dateKey][slotTime]) {
        records[dateKey][slotTime].markedAt = newTime;
        saveRecords();
        addLog('ajustado', dateKey, dayLabel, slotTime, newTime);
        showToast(`Horário corrigido para ${newTime} ✏️`);
        renderBoard();
        closeModal('modalConfirmUnmark');
        pendingUnmark = null;
      }
    });
  }
}

// ==========================================
// Armazenamento (LocalStorage)
// ==========================================

function loadSchedule() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.schedule);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Erro ao ler schedule:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
}

function saveSchedule(newSchedule) {
  schedule = newSchedule;
  localStorage.setItem(STORAGE_KEYS.schedule, JSON.stringify(schedule));
}

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.records);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Erro ao ler records:', e);
  }
  return {};
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
}

function loadLogs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.logs);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Erro ao ler logs:', e);
  }
  return [];
}

function saveLogs() {
  localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(logs));
}

function addLog(action, dateKey, dayName, slotTime, actualTime) {
  const now = new Date();
  const entry = {
    id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: now.toISOString(),
    displayDate: formatDateTimeDisplay(now),
    dateKey: dateKey,
    dayName: dayName,
    slotTime: slotTime,
    actualTime: actualTime || formatTimeOnly(now),
    action: action // 'marcado' | 'desmarcado'
  };
  logs.unshift(entry);
  if (logs.length > 1000) logs.pop(); // Limita a 1000 registros
  saveLogs();
}

// ==========================================
// Utilitários de Data e Semana
// ==========================================

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  // Domingo é 0, Segunda é 1...
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDates(referenceDate) {
  const monday = getMonday(referenceDate);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateShort(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

function formatTimeOnly(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDateTimeDisplay(date) {
  const d = formatDateShort(date);
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${d}/${y} ${h}:${m}:${s}`;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function isPastDay(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function isToday(date) {
  return isSameDay(date, new Date());
}

// ==========================================
// Áudio e Feedback Háptico
// ==========================================

let audioCtx = null;

function playTickSound(isSuccess = true) {
  if (!soundEnabled) {
    // Mesmo sem som, mantém vibração leve se disponível
    if ('vibrate' in navigator) {
      try { navigator.vibrate(isSuccess ? [35] : [20, 40, 20]); } catch (e) {}
    }
    return;
  }

  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = isSuccess ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isSuccess ? 880 : 330, audioCtx.currentTime);
    if (isSuccess) {
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.08);
    } else {
      osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.06);
    }

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isSuccess ? 0.1 : 0.08));

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + (isSuccess ? 0.1 : 0.08));
  } catch (e) {
    // Silencioso caso áudio não seja suportado
  }

  // Vibração no celular
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(isSuccess ? [35] : [20, 40, 20]);
    } catch (e) {}
  }
}

// ==========================================
// Renderização do Quadro
// ==========================================

function renderBoard() {
  const weekDates = getWeekDates(currentViewingDate);
  const monday = weekDates[0];
  const friday = weekDates[4];
  const sunday = weekDates[6];

  // Mostra intervalo de datas ex: "10/11 á 16/11"
  const hasWeekend = schedule.sabado.times.length > 0 || schedule.domingo.times.length > 0;
  const lastDay = hasWeekend ? sunday : friday;
  const weekDisplay = document.getElementById('weekDisplay');
  weekDisplay.textContent = `${formatDateShort(monday)}  á  ${formatDateShort(lastDay)}`;

  const daysContainer = document.getElementById('daysContainer');
  daysContainer.innerHTML = '';

  let totalWeekSlots = 0;
  let markedWeekSlots = 0;

  // Renderiza cada dia da semana
  DAY_KEYS.forEach((dayKey, index) => {
    const dayConfig = schedule[dayKey];
    const dateObj = weekDates[index];
    const dateKey = formatDateKey(dateObj);

    // Se for sábado ou domingo sem horários, pula a renderização
    if ((dayKey === 'sabado' || dayKey === 'domingo') && dayConfig.times.length === 0) {
      return;
    }

    const dayRecords = records[dateKey] || {};
    const isFolga = Boolean(dayRecords.__isFolga);
    const totalSlots = dayConfig.times.length;
    let markedCount = 0;

    dayConfig.times.forEach(t => {
      if (dayRecords[t] && dayRecords[t].marked) {
        markedCount++;
      }
    });

    if (!isFolga) {
      totalWeekSlots += totalSlots;
      markedWeekSlots += markedCount;
    }

    // Regra do orbe de status:
    // - Padrão azul: assets/batida-aberta.png
    // - Se marcar todos do dia (ou folga): assets/batida-correta.png
    // - Se terminar o dia sem marcar algum: assets/batida-faltando.png
    let orbSrc = IMAGES.orbAberta;
    let orbTitle = 'Dia em aberto';

    if (isFolga) {
      orbSrc = IMAGES.orbCorreta;
      orbTitle = 'Dia registrado como Folga / Feriado';
    } else if (totalSlots > 0) {
      if (markedCount === totalSlots) {
        orbSrc = IMAGES.orbCorreta;
        orbTitle = 'Todos os pontos foram marcados!';
      } else if (isPastDay(dateObj)) {
        // Se o dia já acabou e faltou marcar algum
        orbSrc = IMAGES.orbFaltando;
        orbTitle = `Dia finalizado com ${totalSlots - markedCount} batida(s) pendente(s).`;
      } else {
        orbSrc = IMAGES.orbAberta;
        orbTitle = `Dia em aberto: ${markedCount} de ${totalSlots} marcados.`;
      }
    }

    // Criação do elemento do dia
    const dayRow = document.createElement('div');
    dayRow.className = 'day-row' + (isToday(dateObj) ? ' is-today' : '') + (isFolga ? ' is-folga' : '');

    // Linha do nome do dia
    const headerLine = document.createElement('div');
    headerLine.className = 'day-header-line';

    const dayName = document.createElement('span');
    dayName.className = 'day-name';
    dayName.textContent = dayConfig.label;

    const dateBadge = document.createElement('span');
    dateBadge.className = 'day-date-badge';
    dateBadge.textContent = formatDateShort(dateObj);

    headerLine.appendChild(dayName);
    headerLine.appendChild(dateBadge);

    // Botão de Folga / Feriado
    const folgaBtn = document.createElement('button');
    folgaBtn.className = 'btn-folga-pill' + (isFolga ? ' active' : '');
    folgaBtn.innerHTML = isFolga ? '🏖️ Folga' : '🏖️';
    folgaBtn.title = isFolga ? 'Clique para desmarcar folga' : 'Marcar este dia como folga/feriado';
    folgaBtn.addEventListener('click', () => {
      toggleFolga(dateKey, dayConfig.label);
    });
    headerLine.appendChild(folgaBtn);

    dayRow.appendChild(headerLine);

    // Linha de controles (Orbe + Botões)
    const controlsLine = document.createElement('div');
    controlsLine.className = 'day-controls';

    // Orbe de status
    const orbWrapper = document.createElement('div');
    orbWrapper.className = 'status-orb-wrapper';
    const orbImg = document.createElement('img');
    orbImg.className = 'status-orb';
    orbImg.src = orbSrc;
    orbImg.alt = orbTitle;
    orbImg.title = `${dayConfig.label} (${formatDateShort(dateObj)}): ${orbTitle}`;
    orbImg.addEventListener('click', () => {
      showToast(`${dayConfig.label}: ${markedCount}/${totalSlots} pontos marcados.`);
    });
    orbWrapper.appendChild(orbImg);
    controlsLine.appendChild(orbWrapper);

    // Container de slots/botões
    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'slots-container';

    if (totalSlots === 0) {
      const emptyNote = document.createElement('span');
      emptyNote.style.color = '#888';
      emptyNote.style.fontSize = '0.8rem';
      emptyNote.style.fontStyle = 'italic';
      emptyNote.textContent = 'Sem horários definidos';
      slotsContainer.appendChild(emptyNote);
    } else {
      dayConfig.times.forEach(timeStr => {
        const isMarked = dayRecords[timeStr] && dayRecords[timeStr].marked;
        const markedAt = (dayRecords[timeStr] && dayRecords[timeStr].markedAt) || '';

        const slotItem = document.createElement('div');
        slotItem.className = 'slot-item';

        const timeLabel = document.createElement('span');
        timeLabel.className = 'slot-time';
        timeLabel.textContent = timeStr;

        const slotBtn = document.createElement('button');
        slotBtn.className = 'slot-btn';
        slotBtn.setAttribute('data-date', dateKey);
        slotBtn.setAttribute('data-day', dayConfig.label);
        slotBtn.setAttribute('data-time', timeStr);
        slotBtn.title = isMarked
          ? `Marcado às ${markedAt || timeStr}. Clique para ajustar/desmarcar.`
          : `Clique para bater o ponto de ${timeStr}`;

        const btnImg = document.createElement('img');
        btnImg.src = isMarked ? IMAGES.slotMarcado : IMAGES.slotNaoMarcado;
        btnImg.alt = isMarked ? 'Marcado' : 'Não Marcado';
        slotBtn.appendChild(btnImg);

        const markedAtLabel = document.createElement('span');
        markedAtLabel.className = 'slot-marked-at';
        markedAtLabel.textContent = isMarked ? (markedAt || '✓') : '';

        // Evento de clique
        slotBtn.addEventListener('click', () => {
          handleSlotClick(dateKey, dayConfig.label, timeStr, isMarked, markedAt);
        });

        slotItem.appendChild(timeLabel);
        slotItem.appendChild(slotBtn);
        slotItem.appendChild(markedAtLabel);
        slotsContainer.appendChild(slotItem);
      });
    }

    controlsLine.appendChild(slotsContainer);
    dayRow.appendChild(controlsLine);
    daysContainer.appendChild(dayRow);
  });

  // Atualiza estatísticas do rodapé
  const statsElem = document.getElementById('weekStats');
  statsElem.textContent = `${markedWeekSlots} de ${totalWeekSlots} pontos marcados`;

  // Atualiza lista de seleção rápida de semanas com registros
  updateRecordedWeeksSelect();
}

// ==========================================
// Interação de Ponto (Bater / Desmarcar)
// ==========================================

function handleSlotClick(dateKey, dayLabel, slotTime, currentlyMarked, markedAt) {
  if (currentlyMarked) {
    // Abrir modal de confirmação para desmarcar ou editar
    pendingUnmark = { dateKey, dayLabel, slotTime, markedAt };
    const modalText = document.getElementById('unmarkModalText');
    const modalInfo = document.getElementById('unmarkModalInfo');
    const inputEditTime = document.getElementById('inputEditTime');

    modalText.textContent = `Ponto de ${dayLabel}`;
    modalInfo.innerHTML = `<strong>Horário previsto:</strong> ${slotTime}<br><strong>Horário registrado:</strong> ${markedAt || 'Sem registro exato'}`;
    
    if (inputEditTime) {
      inputEditTime.value = markedAt || slotTime;
    }
    openModal('modalConfirmUnmark');
  } else {
    // Marcar o ponto
    markSlot(dateKey, dayLabel, slotTime);
  }
}

function markSlot(dateKey, dayLabel, slotTime, customActualTime = null) {
  if (!records[dateKey]) records[dateKey] = {};
  
  const now = new Date();
  const actualTime = customActualTime || formatTimeOnly(now);

  records[dateKey][slotTime] = {
    marked: true,
    timestamp: now.toISOString(),
    markedAt: actualTime
  };
  saveRecords();

  addLog('marcado', dateKey, dayLabel, slotTime, actualTime);
  playTickSound(true);
  showToast(`Ponto de ${slotTime} batido (${actualTime})! ✨`);
  renderBoard();
}

function unmarkSlot(dateKey, dayLabel, slotTime) {
  if (records[dateKey] && records[dateKey][slotTime]) {
    delete records[dateKey][slotTime];
    saveRecords();
    addLog('desmarcado', dateKey, dayLabel, slotTime, formatTimeOnly(new Date()));
    playTickSound(false);
    showToast(`Ponto de ${slotTime} desmarcado.`);
    renderBoard();
  }
}

function toggleFolga(dateKey, dayLabel) {
  if (!records[dateKey]) records[dateKey] = {};
  const current = Boolean(records[dateKey].__isFolga);
  records[dateKey].__isFolga = !current;
  saveRecords();
  addLog(
    !current ? 'folga_marcada' : 'folga_removida',
    dateKey,
    dayLabel,
    'Dia todo',
    formatTimeOnly(new Date())
  );
  showToast(!current ? `Dia marcado como Folga/Feriado 🏖️` : `Folga removida de ${dayLabel}`);
  renderBoard();
}

// ==========================================
// Ação Rápida: Bater Ponto Agora
// ==========================================

function setupQuickPunch() {
  const btn = document.getElementById('btnQuickPunch');
  btn.addEventListener('click', () => {
    const today = new Date();
    const todayKey = formatDateKey(today);
    const dayIndex = today.getDay(); // 0 domingo, 1 segunda...
    const mapKeys = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const currentDayKey = mapKeys[dayIndex];
    const dayConfig = schedule[currentDayKey];

    if (!dayConfig || dayConfig.times.length === 0) {
      showToast('Nenhum horário configurado para hoje!');
      return;
    }

    const todayRecords = records[todayKey] || {};
    // Procura o primeiro horário ainda não marcado
    const nextSlot = dayConfig.times.find(t => !todayRecords[t] || !todayRecords[t].marked);

    if (nextSlot) {
      // Se não estivermos vendo a semana atual, volta para ela
      currentViewingDate = new Date();
      markSlot(todayKey, dayConfig.label, nextSlot);
    } else {
      showToast('Todos os pontos de hoje já foram batidos! 🎉');
    }
  });

  // Confirmação de desmarcação no modal
  document.getElementById('btnConfirmUnmark').addEventListener('click', () => {
    if (pendingUnmark) {
      unmarkSlot(pendingUnmark.dateKey, pendingUnmark.dayLabel, pendingUnmark.slotTime);
      pendingUnmark = null;
      closeModal('modalConfirmUnmark');
    }
  });
}

// ==========================================
// Navegação de Semanas
// ==========================================

function setupNavigation() {
  document.getElementById('btnPrevWeek').addEventListener('click', () => {
    currentViewingDate.setDate(currentViewingDate.getDate() - 7);
    renderBoard();
  });

  document.getElementById('btnNextWeek').addEventListener('click', () => {
    currentViewingDate.setDate(currentViewingDate.getDate() + 7);
    renderBoard();
  });

  document.getElementById('btnCurrentWeek').addEventListener('click', () => {
    currentViewingDate = new Date();
    renderBoard();
  });

  const selectWeeks = document.getElementById('selectRecordedWeeks');
  if (selectWeeks) {
    selectWeeks.addEventListener('change', (e) => {
      const chosenMondayKey = e.target.value;
      if (chosenMondayKey) {
        const parts = chosenMondayKey.split('-');
        currentViewingDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
        renderBoard();
      }
    });
  }
}

function updateRecordedWeeksSelect() {
  const select = document.getElementById('selectRecordedWeeks');
  if (!select) return;

  const recordedDateKeys = Object.keys(records).filter(dateKey => {
    const dayObj = records[dateKey];
    if (!dayObj) return false;
    return Object.values(dayObj).some(slot => slot && slot.marked);
  });

  const weekSet = new Map();

  recordedDateKeys.forEach(dateKey => {
    const parts = dateKey.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const monday = getMonday(d);
      const mondayKey = formatDateKey(monday);
      const daySlots = Object.values(records[dateKey]).filter(s => s && s.marked).length;

      if (!weekSet.has(mondayKey)) {
        const lastDay = new Date(monday);
        lastDay.setDate(monday.getDate() + 6);
        weekSet.set(mondayKey, {
          monday: monday,
          label: `${formatDateShort(monday)} a ${formatDateShort(lastDay)}`,
          count: daySlots
        });
      } else {
        const item = weekSet.get(mondayKey);
        item.count += daySlots;
      }
    }
  });

  const currentMondayKey = formatDateKey(getMonday(currentViewingDate));
  select.innerHTML = '<option value="">📅 Histórico</option>';

  if (weekSet.size === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(Sem semanas salvas)';
    opt.disabled = true;
    select.appendChild(opt);
    return;
  }

  const sortedWeeks = Array.from(weekSet.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  sortedWeeks.forEach(([mKey, data]) => {
    const opt = document.createElement('option');
    opt.value = mKey;
    opt.textContent = `${data.label} (${data.count} pts)`;
    if (mKey === currentMondayKey) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

// ==========================================
// Modais Genéricos
// ==========================================

function setupModals() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      closeModal(modalId);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });
  });

  document.getElementById('btnOpenLogs').addEventListener('click', () => {
    renderLogsTable();
    openModal('modalLogs');
  });

  document.getElementById('btnOpenSettings').addEventListener('click', () => {
    renderSettingsForm();
    openModal('modalSettings');
  });

  document.getElementById('btnOpenBackup').addEventListener('click', () => {
    openModal('modalBackup');
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

// ==========================================
// Histórico de Logs
// ==========================================

function setupLogs() {
  document.getElementById('logFilter').addEventListener('change', renderLogsTable);

  document.getElementById('btnClearLogs').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja apagar todo o histórico de logs? (Os pontos marcados não serão apagados)')) {
      logs = [];
      saveLogs();
      renderLogsTable();
      showToast('Logs apagados.');
    }
  });

  document.getElementById('btnExportLogsCsv').addEventListener('click', exportLogsToCsv);
}

function renderLogsTable() {
  const filter = document.getElementById('logFilter').value;
  const tbody = document.getElementById('logTableBody');
  tbody.innerHTML = '';

  const weekDates = getWeekDates(currentViewingDate);
  const weekDateKeys = new Set(weekDates.map(d => formatDateKey(d)));

  const filteredLogs = logs.filter(entry => {
    if (filter === 'week') {
      return weekDateKeys.has(entry.dateKey);
    }
    return true;
  });

  if (filteredLogs.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4" style="text-align: center; color: #888; padding: 20px;">Nenhum registro encontrado.</td>';
    tbody.appendChild(tr);
    return;
  }

  filteredLogs.forEach(entry => {
    const tr = document.createElement('tr');
    const isMarcado = entry.action === 'marcado';
    tr.innerHTML = `
      <td>${entry.displayDate || entry.timestamp}</td>
      <td><strong>${entry.dayName}</strong> (${formatDateShortFromKey(entry.dateKey)})</td>
      <td>${entry.slotTime} <span style="opacity: 0.7; font-size: 0.75rem;">(às ${entry.actualTime})</span></td>
      <td><span class="badge-action ${isMarcado ? 'marcado' : 'desmarcado'}">${isMarcado ? 'Batido' : 'Removido'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function formatDateShortFromKey(dateKey) {
  if (!dateKey) return '';
  const parts = dateKey.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateKey;
}

function exportLogsToCsv() {
  if (logs.length === 0) {
    showToast('Não há logs para exportar.');
    return;
  }

  let csvContent = '\uFEFFData/Hora Registro;Data do Ponto;Dia;Horario Previsto;Horario Realizado;Acao\n';
  logs.forEach(l => {
    csvContent += `"${l.displayDate || l.timestamp}";"${l.dateKey}";"${l.dayName}";"${l.slotTime}";"${l.actualTime}";"${l.action}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ponto-logs-${formatDateKey(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Download do CSV iniciado!');
}

// ==========================================
// Configuração de Horários
// ==========================================

function setupSettings() {
  document.getElementById('btnSaveSettings').addEventListener('click', saveSettingsFromForm);

  document.getElementById('btnResetSettings').addEventListener('click', () => {
    if (confirm('Deseja restaurar a grade de horários padrão do exemplo?')) {
      saveSchedule(JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)));
      renderSettingsForm();
      renderBoard();
      showToast('Horários restaurados para o padrão.');
    }
  });
}

function renderSettingsForm() {
  const container = document.getElementById('scheduleConfigForm');
  container.innerHTML = '';

  DAY_KEYS.forEach(dayKey => {
    const dayConfig = schedule[dayKey];
    const row = document.createElement('div');
    row.className = 'schedule-row';

    const header = document.createElement('div');
    header.className = 'schedule-row-header';

    const title = document.createElement('span');
    title.className = 'schedule-day-title';
    title.textContent = dayConfig.label;

    header.appendChild(title);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'schedule-input';
    input.id = `input_schedule_${dayKey}`;
    input.value = dayConfig.times.join(', ');
    input.placeholder = 'Ex: 08:00, 12:00, 13:00, 18:00 (vazio para desativar)';

    row.appendChild(header);
    row.appendChild(input);
    container.appendChild(row);
  });
}

function saveSettingsFromForm() {
  const newSchedule = {};

  DAY_KEYS.forEach(dayKey => {
    const input = document.getElementById(`input_schedule_${dayKey}`);
    const rawVal = input ? input.value : '';
    const times = rawVal
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(t => {
        // Validação básica de hora
        if (/^\d{1,2}:\d{2}$/.test(t)) {
          const [h, m] = t.split(':');
          return `${h.padStart(2, '0')}:${m}`;
        }
        return t;
      });

    newSchedule[dayKey] = {
      label: schedule[dayKey].label,
      times: times
    };
  });

  saveSchedule(newSchedule);
  renderBoard();
  closeModal('modalSettings');
  showToast('Horários atualizados com sucesso!');
}

// ==========================================
// Backup, Importação e Exportação
// ==========================================

function setupBackup() {
  document.getElementById('btnDownloadBackup').addEventListener('click', downloadBackup);
  document.getElementById('btnCopyBackup').addEventListener('click', copyBackupToClipboard);

  const fileInput = document.getElementById('fileImportBackup');
  document.getElementById('btnTriggerFileImport').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        applyImportedData(data);
        fileInput.value = '';
      } catch (err) {
        alert('Arquivo inválido! Certifique-se de selecionar um JSON válido.');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btnImportFromText').addEventListener('click', () => {
    const txt = document.getElementById('importTextarea').value.trim();
    if (!txt) {
      alert('Cole o conteúdo JSON na caixa de texto primeiro.');
      return;
    }
    try {
      const data = JSON.parse(txt);
      applyImportedData(data);
      document.getElementById('importTextarea').value = '';
    } catch (e) {
      alert('JSON inválido! Verifique o texto colado.');
    }
  });

  document.getElementById('btnResetAllData').addEventListener('click', () => {
    if (confirm('ATENÇÃO: Isto apagará todos os pontos batidos, logs e configurações salvas no dispositivo. Tem certeza?')) {
      localStorage.clear();
      schedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
      records = {};
      logs = [];
      saveSchedule(schedule);
      saveRecords();
      saveLogs();
      renderBoard();
      closeModal('modalBackup');
      showToast('Todos os dados foram resetados.');
    }
  });
}

function getBackupPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    schedule: schedule,
    records: records,
    logs: logs
  };
}

function downloadBackup() {
  const payload = getBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ponto-backup-${formatDateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup baixado com sucesso!');
}

function copyBackupToClipboard() {
  const payload = getBackupPayload();
  const text = JSON.stringify(payload);
  navigator.clipboard.writeText(text).then(() => {
    showToast('Dados copiados para a área de transferência! 📋');
  }).catch(() => {
    document.getElementById('importTextarea').value = text;
    showToast('Copiado para a caixa de texto abaixo!');
  });
}

function applyImportedData(data) {
  if (!data || typeof data !== 'object') {
    alert('Dados de backup corrompidos.');
    return;
  }

  if (confirm('Deseja restaurar estes dados? Os registros atuais serão mesclados com o backup.')) {
    if (data.schedule) {
      schedule = { ...DEFAULT_SCHEDULE, ...data.schedule };
      saveSchedule(schedule);
    }
    if (data.records) {
      records = { ...records, ...data.records };
      saveRecords();
    }
    if (Array.isArray(data.logs)) {
      // Mescla logs sem duplicar ids
      const existingIds = new Set(logs.map(l => l.id));
      data.logs.forEach(l => {
        if (!existingIds.has(l.id)) logs.push(l);
      });
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      saveLogs();
    }

    renderBoard();
    closeModal('modalBackup');
    showToast('Backup restaurado com sucesso! 🎉');
  }
}

// ==========================================
// Toast Notificação
// ==========================================

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toastMessage');
  toast.textContent = message;
  toast.classList.remove('hidden');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2600);
}

// ==========================================
// PWA & Service Worker
// ==========================================

function registerServiceWorker() {
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').then(() => {
      console.log('PWA ServiceWorker registrado.');
    }).catch(err => {
      console.log('SW falhou:', err);
    });
  }
}
