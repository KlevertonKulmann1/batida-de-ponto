/**
 * Controle de Ponto - Interface do Quadro, Slots de Horários, Navegação e Modais
 */

const dismissedLunchOverlays = new Set();

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

      const { dateKey, dayLabel, slotTime, shouldRedirect: flagRedirect } = pendingUnmark;
      if (!records[dateKey]) records[dateKey] = {};

      const wasMarked = Boolean(records[dateKey][slotTime] && records[dateKey][slotTime].marked);
      const now = new Date();

      const isToday = dateKey === formatDateKey(now);
      const nowTimeStr = formatTimeOnly(now);
      const isCurrentTime = isToday && (newTime === nowTimeStr || Math.abs(timeToMinutes(newTime) - timeToMinutes(nowTimeStr)) <= 1);
      const shouldRedirect = Boolean(flagRedirect || (!wasMarked && isCurrentTime));

      records[dateKey][slotTime] = {
        marked: true,
        timestamp: wasMarked && records[dateKey][slotTime].timestamp ? records[dateKey][slotTime].timestamp : now.toISOString(),
        markedAt: newTime
      };
      saveRecords();
      addLog(wasMarked ? 'ajustado' : 'marcado', dateKey, dayLabel, slotTime, newTime);
      playTickSound(true);
      showToast(wasMarked ? `Horário corrigido para ${newTime} <img src="${IMAGES.editar || 'assets/editar.png'}" style="width: 18px; vertical-align: middle; margin-left: 4px;" alt="">` : `Ponto registrado às ${newTime}! ✨`);
      renderBoard();
      closeModal('modalConfirmUnmark');
      pendingUnmark = null;

      if (shouldRedirect) {
        openExternalRedirectIfConfigured();
      }
    });

    inputTime.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnSave.click();
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
  let totalWorkedWeekMinutes = 0;
  let folgasCount = 0;

  const targetWorkload = loadDailyWorkload();
  const targetDailyMins = timeToMinutes(targetWorkload);
  const baseWeeklyWorkload = loadWeeklyWorkload();
  const baseWeeklyMins = timeToMinutes(baseWeeklyWorkload);
  const lunchWin = loadLunchWindow();
  const lunchParam = {
    startMins: timeToMinutes(lunchWin.start),
    endMins: timeToMinutes(lunchWin.end),
    durationMins: Math.max(0, timeToMinutes(lunchWin.end) - timeToMinutes(lunchWin.start))
  };

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
    } else if (totalSlots > 0) {
      folgasCount++;
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
    dayRow.className = 'day-row' + (isToday(dateObj) ? ' is-today' : '') + (isFolga ? ' is-folga-row' : '');

    // Se o dia for marcado como folga/feriado, substitui completamente o bloco pela imagem
    if (isFolga) {
      dayRow.title = `${dayConfig.label} (${formatDateShort(dateObj)}): Feriado / Folga (Clique para desmarcar)`;

      const imgContainer = document.createElement('div');
      imgContainer.className = 'feriado-overlay-img-container';

      const pictureElem = document.createElement('picture');
      pictureElem.className = 'feriado-overlay-picture';

      if (IMAGES.feriadoDesk) {
        const sourceDesk = document.createElement('source');
        sourceDesk.media = '(min-width: 476px)';
        sourceDesk.srcset = IMAGES.feriadoDesk;
        pictureElem.appendChild(sourceDesk);
      }

      const feriadoImg = document.createElement('img');
      feriadoImg.className = 'feriado-overlay-img';
      feriadoImg.src = IMAGES.feriado || 'assets/feriado.jpg';
      feriadoImg.alt = `Feriado / Folga - ${dayConfig.label}`;
      pictureElem.appendChild(feriadoImg);

      imgContainer.appendChild(pictureElem);
      dayRow.appendChild(imgContainer);

      dayRow.addEventListener('click', () => {
        toggleFolga(dateKey, dayConfig.label);
      });

      daysContainer.appendChild(dayRow);
      return;
    }

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
    folgaBtn.innerHTML = isFolga ? '<img src="assets/folga.png">' : '<img src="assets/folga.png">  - Marcar como folga';
    folgaBtn.title = isFolga ? 'Clique para desmarcar folga' : 'Marcar este dia como folga/feriado';
    folgaBtn.addEventListener('click', () => {
      toggleFolga(dateKey, dayConfig.label);
    });
    headerLine.appendChild(folgaBtn);

    // Badge de Carga Horária / Horas Faltantes (alinhado à direita)
    const isPast = isPastDay(dateObj);
    const isDayToday = isToday(dateObj);
    const workStats = calculateDayWork(dateKey, isDayToday, isPast, targetDailyMins, lunchParam);
    totalWorkedWeekMinutes += workStats.workedMinutes;

    const workloadBadge = document.createElement('div');
    workloadBadge.className = 'day-workload-badge';

    if (workStats.isFolga) {
      workloadBadge.classList.add('workload-folga');
      workloadBadge.innerHTML = '<img width="24px" src="assets/folga.png">  - Dia de Folga';
      workloadBadge.title = `${dayConfig.label} (${formatDateShort(dateObj)}): Dia registrado como folga/feriado.`;
      workloadBadge.addEventListener('click', () => {
        showToast(`${dayConfig.label}: Dia de folga. Não há horas pendentes!`);
      });
    } else if (workStats.isCurrentlyInLunch) {
      workloadBadge.classList.add('workload-working');
      workloadBadge.innerHTML = `🍽️ <span>No Almoço (${lunchWin.end}) • Falta ${minutesToHoursMin(workStats.remainingMinutes)}</span>`;
      const exitText = workStats.estimatedExitTime ? ` • Saída prevista: ${workStats.estimatedExitTime}` : '';
      workloadBadge.title = `🍽️ Em horário de almoço (${lunchWin.start} às ${lunchWin.end}). Cronômetro pausado! Já trabalhou ${minutesToHoursMin(workStats.workedMinutes)} de ${targetWorkload}${exitText}. Clique para ver o aviso de almoço.`;
      workloadBadge.addEventListener('click', () => {
        if (dismissedLunchOverlays.has(dateKey)) {
          dismissedLunchOverlays.delete(dateKey);
          renderBoard();
        } else {
          showToast(`🍽️ No almoço até ${lunchWin.end}! Cronômetro pausado (${minutesToHoursMin(workStats.workedMinutes)} trabalhadas).`);
        }
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
        workloadBadge.innerHTML = `<img src="${IMAGES.estrela || 'assets/estrela.png'}" class="badge-star-icon" alt=""> <span>+${minutesToHoursMin(extra)} extra</span>`;
        workloadBadge.title = `${dayConfig.label}: Meta de ${targetWorkload} superada! Total trabalhado: ${minutesToHoursMin(workStats.workedMinutes)} (+${minutesToHoursMin(extra)}).`;
        workloadBadge.addEventListener('click', () => {
          showToast(`<img src="${IMAGES.estrela || 'assets/estrela.png'}" class="toast-img-icon" alt=""> ${dayConfig.label}: ${minutesToHoursMin(workStats.workedMinutes)} trabalhadas (+${minutesToHoursMin(extra)} extras).`);
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
        timeLabel.title = isMarked
          ? `Horário previsto: ${timeStr} (clique para ajustar)`
          : `Horário previsto: ${timeStr} (clique para registrar retroativo)`;
        timeLabel.addEventListener('click', (e) => {
          e.stopPropagation();
          openSlotAdjustModal(dateKey, dayConfig.label, timeStr, isMarked, markedAt);
        });

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
        if (isMarked) {
          markedAtLabel.innerHTML = `${markedAt || '✓'} <img src="${IMAGES.editar || 'assets/editar.png'}" class="slot-edit-icon" alt="Ajustar">`;
          markedAtLabel.title = `Registrado às ${markedAt || timeStr}. Clique para ajustar.`;
          markedAtLabel.addEventListener('click', (e) => {
            e.stopPropagation();
            openSlotAdjustModal(dateKey, dayConfig.label, timeStr, isMarked, markedAt);
          });
        } else {
          markedAtLabel.textContent = '';
        }

        slotBtn.addEventListener('click', () => {
          handleSlotClick(dateKey, dayConfig.label, timeStr, isMarked, markedAt);
        });

        slotBtn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          openSlotAdjustModal(dateKey, dayConfig.label, timeStr, isMarked, markedAt);
        });

        // Toque longo no celular (500ms) para abrir modal de ajuste
        let longPressTimer = null;
        slotBtn.addEventListener('touchstart', () => {
          longPressTimer = setTimeout(() => {
            openSlotAdjustModal(dateKey, dayConfig.label, timeStr, isMarked, markedAt);
            longPressTimer = null;
          }, 500);
        }, { passive: true });
        const cancelLongPress = () => {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        };
        slotBtn.addEventListener('touchend', cancelLongPress);
        slotBtn.addEventListener('touchcancel', cancelLongPress);
        slotBtn.addEventListener('touchmove', cancelLongPress);

        slotItem.appendChild(timeLabel);
        slotItem.appendChild(slotBtn);
        slotItem.appendChild(markedAtLabel);
        slotsContainer.appendChild(slotItem);
      });
    }

    controlsLine.appendChild(slotsContainer);
    dayRow.appendChild(controlsLine);

    // Se o horário de almoço estiver vigente hoje e não for folga, exibe o container de pausa sobre o dia
    if (isDayToday && workStats.isCurrentlyInLunch && !isFolga && !dismissedLunchOverlays.has(dateKey)) {
      dayRow.classList.add('is-lunch-active');

      const overlayWrapper = document.createElement('div');
      overlayWrapper.className = 'lunch-overlay-wrapper';
      overlayWrapper.id = `lunchOverlay_${dateKey}`;

      const imgContainer = document.createElement('div');
      imgContainer.className = 'lunch-overlay-img-container';

      const pictureElem = document.createElement('picture');
      pictureElem.className = 'lunch-overlay-picture';

      if (IMAGES.pausaAlmocoDesk) {
        const sourceDesk = document.createElement('source');
        sourceDesk.media = '(min-width: 476px)';
        sourceDesk.srcset = IMAGES.pausaAlmocoDesk;
        pictureElem.appendChild(sourceDesk);
      }

      const lunchImg = document.createElement('img');
      lunchImg.className = 'lunch-overlay-img';
      lunchImg.src = IMAGES.pausaAlmoco;
      lunchImg.alt = 'Pausa para o Almoço';
      pictureElem.appendChild(lunchImg);

      imgContainer.appendChild(pictureElem);

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'lunch-overlay-close';
      closeBtn.title = 'Fechar aviso para bater ponto';
      closeBtn.setAttribute('aria-label', 'Fechar aviso');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        overlayWrapper.classList.add('fade-out');
        setTimeout(() => {
          overlayWrapper.remove();
          dayRow.classList.remove('is-lunch-active');
        }, 200);
        dismissedLunchOverlays.add(dateKey);
        showToast('Aviso de almoço fechado. Você pode bater o ponto normalmente!');
      });

      overlayWrapper.appendChild(imgContainer);
      overlayWrapper.appendChild(closeBtn);
      dayRow.appendChild(overlayWrapper);
    }

    daysContainer.appendChild(dayRow);
  });

  // Ativa barras de rolagem horizontais customizadas com tamanho fixo
  if (typeof setupHorizontalScrollbars === 'function') {
    setupHorizontalScrollbars();
  }

  // Atualiza estatísticas do rodapé e contadores de horas semanais
  const folgaCompensationMins = folgasCount * targetDailyMins;
  const effectiveTargetWeekMins = Math.max(0, baseWeeklyMins - folgaCompensationMins);

  const workedHoursStr = minutesToHoursMin(totalWorkedWeekMinutes);
  const targetHoursStr = minutesToHoursMin(effectiveTargetWeekMins);
  const percentWorked = effectiveTargetWeekMins > 0 ? Math.round((totalWorkedWeekMinutes / effectiveTargetWeekMins) * 100) : 100;
  const balanceMinutes = totalWorkedWeekMinutes - effectiveTargetWeekMins;

  let balanceText = '';
  let statusClass = 'pending';

  if (balanceMinutes > 0) {
    statusClass = 'overtime';
    balanceText = `(+${minutesToHoursMin(balanceMinutes)} extra)`;
  } else if (balanceMinutes === 0 && totalWorkedWeekMinutes > 0) {
    statusClass = 'done';
    balanceText = `(Meta cumprida)`;
  } else {
    statusClass = 'pending';
    balanceText = `(Faltam ${minutesToHoursMin(Math.abs(balanceMinutes))})`;
  }

  // 1. Atualiza Badge no Topo do Quadro
  const headerHoursBadge = document.getElementById('headerWeekHoursBadge');
  const headerHoursText = document.getElementById('headerWeekHoursText');
  if (headerHoursBadge && headerHoursText) {
    headerHoursText.textContent = `${workedHoursStr} / ${targetHoursStr}`;
    headerHoursBadge.className = `header-week-hours-badge ${statusClass}`;
    let tooltip = `Horas da Semana: ${workedHoursStr} cumpridas de ${targetHoursStr} acordadas (${percentWorked}%).`;
    if (folgasCount > 0) {
      tooltip += ` (${folgasCount} folga/feriado compensada: -${minutesToHoursMin(folgaCompensationMins)} na meta).`;
    }
    tooltip += ` ${balanceText}`;
    headerHoursBadge.title = tooltip;
    headerHoursBadge.onclick = () => {
      showToast(`⏱️ Semana: ${workedHoursStr} / ${targetHoursStr} (${percentWorked}%) ${balanceText}`);
    };
  }

  // 2. Atualiza Contador no Rodapé do Quadro
  const weekHoursCounter = document.getElementById('weekHoursCounter');
  const weekHoursVal = document.getElementById('weekHoursVal');
  const weekHoursBadge = document.getElementById('weekHoursBadge');
  if (weekHoursCounter && weekHoursVal && weekHoursBadge) {
    weekHoursVal.textContent = `${workedHoursStr} / ${targetHoursStr}`;
    weekHoursBadge.textContent = `${percentWorked}%`;
    weekHoursCounter.className = `week-hours-counter ${statusClass}`;
    let tooltip = `Jornada Semanal: ${workedHoursStr} cumpridas de ${targetHoursStr} acordadas.`;
    if (folgasCount > 0) {
      tooltip += ` ${folgasCount} folga/feriado compensado (-${minutesToHoursMin(folgaCompensationMins)}).`;
    }
    tooltip += ` ${balanceText}`;
    weekHoursCounter.title = tooltip;
    weekHoursCounter.onclick = () => {
      showToast(`⏱️ Semana: ${workedHoursStr} de ${targetHoursStr} cumpridas ${balanceText}`);
    };
  }

  // 3. Atualiza Resumo de Pontos Marcados no Rodapé
  const statsElem = document.getElementById('weekStats');
  if (statsElem) {
    statsElem.textContent = `${markedWeekSlots} de ${totalWeekSlots} batidas • ${balanceText}`;
  }

  // Atualiza lista de seleção rápida de semanas com registros
  updateRecordedWeeksSelect();
}

