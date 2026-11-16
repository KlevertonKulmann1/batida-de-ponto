/**
 * custom-scrollbar.js
 * Barras de rolagem com tamanho de thumb fixo idêntico às artes RPG:
 * - Horizontal (.slots-container): largura fixa exata de horizontal-roll-bar.png (98px)
 * - Vertical (página): botões Up/Down (20px) + altura fixa exata do cristal scroll-indicator.png (32px)
 */

// =========================================================================
// 1. ROLAGEM HORIZONTAL DAS BATIDAS DO DIA (.slots-container)
// =========================================================================

function setupHorizontalScrollbars() {
  const containers = document.querySelectorAll('.slots-container');
  containers.forEach(container => {
    // Evita duplicar o listener se já inicializado
    if (container.dataset.hasCustomScroll) {
      if (container._updateScroll) container._updateScroll();
      return;
    }

    const dayRow = container.closest('.day-row');
    if (!dayRow) return;

    // Cria a barra horizontal customizada
    const scrollTrack = document.createElement('div');
    scrollTrack.className = 'custom-horiz-scroll-track';

    const thumb = document.createElement('div');
    thumb.className = 'custom-horiz-scroll-thumb';
    scrollTrack.appendChild(thumb);

    dayRow.appendChild(scrollTrack);
    container.dataset.hasCustomScroll = 'true';

    function updateThumb() {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 4) {
        scrollTrack.style.display = 'none';
        return;
      }
      scrollTrack.style.display = 'block';

      const trackWidth = scrollTrack.clientWidth;
      const thumbWidth = thumb.offsetWidth || 98;
      const maxTravel = trackWidth - thumbWidth;
      if (maxTravel <= 0) return;

      const progress = Math.min(1, Math.max(0, container.scrollLeft / maxScroll));
      thumb.style.transform = `translateX(${progress * maxTravel}px)`;
    }

    container._updateScroll = updateThumb;

    // Sincroniza quando o usuário rola o container (swipe / wheel)
    container.addEventListener('scroll', updateThumb, { passive: true });

    // Arrastar o thumb com mouse ou touch
    let isDragging = false;
    let startX = 0;
    let startScroll = 0;

    thumb.addEventListener('pointerdown', (e) => {
      isDragging = true;
      thumb.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startScroll = container.scrollLeft;
      thumb.classList.add('dragging');
      e.preventDefault();
      e.stopPropagation();
    });

    thumb.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const trackWidth = scrollTrack.clientWidth;
      const thumbWidth = thumb.offsetWidth || 98;
      const maxTravel = trackWidth - thumbWidth;
      if (maxTravel <= 0) return;

      const deltaX = e.clientX - startX;
      const scrollRatio = deltaX / maxTravel;
      container.scrollLeft = startScroll + (scrollRatio * maxScroll);
    });

    const stopDrag = (e) => {
      if (isDragging) {
        isDragging = false;
        thumb.classList.remove('dragging');
        try { thumb.releasePointerCapture(e.pointerId); } catch (_) { }
      }
    };

    thumb.addEventListener('pointerup', stopDrag);
    thumb.addEventListener('pointercancel', stopDrag);

    // Clicar no trilho para pular
    scrollTrack.addEventListener('pointerdown', (e) => {
      if (e.target === thumb) return;
      const rect = scrollTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const thumbWidth = thumb.offsetWidth || 98;
      const maxTravel = scrollTrack.clientWidth - thumbWidth;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxTravel <= 0) return;

      const targetTravel = Math.min(maxTravel, Math.max(0, clickX - (thumbWidth / 2)));
      container.scrollLeft = (targetTravel / maxTravel) * maxScroll;
    });

    // Atualização inicial
    requestAnimationFrame(updateThumb);
  });
}

// =========================================================================
// 2. ROLAGEM VERTICAL DA PÁGINA (Botões Up/Down + Trilho + Cristal Fixo)
// =========================================================================

function setupScrollButton(btn, scrollStep, targetElem = null) {
  let scrollInterval = null;
  let scrollTimeout = null;

  function doScroll() {
    if (targetElem) {
      targetElem.scrollBy({ top: scrollStep, behavior: 'smooth' });
    } else {
      window.scrollBy({ top: scrollStep, behavior: 'smooth' });
    }
  }

  function startScrolling(e) {
    e.preventDefault();
    doScroll();
    scrollTimeout = setTimeout(() => {
      scrollInterval = setInterval(doScroll, 70);
    }, 250);
  }

  function stopScrolling() {
    clearTimeout(scrollTimeout);
    clearInterval(scrollInterval);
  }

  btn.addEventListener('pointerdown', startScrolling);
  btn.addEventListener('pointerup', stopScrolling);
  btn.addEventListener('pointerleave', stopScrolling);
  btn.addEventListener('pointercancel', stopScrolling);
}

