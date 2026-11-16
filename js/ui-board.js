/**
 * Controle de Ponto - Interface do Quadro, Slots de Horários, Navegação e Modais
 */

function setupLiveClockAndSound() {
  const clockElem = document.getElementById('liveClock');
  function tick() {
    const now = new Date();
    if (clockElem) {
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      clockElem.textContent = `${h}:${m}:${s}`;
    }
    // A cada minuto checado no segundo 0, atualiza o quadro se estiver vendo a semana atual para manter o tempo restante ao vivo
    if (now.getSeconds() === 0) {
      const currentWeekMonday = getMonday(new Date());
      const viewingMonday = getMonday(currentViewingDate);
      if (formatDateKey(currentWeekMonday) === formatDateKey(viewingMonday)) {
        renderBoard();
      }
    }
  }
  tick();
  setInterval(tick, 1000);

  // Botão de som
  const btnSound = document.getElementById('btnToggleSound');
  if (btnSound) {
    btnSound.classList.toggle('sound-muted', !soundEnabled);
    btnSound.addEventListener('click', () => {
      saveSoundSetting(!soundEnabled);
      btnSound.classList.toggle('sound-muted', !soundEnabled);
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

function openExternalRedirectIfConfigured() {
  if (redirectUrl) {
    let url = redirectUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    try {
      window.open(url, '_blank');
    } catch (e) {
      console.error('Erro ao abrir link externo:', e);
    }
  }
}

function renderBoard() {
  const weekDates = getWeekDates(currentViewingDate);
  const monday = weekDates[0];
  const friday = weekDates[4];
  const sunday = weekDates[6];

  // Mostra intervalo de datas
  const hasWeekend = schedule.sabado.times.length > 0 || schedule.domingo.times.length > 0;
  const lastDay = hasWeekend ? sunday : friday;
  const weekDisplay = document.getElementById('weekDisplay');
  if (weekDisplay) {
    weekDisplay.textContent = `${formatDateShort(monday)}  á  ${formatDateShort(lastDay)}`;
  }

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
        orbSrc = IMAGES.orbFaltando;
        orbTitle = `Dia finalizado com ${totalSlots - markedCount} batida(s) pendente(s).`;
      } else {
        orbSrc = IMAGES.orbAberta;
        orbTitle = `Dia em aberto: ${markedCount} de ${totalSlots} marcados.`;
      }
    }

    // Elemento do dia
    const dayRow = document.createElement('div');
    dayRow.className = 'day-row' + (isToday(dateObj) ? ' is-today' : '') + (isFolga ? ' is-folga' : '');

    // Linha do cabeçalho do dia
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

    // Badge de Carga Horária / Horas Faltantes (alinhado à direita)
    const targetWorkload = loadDailyWorkload();
    const targetMins = timeToMinutes(targetWorkload);
    const lunchBreak = loadLunchBreak();
    const lunchMins = timeToMinutes(lunchBreak);
    const isPast = isPastDay(dateObj);
    const isDayToday = isToday(dateObj);
    const workStats = calculateDayWork(dateKey, isDayToday, isPast, targetMins, lunchMins);

    const workloadBadge = document.createElement('div');
    workloadBadge.className = 'day-workload-badge';

    if (workStats.isFolga) {
      workloadBadge.classList.add('workload-folga');
      workloadBadge.textContent = '🏖️ Folga';
      workloadBadge.title = `${dayConfig.label} (${formatDateShort(dateObj)}): Dia registrado como folga/feriado.`;
      workloadBadge.addEventListener('click', () => {
        showToast(`${dayConfig.label}: Dia de folga. Não há horas pendentes!`);
      });
    } else if (workStats.punchesCount === 0) {
      workloadBadge.classList.add('workload-pending');
      workloadBadge.innerHTML = `⏳ Falta ${minutesToHoursMin(targetMins)}`;
      workloadBadge.title = `${dayConfig.label} (${formatDateShort(dateObj)}): Nenhuma batida registrada. Meta diária: ${targetWorkload}.`;
      workloadBadge.addEventListener('click', () => {
        showToast(`${dayConfig.label}: Nenhuma batida registrada. Meta de hoje: ${targetWorkload}.`);
      });
    } else if (workStats.isCurrentlyWorking) {
      workloadBadge.classList.add('workload-working');
      const dot = `<span class="workload-dot"></span>`;
      if (workStats.remainingMinutes > 0) {
        workloadBadge.innerHTML = `${dot} <span>Falta ${minutesToHoursMin(workStats.remainingMinutes)}</span>`;
        const exitText = workStats.estimatedExitTime ? ` • Saída prevista: ${workStats.estimatedExitTime}` : '';
        workloadBadge.title = `Em expediente desde às ${workStats.lastEntrance}! Já trabalhou ${minutesToHoursMin(workStats.workedMinutes)} de ${targetWorkload}${exitText}.`;
        workloadBadge.addEventListener('click', () => {
          showToast(`🟢 Em expediente! ${minutesToHoursMin(workStats.workedMinutes)}/${targetWorkload}.${exitText}`);
        });
      } else {
        const extraMins = Math.abs(workStats.remainingMinutes);
        workloadBadge.innerHTML = `${dot} <span>${targetWorkload} (+${minutesToHoursMin(extraMins)})</span>`;
        workloadBadge.title = `Meta diária cumprida! Já trabalhou ${targetWorkload} e está com ${minutesToHoursMin(extraMins)} extras.`;
        workloadBadge.addEventListener('click', () => {
          showToast(`🟢 Meta cumprida! ${targetWorkload} concluídas (+${minutesToHoursMin(extraMins)} extras).`);
        });
      }
    } else if (workStats.hasPendingPunch) {
      workloadBadge.classList.add('workload-warning');
      workloadBadge.innerHTML = `⚠️ ${minutesToHoursMin(workStats.workedMinutes)} (pendente)`;
      workloadBadge.title = `Atenção: Houve entrada sem registro de saída neste dia. Horas calculadas até a última saída: ${minutesToHoursMin(workStats.workedMinutes)}.`;
      workloadBadge.addEventListener('click', () => {
        showToast(`⚠️ Atenção: Número ímpar de batidas registradas neste dia.`);
      });
    } else if (workStats.remainingMinutes <= 0) {
      const extra = Math.abs(workStats.remainingMinutes);
      if (extra > 0) {
        workloadBadge.classList.add('workload-overtime');
        workloadBadge.innerHTML = `⭐ +${minutesToHoursMin(extra)} extra`;
        workloadBadge.title = `${dayConfig.label}: Meta de ${targetWorkload} superada! Total trabalhado: ${minutesToHoursMin(workStats.workedMinutes)} (+${minutesToHoursMin(extra)}).`;
        workloadBadge.addEventListener('click', () => {
          showToast(`⭐ ${dayConfig.label}: ${minutesToHoursMin(workStats.workedMinutes)} trabalhadas (+${minutesToHoursMin(extra)} extras).`);
        });
      } else {
        workloadBadge.classList.add('workload-done');
        workloadBadge.innerHTML = `✅ ${targetWorkload} cumpridas`;
        workloadBadge.title = `${dayConfig.label}: Jornada diária de ${targetWorkload} 100% cumprida!`;
        workloadBadge.addEventListener('click', () => {
          showToast(`✅ ${dayConfig.label}: Jornada diária de ${targetWorkload} cumprida!`);
        });
      }
    } else {
      workloadBadge.classList.add('workload-pending');
      workloadBadge.innerHTML = `⏳ Falta ${minutesToHoursMin(workStats.remainingMinutes)}`;
      workloadBadge.title = `${dayConfig.label}: ${minutesToHoursMin(workStats.workedMinutes)} trabalhadas de ${targetWorkload}. Restam ${minutesToHoursMin(workStats.remainingMinutes)}.`;
      workloadBadge.addEventListener('click', () => {
        showToast(`${dayConfig.label}: ${minutesToHoursMin(workStats.workedMinutes)} trabalhadas de ${targetWorkload}. Restam ${minutesToHoursMin(workStats.remainingMinutes)}.`);
      });
    }

    headerLine.appendChild(workloadBadge);
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

  // Ativa barras de rolagem horizontais customizadas com tamanho fixo
  if (typeof setupHorizontalScrollbars === 'function') {
    setupHorizontalScrollbars();
  }

  // Atualiza estatísticas do rodapé
  const statsElem = document.getElementById('weekStats');
  if (statsElem) {
    statsElem.textContent = `${markedWeekSlots} de ${totalWeekSlots} pontos marcados`;
  }

  // Atualiza lista de seleção rápida de semanas com registros
  updateRecordedWeeksSelect();
}

function handleSlotClick(dateKey, dayLabel, slotTime, currentlyMarked, markedAt) {
  if (currentlyMarked) {
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
  openExternalRedirectIfConfigured();
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

function setupQuickPunch() {
  const btn = document.getElementById('btnQuickPunch');
  if (!btn) return;
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
    const nextSlot = dayConfig.times.find(t => !todayRecords[t] || !todayRecords[t].marked);

    if (nextSlot) {
      currentViewingDate = new Date();
      markSlot(todayKey, dayConfig.label, nextSlot);
    } else {
      showToast('Todos os pontos de hoje já foram batidos! 🎉');
    }
  });

  const btnConfirm = document.getElementById('btnConfirmUnmark');
  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      if (pendingUnmark) {
        unmarkSlot(pendingUnmark.dateKey, pendingUnmark.dayLabel, pendingUnmark.slotTime);
        pendingUnmark = null;
        closeModal('modalConfirmUnmark');
      }
    });
  }
}