function openSlotAdjustModal(dateKey, dayLabel, slotTime, currentlyMarked, markedAt) {
  pendingUnmark = { dateKey, dayLabel, slotTime, markedAt, currentlyMarked, shouldRedirect: false };

  const modalTitle = document.getElementById('modalAdjustTitle');
  const modalText = document.getElementById('unmarkModalText');
  const modalInfo = document.getElementById('unmarkModalInfo');
  const inputEditTime = document.getElementById('inputEditTime');
  const btnPresetPlanned = document.getElementById('btnPresetPlannedTime');
  const btnPresetNow = document.getElementById('btnPresetNowTime');
  const btnConfirmUnmark = document.getElementById('btnConfirmUnmark');
  const lblEditTime = document.getElementById('lblEditTime');

  if (modalTitle) {
    modalTitle.innerHTML = `<img src="${IMAGES.editar || 'assets/editar.png'}" alt="" class="modal-header-icon"> ${currentlyMarked ? 'Ajustar Horário do Ponto' : 'Registrar Ponto Retroativo'}`;
  }

  if (modalText) {
    modalText.textContent = currentlyMarked
      ? 'Corrija o horário da batida registrada para sincronizar com a empresa.'
      : 'Registre o ponto já batido na empresa ou bata agora no horário atual.';
  }

  if (modalInfo) {
    modalInfo.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span><strong>Dia:</strong> ${dayLabel}</span>
        <span style="opacity:0.8;">(${formatDateShortFromKey(dateKey)})</span>
      </div>
      <div><strong>Horário previsto:</strong> ${slotTime}</div>
      <div><strong>Status atual:</strong> ${currentlyMarked ? `<span style="color:#73d13d; font-weight:700;">Batido às ${markedAt || slotTime}</span>` : '<span style="color:#ff7875; font-weight:700;">Não batido no app</span>'}</div>
    `;
  }

  if (btnPresetPlanned) {
    btnPresetPlanned.classList.remove('active');
    btnPresetPlanned.textContent = `⚡ Usar Previsto (${slotTime})`;
    btnPresetPlanned.onclick = () => {
      if (inputEditTime) inputEditTime.value = slotTime;
      if (pendingUnmark) pendingUnmark.shouldRedirect = false;
      btnPresetPlanned.classList.add('active');
      if (btnPresetNow) btnPresetNow.classList.remove('active');
    };
  }

  if (btnPresetNow) {
    btnPresetNow.classList.remove('active');
    const nowTimeStr = formatTimeOnly(new Date());
    btnPresetNow.textContent = `🕒 Usar Agora (${nowTimeStr})`;
    btnPresetNow.onclick = () => {
      const nowStr = formatTimeOnly(new Date());
      if (inputEditTime) inputEditTime.value = nowStr;
      if (pendingUnmark) pendingUnmark.shouldRedirect = true;
      btnPresetNow.classList.add('active');
      if (btnPresetPlanned) btnPresetPlanned.classList.remove('active');
    };
  }

  if (lblEditTime) {
    lblEditTime.textContent = currentlyMarked ? 'Horário real batido na empresa:' : 'Horário em que bateu na empresa:';
  }

  if (inputEditTime) {
    inputEditTime.value = currentlyMarked ? (markedAt || slotTime) : slotTime;
    inputEditTime.oninput = () => {
      if (btnPresetNow) btnPresetNow.classList.remove('active');
      if (btnPresetPlanned) btnPresetPlanned.classList.remove('active');
      if (pendingUnmark) {
        const now = new Date();
        const isToday = pendingUnmark.dateKey === formatDateKey(now);
        const nowStr = formatTimeOnly(now);
        pendingUnmark.shouldRedirect = Boolean(isToday && inputEditTime.value === nowStr);
      }
    };
  }

  if (btnConfirmUnmark) {
    btnConfirmUnmark.style.display = currentlyMarked ? 'inline-flex' : 'none';
  }

  openModal('modalConfirmUnmark');
}

function handleSlotClick(dateKey, dayLabel, slotTime, currentlyMarked, markedAt) {
  if (currentlyMarked) {
    openSlotAdjustModal(dateKey, dayLabel, slotTime, true, markedAt);
    return;
  }

  const todayKey = formatDateKey(new Date());
  const isToday = dateKey === todayKey;

  // Se for de outro dia (passado ou futuro), abre o modal de registro retroativo
  if (!isToday) {
    openSlotAdjustModal(dateKey, dayLabel, slotTime, false, null);
    return;
  }

  // Se for hoje, verifica se o horário previsto já passou há mais de 20 minutos
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = timeToMinutes(slotTime);
  const diffMinutes = currentMinutes - slotMinutes;

  if (diffMinutes > 20) {
    // Horário já passou (esqueceu de bater na hora!). Abre o modal para confirmar ou ajustar
    openSlotAdjustModal(dateKey, dayLabel, slotTime, false, null);
    return;
  }

  // No horário normal (ou adiantado), bate direto
  markSlot(dateKey, dayLabel, slotTime);
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
  if (!customActualTime) {
    openExternalRedirectIfConfigured();
  }
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
  showToast(!current ? `Dia marcado como Folga/Feriado <img src="assets/folga.png" alt="Folga">` : `Folga removida de ${dayLabel}`);
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
  if (modal) {
    modal.classList.remove('hidden');
    if (typeof setupModalScrollbars === 'function') {
      setupModalScrollbars();
    }
    if (typeof setupTableScrollbar === 'function') {
      setupTableScrollbar();
    }
    const updateModalScroll = () => {
      const body = modal.querySelector('.modal-body');
      if (body && body._updateScroll) {
        body._updateScroll();
      }
      const tableWrapper = modal.querySelector('.log-table-wrapper');
      if (tableWrapper && tableWrapper._updateScroll) {
        tableWrapper._updateScroll();
      }
    };
    requestAnimationFrame(updateModalScroll);
    setTimeout(updateModalScroll, 220);
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

