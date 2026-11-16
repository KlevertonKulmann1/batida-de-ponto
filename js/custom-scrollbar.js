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
        try { thumb.releasePointerCapture(e.pointerId); } catch (_) {}
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

function setupScrollButton(btn, scrollStep) {
  let scrollInterval = null;
  let scrollTimeout = null;

  function doScroll() {
    window.scrollBy({ top: scrollStep, behavior: 'smooth' });
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
    const maxTravel = trackHeight - thumbHeight;
    if (maxTravel <= 0) return;

    const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    thumb.style.transform = `translate(-50%, ${progress * maxTravel}px)`;
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
    const maxTravel = trackHeight - thumbHeight;
    if (maxTravel <= 0) return;

    const deltaY = e.clientY - startY;
    window.scrollTo(0, startScrollY + (deltaY / maxTravel) * maxScroll);
  });

  const stopDrag = (e) => {
    if (isDragging) {
      isDragging = false;
      thumb.classList.remove('dragging');
      try { thumb.releasePointerCapture(e.pointerId); } catch (_) {}
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
    const maxTravel = track.clientHeight - thumbHeight;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxTravel <= 0) return;

    const targetTravel = Math.min(maxTravel, Math.max(0, clickY - (thumbHeight / 2)));
    window.scrollTo(0, (targetTravel / maxTravel) * maxScroll);
  });

  // Atualização inicial
  requestAnimationFrame(update);
}
