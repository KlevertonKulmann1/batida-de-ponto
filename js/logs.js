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

  if (filteredLogs.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4" style="text-align: center; color: #888; padding: 20px;">Nenhum registro encontrado.</td>';
    tbody.appendChild(tr);
    return;
  }

  filteredLogs.forEach(entry => {
    const tr = document.createElement('tr');
    const isMarcado = entry.action === 'marcado';
    tr.innerHTML = `
      <td>${entry.displayDate || entry.timestamp}</td>
      <td><strong>${entry.dayName}</strong> (${formatDateShortFromKey(entry.dateKey)})</td>
      <td>${entry.slotTime} <span style="opacity: 0.7; font-size: 0.75rem;">(às ${entry.actualTime})</span></td>
      <td><span class="badge-action ${isMarcado ? 'marcado' : 'desmarcado'}">${isMarcado ? 'Batido' : 'Removido'}</span></td>
    `;
    tbody.appendChild(tr);
  });
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