function setupNavigation() {
  const btnPrev = document.getElementById('btnPrevWeek');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      currentViewingDate.setDate(currentViewingDate.getDate() - 7);
      renderBoard();
    });
  }

  const btnNext = document.getElementById('btnNextWeek');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentViewingDate.setDate(currentViewingDate.getDate() + 7);
      renderBoard();
    });
  }

  const btnCurrent = document.getElementById('btnCurrentWeek');
  if (btnCurrent) {
    btnCurrent.addEventListener('click', () => {
      currentViewingDate = new Date();
      renderBoard();
    });
  }

  const selectWeeks = document.getElementById('selectRecordedWeeks');
  if (selectWeeks) {
    selectWeeks.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      if (val === 'prev') {
        currentViewingDate.setDate(currentViewingDate.getDate() - 7);
        renderBoard();
      } else if (val === 'next') {
        currentViewingDate.setDate(currentViewingDate.getDate() + 7);
        renderBoard();
      } else {
        const parts = val.split('-');
        if (parts.length === 3) {
          currentViewingDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
          renderBoard();
        }
      }
    });
  }
}

function updateRecordedWeeksSelect() {
  const select = document.getElementById('selectRecordedWeeks');
  if (!select) return;

  const currentMonday = getMonday(currentViewingDate);
  const currentMondayKey = formatDateKey(currentMonday);
  const thisWeekMondayKey = formatDateKey(getMonday(new Date()));

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

  if (!weekSet.has(currentMondayKey)) {
    const lastDay = new Date(currentMonday);
    lastDay.setDate(currentMonday.getDate() + 6);
    weekSet.set(currentMondayKey, {
      monday: currentMonday,
      label: `${formatDateShort(currentMonday)} a ${formatDateShort(lastDay)}`,
      count: 0
    });
  }

  select.innerHTML = '';

  const optPrev = document.createElement('option');
  optPrev.value = 'prev';
  optPrev.textContent = '‹ Semana Anterior';
  select.appendChild(optPrev);

  const sortedWeeks = Array.from(weekSet.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  sortedWeeks.forEach(([mKey, data]) => {
    const opt = document.createElement('option');
    opt.value = mKey;
    const isThisWeek = mKey === thisWeekMondayKey;
    const countText = data.count > 0 ? ` (${data.count} pts)` : '';
    opt.textContent = `${data.label}${isThisWeek ? ' (Esta Semana)' : ''}${countText}`;
    if (mKey === currentMondayKey) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  const optNext = document.createElement('option');
  optNext.value = 'next';
  optNext.textContent = '› Próxima Semana';
  select.appendChild(optNext);
}

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