function initVerticalScrollbar() {
  let wrapper = document.getElementById('customVertScrollWrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'customVertScrollWrapper';
    wrapper.className = 'custom-vert-scroll-wrapper';

    // Botão de subir (Up)
    const btnUp = document.createElement('button');
    btnUp.id = 'customScrollBtnUp';
    btnUp.className = 'custom-scroll-btn custom-scroll-btn-up';
    btnUp.type = 'button';
    btnUp.title = 'Rolar para cima';
    wrapper.appendChild(btnUp);

    // Trilho intermediário
    const track = document.createElement('div');
    track.id = 'customVertScrollTrack';
    track.className = 'custom-vert-scroll-track';

    const thumb = document.createElement('div');
    thumb.id = 'customVertScrollThumb';
    thumb.className = 'custom-vert-scroll-thumb';
    track.appendChild(thumb);

    wrapper.appendChild(track);

    // Botão de descer (Down)
    const btnDown = document.createElement('button');
    btnDown.id = 'customScrollBtnDown';
    btnDown.className = 'custom-scroll-btn custom-scroll-btn-down';
    btnDown.type = 'button';
    btnDown.title = 'Rolar para baixo';
    wrapper.appendChild(btnDown);

    document.body.appendChild(wrapper);

    // Conecta a ação de rolagem suave nos botões Up e Down
    setupScrollButton(btnUp, -140);
    setupScrollButton(btnDown, 140);
  }

  const track = document.getElementById('customVertScrollTrack');
  const thumb = document.getElementById('customVertScrollThumb');

  // Recuo (offset) de 12px no topo e na base do trilho para respeitar as ponteiras ornamentadas
  const INSET_TOP = 12;
  const INSET_BOTTOM = 12;

  function update() {
    const docElem = document.documentElement;
    const maxScroll = docElem.scrollHeight - window.innerHeight;
    if (maxScroll <= 10) {
      wrapper.style.display = 'none';
      return;
    }
    wrapper.style.display = 'flex';

    const trackHeight = track.clientHeight;
    const thumbHeight = thumb.offsetHeight || 32;
    const maxTravel = trackHeight - thumbHeight - INSET_TOP - INSET_BOTTOM;
    if (maxTravel <= 0) return;

    const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    const currentY = INSET_TOP + (progress * maxTravel);
    thumb.style.transform = `translate(-50%, ${currentY}px)`;
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  let isDragging = false;
  let startY = 0;
  let startScrollY = 0;

  thumb.addEventListener('pointerdown', (e) => {
    isDragging = true;
    thumb.setPointerCapture(e.pointerId);
    startY = e.clientY;
    startScrollY = window.scrollY;
    thumb.classList.add('dragging');
    e.preventDefault();
  });

  thumb.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const docElem = document.documentElement;
    const maxScroll = docElem.scrollHeight - window.innerHeight;
    const trackHeight = track.clientHeight;
    const thumbHeight = thumb.offsetHeight || 32;
    const maxTravel = trackHeight - thumbHeight - INSET_TOP - INSET_BOTTOM;
    if (maxTravel <= 0) return;

    const deltaY = e.clientY - startY;
    window.scrollTo(0, startScrollY + (deltaY / maxTravel) * maxScroll);
  });

  const stopDrag = (e) => {
    if (isDragging) {
      isDragging = false;
      thumb.classList.remove('dragging');
      try { thumb.releasePointerCapture(e.pointerId); } catch (_) { }
    }
  };

  thumb.addEventListener('pointerup', stopDrag);
  thumb.addEventListener('pointercancel', stopDrag);

  // Clicar no trilho para avançar
  track.addEventListener('pointerdown', (e) => {
    if (e.target === thumb) return;
    const rect = track.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const thumbHeight = thumb.offsetHeight || 32;
    const maxTravel = track.clientHeight - thumbHeight - INSET_TOP - INSET_BOTTOM;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxTravel <= 0) return;

    const targetTravel = Math.min(maxTravel, Math.max(0, clickY - INSET_TOP - (thumbHeight / 2)));
    window.scrollTo(0, (targetTravel / maxTravel) * maxScroll);
  });

  // Atualização inicial
  requestAnimationFrame(update);
}

