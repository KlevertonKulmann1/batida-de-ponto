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

function calculateDayWork(dateKey, isDateToday, isDatePast, targetMins, lunchMins = 72) {
  const dayRecords = records[dateKey] || {};
  const isFolga = Boolean(dayRecords.__isFolga);
  if (isFolga) {
    return {
      isFolga: true,
      punchesCount: 0,
      workedMinutes: 0,
      remainingMinutes: 0,
      isCurrentlyWorking: false,
      hasPendingPunch: false
    };
  }

  const punches = getDayPunches(dateKey);
  let workedMinutes = 0;
  let isCurrentlyWorking = false;
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
      hasPendingPunch: false,
      estimatedExitTime: null
    };
  }

  // Se houver exatamente 2 batidas no dia (1 par completo, ex: Entrada e Saída geral)
  // Desconta o tempo de almoço para não inflar as horas trabalhadas
  if (punches.length === 2) {
    const elapsed = punches[1].minutes - punches[0].minutes;
    if (elapsed > lunchMins) {
      workedMinutes = elapsed - lunchMins;
    } else {
      workedMinutes = elapsed;
    }
  } else {
    // Para 1 batida (em andamento) ou 3+ batidas (com saídas/entradas intermediárias)
    for (let i = 0; i < punches.length; i += 2) {
      const entrance = punches[i];
      const exit = punches[i + 1];

      if (exit) {
        const diff = exit.minutes - entrance.minutes;
        if (diff > 0) workedMinutes += diff;
      } else {
        lastEntrance = entrance.time;
        if (isDateToday) {
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          let currentDiff = nowMinutes - entrance.minutes;
          if (currentDiff > 0) {
            // Se for a única batida do dia e já passou de 5h direto sem intervalo, desconta o almoço
            if (punches.length === 1 && currentDiff > (5 * 60) && currentDiff > lunchMins) {
              workedMinutes += (currentDiff - lunchMins);
            } else {
              workedMinutes += currentDiff;
            }
          }
          isCurrentlyWorking = true;
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
    // Se só tem 1 batida (ainda não bateu almoço), a saída prevista precisa incluir o tempo de almoço que ainda será cumprido
    if (punches.length === 1) {
      exitMins = punches[0].minutes + targetMins + lunchMins;
    } else {
      // Já está após o almoço ou registrou intervalos
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
    lastEntrance,
    hasPendingPunch,
    estimatedExitTime
  };
}

