/**
 * Controle de Ponto - Configurações de Horários, Carga Horária e Almoço
 */

function setupSettings() {
  const btnSave = document.getElementById('btnSaveSettings');
  if (btnSave) {
    btnSave.addEventListener('click', saveSettingsFromForm);
  }

  const btnReset = document.getElementById('btnResetSettings');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Deseja restaurar a grade de horários padrão do exemplo?')) {
        saveSchedule(JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)));
        saveLunchWindow('12:00', '13:12');
        renderSettingsForm();
        renderBoard();
        showToast('Horários restaurados para o padrão.');
      }
    });
  }

  // Monitora alterações nos horários de almoço para atualizar o badge dinamicamente
  const startInput = document.getElementById('inputLunchStart');
  const endInput = document.getElementById('inputLunchEnd');
  if (startInput) startInput.addEventListener('input', updateLunchBadge);
  if (endInput) endInput.addEventListener('input', updateLunchBadge);
}

function updateLunchBadge() {
  const badge = document.getElementById('lunchDurationBadge');
  const startInput = document.getElementById('inputLunchStart');
  const endInput = document.getElementById('inputLunchEnd');
  if (!badge || !startInput || !endInput) return;

  const startVal = startInput.value.trim();
  const endVal = endInput.value.trim();

  if (/^\d{1,2}:\d{2}$/.test(startVal) && /^\d{1,2}:\d{2}$/.test(endVal)) {
    const sM = timeToMinutes(startVal);
    const eM = timeToMinutes(endVal);
    const diff = eM - sM;
    if (diff > 0) {
      const h = String(Math.floor(diff / 60)).padStart(2, '0');
      const m = String(diff % 60).padStart(2, '0');
      badge.textContent = `(${h}h${m}m)`;
      badge.style.color = 'var(--accent-gold)';
      return;
    }
  }
  badge.textContent = `(Inválido)`;
  badge.style.color = '#ff6b6b';
}

function renderSettingsForm() {
  const urlInput = document.getElementById('inputExternalPunchUrl');
  if (urlInput) {
    urlInput.value = redirectUrl || '';
  }

  const workloadInput = document.getElementById('inputDailyWorkload');
  if (workloadInput) {
    workloadInput.value = loadDailyWorkload();
  }

  const lunchWin = loadLunchWindow();
  const startInput = document.getElementById('inputLunchStart');
  const endInput = document.getElementById('inputLunchEnd');
  if (startInput) startInput.value = lunchWin.start;
  if (endInput) endInput.value = lunchWin.end;
  updateLunchBadge();

  const container = document.getElementById('scheduleConfigForm');
  if (!container) return;
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
  const urlInput = document.getElementById('inputExternalPunchUrl');
  if (urlInput) {
    saveRedirectUrl(urlInput.value);
  }

  const workloadInput = document.getElementById('inputDailyWorkload');
  if (workloadInput) {
    saveDailyWorkload(workloadInput.value);
  }

  const startInput = document.getElementById('inputLunchStart');
  const endInput = document.getElementById('inputLunchEnd');
  if (startInput && endInput) {
    saveLunchWindow(startInput.value, endInput.value);
  }

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
  syncScheduleWithWorker(newSchedule);
  if (typeof dismissedLunchOverlays !== 'undefined') {
    dismissedLunchOverlays.clear();
  }
  renderBoard();
  closeModal('modalSettings');
  showToast('Horários atualizados com sucesso!');
}

