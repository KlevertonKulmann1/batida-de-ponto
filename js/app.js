/**
 * Controle de Ponto - Inicializador Principal
 */

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupModals();
  setupQuickPunch();
  setupSettings();
  setupBackup();
  setupLogs();
  setupLiveClockAndSound();
  setupEditTime();
  setupForceAppUpdate();
  setupInstallPrompt();
  setupPushNotifications();
  renderBoard();
  registerServiceWorker();
  checkUrlPunchAction();
});
