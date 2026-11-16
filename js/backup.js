/**
 * Controle de Ponto - Backup, Exportação e Restauração de Dados
 */

function setupBackup() {
  const btnDownload = document.getElementById('btnDownloadBackup');
  if (btnDownload) {
    btnDownload.addEventListener('click', downloadBackup);
  }

  const btnCopy = document.getElementById('btnCopyBackup');
  if (btnCopy) {
    btnCopy.addEventListener('click', copyBackupToClipboard);
  }

  const fileInput = document.getElementById('fileImportBackup');
  const btnTrigger = document.getElementById('btnTriggerFileImport');
  if (fileInput && btnTrigger) {
    btnTrigger.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = cleanAndParseJSON(event.target.result);
          applyImportedData(data);
          fileInput.value = '';
        } catch (err) {
          alert('Arquivo inválido! Certifique-se de selecionar um JSON válido.');
        }
      };
      reader.readAsText(file);
    });
  }

  const btnImport = document.getElementById('btnImportFromText');
  if (btnImport) {
    btnImport.addEventListener('click', () => {
      const textarea = document.getElementById('importTextarea');
      const txt = textarea ? textarea.value : '';
      if (!txt || !txt.trim()) {
        alert('Cole o conteúdo JSON na caixa de texto primeiro.');
        return;
      }
      try {
        const data = cleanAndParseJSON(txt);
        applyImportedData(data);
        if (textarea) textarea.value = '';
      } catch (e) {
        alert('JSON inválido! Verifique o texto colado. Se copiou do celular, certifique-se de copiar todo o bloco.');
      }
    });
  }

  const btnRestorePontoFile = document.getElementById('btnRestorePontoFile');
  if (btnRestorePontoFile) {
    btnRestorePontoFile.addEventListener('click', async () => {
      try {
        const res = await fetch('ponto-backup.json?t=' + Date.now());
        if (!res.ok) throw new Error('Arquivo ponto-backup.json não encontrado no servidor.');
        const data = await res.json();
        applyImportedData(data, true);
      } catch (err) {
        alert('Não foi possível carregar ponto-backup.json: ' + err.message);
      }
    });
  }

  const btnReset = document.getElementById('btnResetAllData');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('ATENÇÃO: Isto apagará todos os pontos batidos, logs e configurações salvas no dispositivo. Tem certeza?')) {
        localStorage.clear();
        schedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
        records = {};
        logs = [];
        saveSchedule(schedule);
        saveRecords();
        saveLogs();
        saveDailyWorkload('08:48');
        saveLunchWindow('12:00', '13:12');
        renderBoard();
        closeModal('modalBackup');
        showToast('Todos os dados foram resetados.');
      }
    });
  }
}

function getBackupPayload() {
  const lunchWin = loadLunchWindow();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    schedule: schedule,
    records: records,
    logs: logs,
    redirectUrl: redirectUrl,
    dailyWorkload: loadDailyWorkload(),
    lunchBreak: loadLunchBreak(),
    lunchStart: lunchWin.start,
    lunchEnd: lunchWin.end
  };
}

function downloadBackup() {
  const payload = getBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ponto-backup-${formatDateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup baixado com sucesso!');
}

function copyBackupToClipboard() {
  const payload = getBackupPayload();
  const text = JSON.stringify(payload);
  navigator.clipboard.writeText(text).then(() => {
    showToast('Dados copiados para a área de transferência! 📋');
  }).catch(() => {
    const textarea = document.getElementById('importTextarea');
    if (textarea) textarea.value = text;
    showToast('Copiado para a caixa de texto abaixo!');
  });
}

function cleanAndParseJSON(rawText) {
  let txt = String(rawText || '').trim();
  // Remove blocos de código markdown (```json ... ``` ou ``` ... ```)
  txt = txt.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
  // Converte aspas curvas/inteligentes de celulares para aspas normais
  txt = txt.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
  txt = txt.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
  // Extrai apenas o miolo do JSON entre o primeiro { e o último }
  const firstBrace = txt.indexOf('{');
  const lastBrace = txt.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    txt = txt.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(txt);
}

function applyImportedData(data, skipConfirm = false) {
  if (!data || typeof data !== 'object') {
    alert('Dados de backup corrompidos.');
    return;
  }

  let shouldProceed = skipConfirm;
  if (!shouldProceed) {
    try {
      shouldProceed = confirm('Deseja restaurar estes dados? Os registros atuais serão mesclados com o backup.');
    } catch (e) {
      shouldProceed = true;
    }
  }

  if (shouldProceed) {
    if (data.schedule) {
      schedule = { ...DEFAULT_SCHEDULE, ...data.schedule };
      saveSchedule(schedule);
    }
    if (data.records) {
      records = { ...records, ...data.records };
      saveRecords();
    }
    if (data.redirectUrl !== undefined) {
      saveRedirectUrl(data.redirectUrl);
    }
    if (data.dailyWorkload !== undefined) {
      saveDailyWorkload(data.dailyWorkload);
    }
    if (data.lunchBreak !== undefined) {
      saveLunchBreak(data.lunchBreak);
    }
    if (data.lunchStart && data.lunchEnd) {
      saveLunchWindow(data.lunchStart, data.lunchEnd);
    }
    if (Array.isArray(data.logs)) {
      const existingIds = new Set(logs.map(l => l.id));
      data.logs.forEach(l => {
        if (!existingIds.has(l.id)) logs.push(l);
      });
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      saveLogs();
    }

    renderBoard();
    closeModal('modalBackup');
    showToast('Backup restaurado com sucesso! 🎉');
  }
}

