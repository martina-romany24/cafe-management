import { useEffect, useState, useMemo } from 'react';
import './IntroSplash.css';

const SLAT_COUNT = 14;

/**
 * Full-screen intro animation shown once when the app loads. Straight,
 * vertical wood panels backlit with warm gold light turn on one by one, the
 * crown emblem + wordmark glow in above them, then the panels split down the
 * middle and slide apart like double doors opening — with warm light
 * growing through the gap — to reveal the app underneath.
 *
 * Self-contained: mount it once near the root (e.g. in App.jsx) and it
 * handles its own timing and unmounts itself — no props required.
 * Respects prefers-reduced-motion (skips straight to done).
 */
export default function IntroSplash() {
  const [phase, setPhase] = useState('playing'); // playing -> opening -> done
  const prefersReduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    if (prefersReduced) {
      setPhase('done');
      return;
    }

    const openTimer = setTimeout(() => setPhase('opening'), 2300);
    const doneTimer = setTimeout(() => setPhase('done'), 3250);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(doneTimer);
    };
  }, [prefersReduced]);

  if (phase === 'done') return null;

  return (
    <div className={`intro-splash ${phase === 'opening' ? 'opening' : ''}`}>
      <div className="intro-splash__bloom" />

      <div className="intro-splash__slats">
        {Array.from({ length: SLAT_COUNT }).map((_, i) => (
          <div
            key={i}
            className="intro-splash__slat"
            style={{ animationDelay: `${i * 0.045}s` }}
          />
        ))}
      </div>

      <div className="intro-splash__content">
        <svg className="intro-splash__crown" viewBox="0 0 64 64" fill="none">
          <path
            d="M8 46L4 20l14 10 14-20 14 20 14-10-4 26H8Z"
            stroke="#f3c987"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <rect x="8" y="46" width="48" height="6" rx="1.5" fill="#f3c987" />
        </svg>
        <div className="intro-splash__word">ابن الباشا</div>
        <div className="intro-splash__sub">CAFE</div>
      </div>
    </div>
  );
}