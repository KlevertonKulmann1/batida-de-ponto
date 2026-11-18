/**
 * Controle de Ponto - Gerenciamento de Estado e Armazenamento (LocalStorage)
 */

let schedule = loadSchedule();
let records = loadRecords();
let logs = loadLogs();
let soundEnabled = loadSoundSetting();
let redirectUrl = loadRedirectUrl();
let currentViewingDate = new Date();
let pendingUnmark = null;

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

function loadSoundSetting() {
  const saved = localStorage.getItem(STORAGE_KEYS.sound);
  return saved === null ? true : saved === 'true';
}

function saveSoundSetting(val) {
  soundEnabled = val;
  localStorage.setItem(STORAGE_KEYS.sound, String(val));
}

function loadRedirectUrl() {
  return localStorage.getItem(STORAGE_KEYS.redirectUrl) || '';
}

function saveRedirectUrl(url) {
  redirectUrl = url ? url.trim() : '';
  localStorage.setItem(STORAGE_KEYS.redirectUrl, redirectUrl);
}

function loadDailyWorkload() {
  const saved = localStorage.getItem(STORAGE_KEYS.dailyWorkload);
  return saved || '08:48';
}

function saveDailyWorkload(val) {
  let clean = (val || '08:48').trim();
  if (/^\d{1,2}:\d{2}$/.test(clean)) {
    const [h, m] = clean.split(':');
    clean = `${h.padStart(2, '0')}:${m}`;
  } else {
    clean = '08:48';
  }
  localStorage.setItem(STORAGE_KEYS.dailyWorkload, clean);
  return clean;
}

function loadWeeklyWorkload() {
  const saved = localStorage.getItem(STORAGE_KEYS.weeklyWorkload);
  if (saved && /^\d{1,3}:\d{2}$/.test(saved)) {
    return saved;
  }
  // Cálculo padrão inteligente: dias úteis configurados na grade x meta diária
  const daily = loadDailyWorkload();
  const dailyMins = timeToMinutes(daily);
  let workingDays = 0;
  if (typeof schedule === 'object' && schedule) {
    DAY_KEYS.forEach(k => {
      if (schedule[k] && schedule[k].times && schedule[k].times.length > 0) {
        workingDays++;
      }
    });
  }
  if (workingDays === 0) workingDays = 5;
  const totalMins = workingDays * dailyMins;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function saveWeeklyWorkload(val) {
  let clean = (val || '').trim();
  if (/^\d{1,3}:\d{2}$/.test(clean)) {
    const [h, m] = clean.split(':');
    clean = `${h.padStart(2, '0')}:${m}`;
    localStorage.setItem(STORAGE_KEYS.weeklyWorkload, clean);
  } else {
    localStorage.removeItem(STORAGE_KEYS.weeklyWorkload);
  }
  return clean;
}

function loadLunchBreak() {
  const saved = localStorage.getItem(STORAGE_KEYS.lunchBreak);
  return saved || '01:12';
}

function saveLunchBreak(val) {
  let clean = (val || '01:12').trim();
  if (/^\d{1,2}:\d{2}$/.test(clean)) {
    const [h, m] = clean.split(':');
    clean = `${h.padStart(2, '0')}:${m}`;
  } else {
    clean = '01:12';
  }
  localStorage.setItem(STORAGE_KEYS.lunchBreak, clean);
  return clean;
}

function loadLunchWindow() {
  const start = localStorage.getItem(STORAGE_KEYS.lunchStart) || '12:00';
  const end = localStorage.getItem(STORAGE_KEYS.lunchEnd) || '13:12';
  return { start, end };
}

function saveLunchWindow(start, end) {
  let cleanStart = (start || '12:00').trim();
  let cleanEnd = (end || '13:12').trim();

  if (/^\d{1,2}:\d{2}$/.test(cleanStart)) {
    const [h, m] = cleanStart.split(':');
    cleanStart = `${h.padStart(2, '0')}:${m}`;
  } else {
    cleanStart = '12:00';
  }

  if (/^\d{1,2}:\d{2}$/.test(cleanEnd)) {
    const [h, m] = cleanEnd.split(':');
    cleanEnd = `${h.padStart(2, '0')}:${m}`;
  } else {
    cleanEnd = '13:12';
  }

  localStorage.setItem(STORAGE_KEYS.lunchStart, cleanStart);
  localStorage.setItem(STORAGE_KEYS.lunchEnd, cleanEnd);

  // Calcula a duração em minutos e sincroniza com loadLunchBreak
  const startMins = timeToMinutes(cleanStart);
  const endMins = timeToMinutes(cleanEnd);
  let durMins = endMins - startMins;
  if (durMins <= 0) durMins = 72;
  const durH = String(Math.floor(durMins / 60)).padStart(2, '0');
  const durM = String(durMins % 60).padStart(2, '0');
  saveLunchBreak(`${durH}:${durM}`);

  return { start: cleanStart, end: cleanEnd, durationMins: durMins };
}

function loadPushWorkerUrl() {
  return localStorage.getItem(STORAGE_KEYS.pushWorkerUrl) || '';
}

function savePushWorkerUrl(url) {
  localStorage.setItem(STORAGE_KEYS.pushWorkerUrl, (url || '').trim());
}

