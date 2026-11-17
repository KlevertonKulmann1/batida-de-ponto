/**
 * Controle de Ponto - Histórico de Logs e Exportação CSV
 */

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
    action: action // 'marcado' | 'desmarcado' | 'ajustado' | 'folga_marcada' | 'folga_removida'
  };
  logs.unshift(entry);
  if (logs.length > 1000) logs.pop(); // Limita a 1000 registros
  saveLogs();
}

function setupLogs() {
  const filter = document.getElementById('logFilter');
  if (filter) {
    filter.addEventListener('change', renderLogsTable);
  }

  const btnClear = document.getElementById('btnClearLogs');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja apagar todo o histórico de logs? (Os pontos marcados não serão apagados)')) {
        logs = [];
        saveLogs();
        renderLogsTable();
        showToast('Logs apagados.');
      }
    });
  }

  const btnExport = document.getElementById('btnExportLogsCsv');
  if (btnExport) {
    btnExport.addEventListener('click', exportLogsToCsv);
  }
}

function formatLogDateTimeCell(entry) {
  let dateText = '';
  let timeText = '';

  if (entry.displayDate && entry.displayDate.includes(' ')) {
    const parts = entry.displayDate.split(' ');
    dateText = parts[0];
    timeText = parts.slice(1).join(' ');
  } else if (entry.timestamp) {
    const dt = new Date(entry.timestamp);
    if (!isNaN(dt.getTime())) {
      dateText = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
      timeText = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`;
    } else {
      dateText = entry.timestamp;
    }
  }

  if (dateText && timeText) {
    return `${dateText}<span class="log-cell-sub">${timeText}</span>`;
  }
  return dateText || entry.displayDate || entry.timestamp || '';
}

function renderLogsTable() {
  const filterElem = document.getElementById('logFilter');
  const filter = filterElem ? filterElem.value : 'all';
  const tbody = document.getElementById('logTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const weekDates = getWeekDates(currentViewingDate);
  const weekDateKeys = new Set(weekDates.map(d => formatDateKey(d)));

  const filteredLogs = logs.filter(entry => {
    if (filter === 'week') {
      return weekDateKeys.has(entry.dateKey);
    }
    return true;
  });

  const updateTableScroll = () => {
    const wrapper = document.querySelector('.log-table-wrapper');
    if (wrapper && wrapper._updateScroll) {
      wrapper._updateScroll();
    }
  };

  if (filteredLogs.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4" style="text-align: center; color: #888; padding: 20px;">Nenhum registro encontrado.</td>';
    tbody.appendChild(tr);
    requestAnimationFrame(updateTableScroll);
    return;
  }

  filteredLogs.forEach(entry => {
    const tr = document.createElement('tr');
    const isMarcado = entry.action === 'marcado';
    tr.innerHTML = `
      <td>${formatLogDateTimeCell(entry)}</td>
      <td><strong>${entry.dayName}</strong><span class="log-cell-sub">(${formatDateShortFromKey(entry.dateKey)})</span></td>
      <td>${entry.slotTime}<span class="log-cell-sub">(às ${entry.actualTime})</span></td>
      <td><span class="badge-action ${isMarcado ? 'marcado' : 'desmarcado'}">${isMarcado ? 'Batido' : 'Removido'}</span></td>
    `;
    tbody.appendChild(tr);
  });

  requestAnimationFrame(updateTableScroll);
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