// =========================================================================
// 3. ROLAGEM VERTICAL DOS MODAIS (Configurações, Logs, Backup)
// =========================================================================

function setupModalScrollbars() {
  const modalCards = document.querySelectorAll('.modal-card');
  modalCards.forEach(card => {
    const body = card.querySelector('.modal-body');
    if (!body) return;

    if (body.dataset.hasCustomScroll) {
      if (body._updateScroll) body._updateScroll();
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'modal-vert-scroll-wrapper';

    // Botão de subir (Up)
    const btnUp = document.createElement('button');
    btnUp.className = 'custom-scroll-btn custom-scroll-btn-up';
    btnUp.type = 'button';
    btnUp.title = 'Rolar para cima';
    wrapper.appendChild(btnUp);

    // Trilho intermediário
    const track = document.createElement('div');
    track.className = 'custom-vert-scroll-track';

    const thumb = document.createElement('div');
    thumb.className = 'custom-vert-scroll-thumb';
    track.appendChild(thumb);

    wrapper.appendChild(track);

    // Botão de descer (Down)
    const btnDown = document.createElement('button');
    btnDown.className = 'custom-scroll-btn custom-scroll-btn-down';
    btnDown.type = 'button';
    btnDown.title = 'Rolar para baixo';
    wrapper.appendChild(btnDown);

    card.appendChild(wrapper);
    body.dataset.hasCustomScroll = 'true';

    setupScrollButton(btnUp, -120, body);
    setupScrollButton(btnDown, 120, body);

    const INSET_TOP = 12;
    const INSET_BOTTOM = 12;

    function update() {
      const maxScroll = body.scrollHeight - body.clientHeight;
      if (maxScroll <= 5) {
        wrapper.style.display = 'none';
        return;
      }
      wrapper.style.display = 'flex';

      const trackHeight = track.clientHeight;
      const thumbHeight = thumb.offsetHeight || 32;
      const maxTravel = trackHeight - thumbHeight - INSET_TOP - INSET_BOTTOM;
      if (maxTravel <= 0) {
        requestAnimationFrame(() => {
          const reTrackHeight = track.clientHeight;
          const reMaxTravel = reTrackHeight - thumbHeight - INSET_TOP - INSET_BOTTOM;
          if (reMaxTravel > 0) {
            const progress = Math.min(1, Math.max(0, body.scrollTop / maxScroll));
            const currentY = INSET_TOP + (progress * reMaxTravel);
            thumb.style.transform = `translate(-50%, ${currentY}px)`;
          }
        });
        return;
      }

      const progress = Math.min(1, Math.max(0, body.scrollTop / maxScroll));
      const currentY = INSET_TOP + (progress * maxTravel);
      thumb.style.transform = `translate(-50%, ${currentY}px)`;
    }

    body._updateScroll = update;
    body.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    thumb.addEventListener('pointerdown', (e) => {
      isDragging = true;
      thumb.setPointerCapture(e.pointerId);
      startY = e.clientY;
      startScrollTop = body.scrollTop;
      thumb.classList.add('dragging');
      e.preventDefault();
      e.stopPropagation();
    });

    thumb.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const maxScroll = body.scrollHeight - body.clientHeight;
      const trackHeight = track.clientHeight;
      const thumbHeight = thumb.offsetHeight || 32;
      const maxTravel = trackHeight - thumbHeight - INSET_TOP - INSET_BOTTOM;
      if (maxTravel <= 0) return;

      const deltaY = e.clientY - startY;
      body.scrollTop = startScrollTop + (deltaY / maxTravel) * maxScroll;
    });

    const stopDrag = (e) => {
      if (isDragging) {
        isDragging = false;
        thumb.classList.remove('dragging');
        try { thumb.releasePointerCapture(e.pointerId); } catch (_) { }
      }
    };

    thumb.addEventListener('pointerup', stopDrag);
    thumb.addEventListener('pointercancel', stopDrag);

    // Clicar no trilho para pular
    track.addEventListener('pointerdown', (e) => {
      if (e.target === thumb) return;
      const rect = track.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const thumbHeight = thumb.offsetHeight || 32;
      const maxTravel = track.clientHeight - thumbHeight - INSET_TOP - INSET_BOTTOM;
      const maxScroll = body.scrollHeight - body.clientHeight;
      if (maxTravel <= 0) return;

      const targetTravel = Math.min(maxTravel, Math.max(0, clickY - INSET_TOP - (thumbHeight / 2)));
      body.scrollTop = (targetTravel / maxTravel) * maxScroll;
    });

    requestAnimationFrame(update);
  });
}
