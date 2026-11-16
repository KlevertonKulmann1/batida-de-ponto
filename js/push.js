/**
 * Controle de Ponto - Notificações Push via Cloudflare Worker
 */

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function triggerQuickPunch() {
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
}

function checkUrlPunchAction() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('punch') === '1') {
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => {
      triggerQuickPunch();
      showToast('Ponto registrado via notificação! ⚡');
    }, 450);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.action === 'quickPunch') {
        triggerQuickPunch();
        showToast('Ponto registrado via notificação! ⚡');
      }
    });
  }
}

function setupPushNotifications() {
  const workerInput = document.getElementById('inputPushWorkerUrl');
  const btnSubscribe = document.getElementById('btnSubscribePush');
  const btnTest = document.getElementById('btnTestPush');

  if (workerInput) {
    workerInput.value = loadPushWorkerUrl();
    workerInput.addEventListener('change', () => {
      savePushWorkerUrl(workerInput.value);
    });
  }

  updatePushBadge();

  if (btnSubscribe) {
    btnSubscribe.addEventListener('click', async () => {
      const rawUrl = (workerInput ? workerInput.value : loadPushWorkerUrl()).trim();
      if (!rawUrl) {
        alert('Por favor, informe a URL do seu Cloudflare Worker.');
        if (workerInput) workerInput.focus();
        return;
      }
      savePushWorkerUrl(rawUrl);

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Seu navegador não suporta notificações Push.');
        return;
      }

      showToast('Solicitando permissão de notificação... 🔔');
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        alert('Permissão de notificação negada no navegador. Permita as notificações nas configurações do site no Chrome.');
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
        const cleanUrl = rawUrl.replace(/\/+$/, '');

        const res = await fetch(`${cleanUrl}/api/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub,
            schedule: schedule,
            timezone: tz
          })
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(err);
        }

        localStorage.setItem(STORAGE_KEYS.pushSubscribed, 'true');
        updatePushBadge();
        showToast('Notificações ativadas no seu celular com sucesso! 🎉');
      } catch (err) {
        console.error('Erro ao ativar push:', err);
        alert('Falha ao conectar com o Worker: ' + err.message);
      }
    });
  }

  if (btnTest) {
    btnTest.addEventListener('click', async () => {
      const rawUrl = (workerInput ? workerInput.value : loadPushWorkerUrl()).trim();
      if (!rawUrl) {
        alert('Informe a URL do seu Worker antes de enviar o teste.');
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        showToast('Enviando notificação de teste... 🚀');
        const cleanUrl = rawUrl.replace(/\/+$/, '');
        const res = await fetch(`${cleanUrl}/api/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub })
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(err);
        }

        showToast('Notificação de teste disparada! Olhe a barra do celular. 🔔');
      } catch (err) {
        console.error('Erro no teste de push:', err);
        alert('Falha no teste: ' + err.message);
      }
    });
  }
}

function updatePushBadge() {
  const badge = document.getElementById('pushStatusBadge');
  if (!badge) return;
  const isSubscribed = localStorage.getItem(STORAGE_KEYS.pushSubscribed) === 'true';
  if (isSubscribed) {
    badge.textContent = 'Ativo ✅';
    badge.style.background = 'rgba(82, 196, 26, 0.25)';
    badge.style.color = '#52c41a';
  } else {
    badge.textContent = 'Desativado';
    badge.style.background = 'rgba(255, 255, 255, 0.1)';
    badge.style.color = '#aaa';
  }
}

function syncScheduleWithWorker(newSched) {
  const workerUrl = loadPushWorkerUrl();
  if (workerUrl && localStorage.getItem(STORAGE_KEYS.pushSubscribed) === 'true') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => {
        if (sub) {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
          fetch(`${workerUrl.replace(/\/+$/, '')}/api/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub, schedule: newSched, timezone: tz })
          }).catch(err => console.warn('Sync com worker falhou:', err));
        }
      });
    }
  }
}
