/** Animates entry independently of the fixed-aspect sizing transform. */
export function playTrialResultEntrance({ paper, container, pass, announceEnd = !pass, shrinkPaper = pass, endText }) {
  const animations = [];
  let disposed = false;
  let announcement;
  const animate = async (node, frames, options) => {
    const animation = node.animate(frames, { ...options, fill: 'forwards' });
    animations.push(animation);
    await animation.finished;
  };
  paper.style.opacity = '0';
  const finished = (async () => {
    if (!paper.animate || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      paper.style.opacity = '1';
      return;
    }
    try {
      if (announceEnd) {
        announcement = document.createElement('div');
        announcement.className = 'TrialResultEntrance__End';
        announcement.textContent = endText;
        announcement.setAttribute('role', 'status');
        container.append(announcement);
        await animate(announcement, [
          { opacity: 0, offset: 0 }, { opacity: 1, offset: .15 },
          { opacity: 1, offset: .85 }, { opacity: 0, offset: 1 },
        ], { duration: 3000, easing: 'ease-in-out' });
        announcement.remove();
      }
      if (disposed) return;
      await animate(paper, [
        { opacity: 0, scale: shrinkPaper ? '1.35' : '.65' },
        { opacity: 1, scale: '1' },
      ], { duration: 750, delay: pass ? 350 : 0, easing: 'cubic-bezier(.2,.75,.25,1)' });
      paper.style.opacity = '1';
      animations.forEach(animation => animation.cancel());
    } catch (error) { if (!disposed) throw error; }
  })();
  return { finished, dispose() { disposed = true; animations.forEach(animation => animation.cancel()); announcement?.remove(); } };
}
