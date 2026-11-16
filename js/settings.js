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
        renderSettingsForm();
        renderBoard();
        showToast('Horários restaurados para o padrão.');
      }
    });
  }
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

  const lunchInput = document.getElementById('inputLunchBreak');
  if (lunchInput) {
    lunchInput.value = loadLunchBreak();
  }

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

  const lunchInput = document.getElementById('inputLunchBreak');
  if (lunchInput) {
    saveLunchBreak(lunchInput.value);
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
  renderBoard();
  closeModal('modalSettings');
  showToast('Horários atualizados com sucesso!');
}

