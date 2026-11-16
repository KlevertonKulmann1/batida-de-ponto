/**
 * Controle de Ponto - Lógica de Cálculos de Horas Trabalhadas e Jornada
 */

function getDayPunches(dateKey) {
  const dayRecords = records[dateKey] || {};
  if (dayRecords.__isFolga) return [];

  const punches = [];
  Object.keys(dayRecords).forEach(k => {
    if (k.startsWith('__')) return;
    const rec = dayRecords[k];
    if (rec && rec.marked) {
      const timeStr = rec.markedAt || k;
      if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
        punches.push({
          slotKey: k,
          time: timeStr,
          minutes: timeToMinutes(timeStr)
        });
      }
    }
  });

  punches.sort((a, b) => a.minutes - b.minutes);
  return punches;
}

function getLunchOverlap(from, to, lunchStart, lunchEnd) {
  if (from >= to) return 0;
  const overlapStart = Math.max(from, lunchStart);
  const overlapEnd = Math.min(to, lunchEnd);
  return Math.max(0, overlapEnd - overlapStart);
}

function calculateDayWork(dateKey, isDateToday, isDatePast, targetMins, lunchParam = 72) {
  const dayRecords = records[dateKey] || {};
  const isFolga = Boolean(dayRecords.__isFolga);
  if (isFolga) {
    return {
      isFolga: true,
      punchesCount: 0,
      workedMinutes: 0,
      remainingMinutes: 0,
      isCurrentlyWorking: false,
      isCurrentlyInLunch: false,
      hasPendingPunch: false
    };
  }

  // Normaliza configuração do almoço (horário de início, fim e duração)
  let lunchStartMins = 12 * 60; // 12:00
  let lunchEndMins = 13 * 60 + 12; // 13:12
  let lunchDurationMins = 72;

  if (lunchParam && typeof lunchParam === 'object') {
    lunchStartMins = lunchParam.startMins !== undefined ? lunchParam.startMins : 720;
    lunchEndMins = lunchParam.endMins !== undefined ? lunchParam.endMins : 792;
    lunchDurationMins = lunchParam.durationMins !== undefined ? lunchParam.durationMins : Math.max(0, lunchEndMins - lunchStartMins);
  } else if (typeof lunchParam === 'number') {
    lunchDurationMins = lunchParam;
    lunchEndMins = lunchStartMins + lunchDurationMins;
  }

  const punches = getDayPunches(dateKey);
  let workedMinutes = 0;
  let isCurrentlyWorking = false;
  let isCurrentlyInLunch = false;
  let lastEntrance = null;
  let hasPendingPunch = false;
  let estimatedExitTime = null;

  if (punches.length === 0) {
    return {
      isFolga: false,
      punchesCount: 0,
      workedMinutes: 0,
      remainingMinutes: targetMins,
      isCurrentlyWorking: false,
      isCurrentlyInLunch: false,
      hasPendingPunch: false,
      estimatedExitTime: null
    };
  }

  // Se houver exatamente 2 batidas no dia (Entrada e Saída geral)
  if (punches.length === 2) {
    const elapsed = punches[1].minutes - punches[0].minutes;
    const overlap = getLunchOverlap(punches[0].minutes, punches[1].minutes, lunchStartMins, lunchEndMins);
    const deduction = overlap > 0 ? overlap : Math.min(elapsed, lunchDurationMins);
    workedMinutes = Math.max(0, elapsed - deduction);
  } else {
    // Para 1 batida (em andamento) ou 3+ batidas
    for (let i = 0; i < punches.length; i += 2) {
      const entrance = punches[i];
      const exit = punches[i + 1];

      if (exit) {
        const diff = exit.minutes - entrance.minutes;
        if (diff > 0) {
          const overlap = getLunchOverlap(entrance.minutes, exit.minutes, lunchStartMins, lunchEndMins);
          workedMinutes += Math.max(0, diff - overlap);
        }
      } else {
        lastEntrance = entrance.time;
        if (isDateToday) {
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          if (nowMinutes > entrance.minutes) {
            const totalElapsed = nowMinutes - entrance.minutes;
            const overlap = getLunchOverlap(entrance.minutes, nowMinutes, lunchStartMins, lunchEndMins);
            workedMinutes += Math.max(0, totalElapsed - overlap);
          }
          isCurrentlyWorking = true;
          // Verifica se está no intervalo de almoço agora
          if (nowMinutes >= lunchStartMins && nowMinutes < lunchEndMins) {
            isCurrentlyInLunch = true;
          }
        } else if (isDatePast) {
          hasPendingPunch = true;
        }
      }
    }
  }

  const remainingMinutes = targetMins - workedMinutes;

  if (isDateToday && isCurrentlyWorking && remainingMinutes > 0) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let exitMins;

    if (nowMins < lunchStartMins) {
      exitMins = nowMins + remainingMinutes + lunchDurationMins;
    } else if (nowMins >= lunchStartMins && nowMins < lunchEndMins) {
      exitMins = lunchEndMins + remainingMinutes;
    } else {
      exitMins = nowMins + remainingMinutes;
    }

    const exitH = Math.floor(exitMins / 60) % 24;
    const exitM = exitMins % 60;
    estimatedExitTime = `${String(exitH).padStart(2, '0')}:${String(exitM).padStart(2, '0')}`;
  }

  return {
    isFolga: false,
    punchesCount: punches.length,
    workedMinutes,
    remainingMinutes,
    isCurrentlyWorking,
    isCurrentlyInLunch,
    lunchWindow: {
      startMins: lunchStartMins,
      endMins: lunchEndMins,
      start: minutesToHoursMin(lunchStartMins),
      end: minutesToHoursMin(lunchEndMins),
      durationMins: lunchDurationMins
    },
    lastEntrance,
    hasPendingPunch,
    estimatedExitTime
  };
}

