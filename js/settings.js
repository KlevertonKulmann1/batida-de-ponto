/**
 * Controle de Ponto - Configurações de Horários, Carga Horária e Almoço
 */

let isScheduleTextMode = false;
let currentScheduleDraft = null;

function initScheduleDraft() {
  currentScheduleDraft = {};
  DAY_KEYS.forEach(k => {
    currentScheduleDraft[k] = {
      label: (schedule[k] && schedule[k].label) ? schedule[k].label : k,
      times: (schedule[k] && Array.isArray(schedule[k].times)) ? [...schedule[k].times] : []
    };
  });
}

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
        saveDailyWorkload('08:48');
        initScheduleDraft();
        renderSettingsForm();
        renderBoard();
        showToast('Horários restaurados para o padrão.');
      }
    });
  }

  // Alternar entre Modo Visual (Chips) e Modo Texto
  const toggleBtn = document.getElementById('btnToggleScheduleMode');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (!currentScheduleDraft) initScheduleDraft();

      if (isScheduleTextMode) {
        // Saindo do modo texto: lê os valores digitados nos inputs de texto
        DAY_KEYS.forEach(dayKey => {
          const input = document.getElementById(`input_schedule_${dayKey}`);
          if (input && currentScheduleDraft[dayKey]) {
            const rawTimes = input.value
              .split(',')
              .map(t => t.trim())
              .filter(t => /^\d{1,2}:\d{2}$/.test(t))
              .map(t => {
                const [h, m] = t.split(':');
                return `${h.padStart(2, '0')}:${m}`;
              });
            currentScheduleDraft[dayKey].times = [...new Set(rawTimes)].sort();
          }
        });
        isScheduleTextMode = false;
      } else {
        isScheduleTextMode = true;
      }
      renderScheduleRows();
    });
  }

  // Auto-avanço de horas para minutos na jornada diária
  const hInput = document.getElementById('inputWorkloadHours');
  const mInput = document.getElementById('inputWorkloadMinutes');
  if (hInput && mInput) {
    hInput.addEventListener('input', () => {
      hInput.value = hInput.value.replace(/\D/g, '');
      if (hInput.value.length >= 2) {
        mInput.focus();
        mInput.select();
      }
    });
    mInput.addEventListener('input', () => {
      mInput.value = mInput.value.replace(/\D/g, '');
    });
  }

  // Auto-avanço para jornada semanal
  const whInput = document.getElementById('inputWeeklyWorkloadHours');
  const wmInput = document.getElementById('inputWeeklyWorkloadMinutes');
  if (whInput && wmInput) {
    whInput.addEventListener('input', () => {
      whInput.value = whInput.value.replace(/\D/g, '');
      if (whInput.value.length >= 2) {
        wmInput.focus();
        wmInput.select();
      }
    });
    wmInput.addEventListener('input', () => {
      wmInput.value = wmInput.value.replace(/\D/g, '');
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

  const workload = loadDailyWorkload() || '08:48';
  const [wHours, wMinutes] = workload.split(':');
  const hInput = document.getElementById('inputWorkloadHours');
  const mInput = document.getElementById('inputWorkloadMinutes');
  if (hInput) hInput.value = wHours || '08';
  if (mInput) mInput.value = wMinutes || '48';

  const weeklyWorkload = loadWeeklyWorkload() || '44:00';
  const [whHours, whMinutes] = weeklyWorkload.split(':');
  const whInput = document.getElementById('inputWeeklyWorkloadHours');
  const wmInput = document.getElementById('inputWeeklyWorkloadMinutes');
  if (whInput) whInput.value = whHours || '44';
  if (wmInput) wmInput.value = whMinutes || '00';

  const lunchWin = loadLunchWindow();
  const startInput = document.getElementById('inputLunchStart');
  const endInput = document.getElementById('inputLunchEnd');
  if (startInput) startInput.value = lunchWin.start;
  if (endInput) endInput.value = lunchWin.end;
  updateLunchBadge();

  initScheduleDraft();
  renderScheduleRows();
}

function renderScheduleRows() {
  const container = document.getElementById('scheduleConfigForm');
  if (!container || !currentScheduleDraft) return;
  container.innerHTML = '';

  const toggleBtn = document.getElementById('btnToggleScheduleMode');
  if (toggleBtn) {
    toggleBtn.textContent = isScheduleTextMode ? '🏷️ Modo Visual (Chips)' : '📝 Modo Texto';
  }

  if (isScheduleTextMode) {
    // MODO TEXTO: inputs com horários separados por vírgula
    DAY_KEYS.forEach(dayKey => {
      const dayConfig = currentScheduleDraft[dayKey] || { label: dayKey, times: [] };
      const row = document.createElement('div');
      row.className = 'schedule-row';

      const header = document.createElement('div');
      header.className = 'schedule-row-header';

      const titleGroup = document.createElement('div');
      titleGroup.className = 'schedule-day-title-group';

      const title = document.createElement('span');
      title.className = 'schedule-day-title';
      title.textContent = dayConfig.label;
      titleGroup.appendChild(title);
      header.appendChild(titleGroup);

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'schedule-input';
      input.id = `input_schedule_${dayKey}`;
      input.value = dayConfig.times.join(', ');
      input.placeholder = 'Ex: 08:00, 12:00, 13:00, 18:00 (vazio para folga)';

      input.addEventListener('input', () => {
        const rawTimes = input.value
          .split(',')
          .map(t => t.trim())
          .filter(t => /^\d{1,2}:\d{2}$/.test(t))
          .map(t => {
            const [h, m] = t.split(':');
            return `${h.padStart(2, '0')}:${m}`;
          });
        dayConfig.times = rawTimes;
      });

      row.appendChild(header);
      row.appendChild(input);
      container.appendChild(row);
    });
  } else {
    // MODO VISUAL: chips interativos de horários
    DAY_KEYS.forEach(dayKey => {
      const dayConfig = currentScheduleDraft[dayKey] || { label: dayKey, times: [] };
      const times = dayConfig.times || [];
      const row = document.createElement('div');
      row.className = 'schedule-row';

      // Cabeçalho da Linha
      const header = document.createElement('div');
      header.className = 'schedule-row-header';

      const titleGroup = document.createElement('div');
      titleGroup.className = 'schedule-day-title-group';

      const title = document.createElement('span');
      title.className = 'schedule-day-title';
      title.textContent = dayConfig.label;
      titleGroup.appendChild(title);

      const countBadge = document.createElement('span');
      countBadge.className = 'day-count-badge' + (times.length === 0 ? ' folga' : '');
      countBadge.textContent = times.length === 0 ? 'Folga' : `${times.length} batida${times.length > 1 ? 's' : ''}`;
      titleGroup.appendChild(countBadge);

      header.appendChild(titleGroup);

      // Ações Rápidas no Cabeçalho
      const actionsGroup = document.createElement('div');
      actionsGroup.className = 'schedule-day-actions';

      if (times.length > 0) {
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn-day-action';
        copyBtn.title = `Replicar horários de ${dayConfig.label} para Segunda a Sexta`;
        copyBtn.textContent = '📋 Replicar Seg-Sex';
        copyBtn.addEventListener('click', () => {
          ['segunda', 'terca', 'quarta', 'quinta', 'sexta'].forEach(k => {
            if (currentScheduleDraft[k]) {
              currentScheduleDraft[k].times = [...times];
            }
          });
          renderScheduleRows();
          showToast(`Horários de ${dayConfig.label} replicados para Segunda a Sexta! ✨`);
        });
        actionsGroup.appendChild(copyBtn);

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'btn-day-action btn-day-clear';
        clearBtn.title = 'Remover todos os horários deste dia';
        clearBtn.textContent = '🗑️ Limpar';
        clearBtn.addEventListener('click', () => {
          dayConfig.times = [];
          renderScheduleRows();
        });
        actionsGroup.appendChild(clearBtn);
      } else {
        const defaultBtn = document.createElement('button');
        defaultBtn.type = 'button';
        defaultBtn.className = 'btn-day-action btn-day-default';
        defaultBtn.title = 'Preencher com 4 batidas padrão (08:00, 12:00, 13:00, 18:00)';
        defaultBtn.textContent = '⚡ Padrão (4)';
        defaultBtn.addEventListener('click', () => {
          dayConfig.times = ['08:00', '12:00', '13:00', '18:00'];
          renderScheduleRows();
        });
        actionsGroup.appendChild(defaultBtn);
      }

      header.appendChild(actionsGroup);
      row.appendChild(header);

      // Container de Chips de Horário
      const chipsContainer = document.createElement('div');
      chipsContainer.className = 'time-chips-container';

      if (times.length === 0) {
        const emptyText = document.createElement('span');
        emptyText.className = 'empty-day-text';
        emptyText.textContent = 'Sem horários (dia de folga)';
        chipsContainer.appendChild(emptyText);
      } else {
        times.forEach((timeStr, idx) => {
          const chip = document.createElement('div');
          chip.className = 'time-chip';

          const timeInput = document.createElement('input');
          timeInput.type = 'time';
          timeInput.className = 'time-chip-input';
          timeInput.value = timeStr;

          timeInput.addEventListener('change', (e) => {
            const val = e.target.value;
            if (/^\d{2}:\d{2}$/.test(val)) {
              dayConfig.times[idx] = val;
              dayConfig.times = [...new Set(dayConfig.times)].sort();
              renderScheduleRows();
            }
          });

          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'time-chip-remove';
          removeBtn.title = `Remover ${timeStr}`;
          removeBtn.innerHTML = '&times;';
          removeBtn.addEventListener('click', () => {
            dayConfig.times.splice(idx, 1);
            renderScheduleRows();
          });

          chip.appendChild(timeInput);
          chip.appendChild(removeBtn);
          chipsContainer.appendChild(chip);
        });
      }

      // Botão Adicionar Horário
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn-add-time-chip';
      addBtn.innerHTML = '+ Horário';
      addBtn.addEventListener('click', () => {
        let nextTime = '08:00';
        if (times.length > 0) {
          const lastTime = times[times.length - 1];
          if (lastTime === '08:00') nextTime = '12:00';
          else if (lastTime === '12:00') nextTime = '13:00';
          else if (lastTime === '13:00') nextTime = '18:00';
          else {
            const [h, m] = lastTime.split(':').map(Number);
            const nextH = Math.min(23, h + 1);
            nextTime = `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          }
        }
        dayConfig.times.push(nextTime);
        dayConfig.times = [...new Set(dayConfig.times)].sort();
        renderScheduleRows();
      });

      chipsContainer.appendChild(addBtn);
      row.appendChild(chipsContainer);
      container.appendChild(row);
    });
  }

  const body = document.querySelector('#modalSettings .modal-body');
  if (body && body._updateScroll) {
    requestAnimationFrame(body._updateScroll);
  }
}

function saveSettingsFromForm() {
  const urlInput = document.getElementById('inputExternalPunchUrl');
  if (urlInput) {
    saveRedirectUrl(urlInput.value);
  }

  const hInput = document.getElementById('inputWorkloadHours');
  const mInput = document.getElementById('inputWorkloadMinutes');
  if (hInput && mInput) {
    const rawH = hInput.value.replace(/\D/g, '');
    const rawM = mInput.value.replace(/\D/g, '');
    const h = String(Math.min(23, Math.max(0, parseInt(rawH || '8', 10)))).padStart(2, '0');
    const m = String(Math.min(59, Math.max(0, parseInt(rawM || '0', 10)))).padStart(2, '0');
    saveDailyWorkload(`${h}:${m}`);
  }

  const whInput = document.getElementById('inputWeeklyWorkloadHours');
  const wmInput = document.getElementById('inputWeeklyWorkloadMinutes');
  if (whInput && wmInput) {
    const rawWH = whInput.value.replace(/\D/g, '');
    const rawWM = wmInput.value.replace(/\D/g, '');
    const wh = String(Math.min(168, Math.max(0, parseInt(rawWH || '44', 10)))).padStart(2, '0');
    const wm = String(Math.min(59, Math.max(0, parseInt(rawWM || '0', 10)))).padStart(2, '0');
    saveWeeklyWorkload(`${wh}:${wm}`);
  }

  const startInput = document.getElementById('inputLunchStart');
  const endInput = document.getElementById('inputLunchEnd');
  if (startInput && endInput) {
    saveLunchWindow(startInput.value, endInput.value);
  }

  if (isScheduleTextMode) {
    DAY_KEYS.forEach(dayKey => {
      const input = document.getElementById(`input_schedule_${dayKey}`);
      if (input && currentScheduleDraft && currentScheduleDraft[dayKey]) {
        const rawTimes = input.value
          .split(',')
          .map(t => t.trim())
          .filter(t => /^\d{1,2}:\d{2}$/.test(t))
          .map(t => {
            const [h, m] = t.split(':');
            return `${h.padStart(2, '0')}:${m}`;
          });
        currentScheduleDraft[dayKey].times = [...new Set(rawTimes)].sort();
      }
    });
  }

  const newSchedule = {};
  DAY_KEYS.forEach(dayKey => {
    newSchedule[dayKey] = {
      label: (currentScheduleDraft && currentScheduleDraft[dayKey] && currentScheduleDraft[dayKey].label) || schedule[dayKey].label,
      times: (currentScheduleDraft && currentScheduleDraft[dayKey] && currentScheduleDraft[dayKey].times) || []
    };
  });

  saveSchedule(newSchedule);
  syncScheduleWithWorker(newSchedule);
  if (typeof dismissedLunchOverlays !== 'undefined') {
    dismissedLunchOverlays.clear();
  }
  renderBoard();
  closeModal('modalSettings');
  showToast('Horários atualizados com sucesso! 💾');
}
