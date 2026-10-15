const COLORS = ['#f0cb79', '#d75c76', '#72b7e6', '#8ccd7b', '#c685d8'];

/** CSS owns playback; removing the modal also stops the continuous shower. */
export function createCelebrationConfetti() {
  const layer = document.createElement('div');
  layer.className = 'TrialRunResult__Confetti';
  layer.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 98; index++) {
    const continuous = index >= 80;
    const piece = document.createElement('span');
    piece.className = `TrialRunResult__ConfettiPiece${continuous ? ' state-continuous' : ''}`;
    piece.style.setProperty('--trial-result-confetti-position', `${Math.random() * 100}%`);
    piece.style.setProperty('--trial-result-confetti-color', COLORS[index % COLORS.length]);
    // Start above the screen after the notification appears, then taper arrivals.
    // Squaring the normalized index makes arrivals frequent first and sparser later.
    const arrival = 180 + (index / 79) ** 2 * 2800;
    piece.style.setProperty('--trial-result-confetti-delay', `${continuous ? 180 + (index - 80) * 340 : arrival}ms`);
    piece.style.setProperty('--trial-result-confetti-duration', `${continuous ? 5400 + Math.random() * 1600 : 3200 + Math.random() * 800}ms`);
    piece.style.setProperty('--trial-result-confetti-drift', `${Math.random() * 160 - 80}px`);
    piece.style.setProperty('--trial-result-confetti-flutter-duration', `${700 + Math.random() * 1100}ms`);
    piece.style.setProperty('--trial-result-confetti-flutter-phase', `${-Math.random() * 1800}ms`);
    layer.append(piece);
  }
  return layer;
}
