/**
 * Controle de Ponto - Efeitos Sonoros e Feedback Háptico
 */

let audioCtx = null;

function playTickSound(isSuccess = true) {
  if (!soundEnabled) {
    // Mesmo sem som, mantém vibração leve se disponível
    if ('vibrate' in navigator) {
      try { navigator.vibrate(isSuccess ? [35] : [20, 40, 20]); } catch (e) {}
    }
    return;
  }

  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = isSuccess ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isSuccess ? 880 : 330, audioCtx.currentTime);
    if (isSuccess) {
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.08);
    } else {
      osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.06);
    }

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isSuccess ? 0.1 : 0.08));

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + (isSuccess ? 0.1 : 0.08));
  } catch (e) {
    // Silencioso caso áudio não seja suportado
  }

  // Vibração no celular
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(isSuccess ? [35] : [20, 40, 20]);
    } catch (e) {}
  }
}
