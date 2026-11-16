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

function loadPushWorkerUrl() {
  return localStorage.getItem(STORAGE_KEYS.pushWorkerUrl) || '';
}

function savePushWorkerUrl(url) {
  localStorage.setItem(STORAGE_KEYS.pushWorkerUrl, (url || '').trim());
}

