/**
 * Controle de Ponto - PWA, Service Worker, Atualizações e Toasts
 */

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toastMessage');
  if (!toast) return;
  toast.innerHTML = message;
  toast.classList.remove('hidden');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2600);
}

function setupForceAppUpdate() {
  const btn = document.getElementById('btnForceAppUpdate');
  if (btn) {
    btn.addEventListener('click', () => {
      showToast('Limpando cache e recarregando... 🔄');
      if ('caches' in window) {
        caches.keys().then((names) => {
          return Promise.all(names.map((name) => caches.delete(name)));
        }).then(() => {
          setTimeout(() => window.location.reload(true), 500);
        });
      } else {
        window.location.reload(true);
      }
    });
  }
}

let deferredInstallPrompt = null;

function setupInstallPrompt() {
  const btnInstall = document.getElementById('btnInstallApp');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstall) {
      btnInstall.style.display = 'inline-flex';
    }
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Instalando aplicativo... ✨');
      }
      deferredInstallPrompt = null;
      btnInstall.style.display = 'none';
    });
  }

  window.addEventListener('appinstalled', () => {
    showToast('Aplicativo instalado com sucesso! 🎉');
    if (btnInstall) {
      btnInstall.style.display = 'none';
    }
    deferredInstallPrompt = null;
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      console.log('PWA ServiceWorker registrado.');
      reg.update();

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('Nova versão instalada! Atualizando... 🔄');
              setTimeout(() => window.location.reload(), 1200);
            }
          });
        }
      });
    }).catch(err => {
      console.log('SW falhou:', err);
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

