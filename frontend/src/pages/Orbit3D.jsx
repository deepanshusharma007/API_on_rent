import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { marketplaceAPI } from '../api/client';
import './Orbit3D.css';

const OrbitScene = lazy(() => import('../components/three/OrbitScene'));

// Token caps from the plan tiers; the API value wins when it is available.
const TIERS = [
  { minutes: 15, name: '15 minutes', tokens: 20000 },
  { minutes: 30, name: '30 minutes', tokens: 40000 },
  { minutes: 60, name: '1 hour', tokens: 80000 },
  { minutes: 1440, name: '24 hours', tokens: 1200000 },
];

const THEMES = {
  light: { center: '#123a2c', planet: '#111111', accent: '#aacd2a', line: '#123a2c', lineOpacity: 0.28 },
  dark: { center: '#bfe23a', planet: '#f7f2e8', accent: '#bfe23a', line: '#f7f2e8', lineOpacity: 0.3 },
};

const fmtTokens = (n) => (n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}K` : String(n));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function readTheme() {
  try {
    return localStorage.getItem('orbit_theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export default function Orbit3D() {
  const [selected, setSelected] = useState(2);
  const [theme, setTheme] = useState(readTheme);
  const [plans, setPlans] = useState([]);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const webgl = useMemo(() => hasWebGL(), []);

  useEffect(() => {
    let alive = true;
    marketplaceAPI
      .getPlans()
      .then((res) => alive && Array.isArray(res.data) && setPlans(res.data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('orbit_theme', next);
    } catch {
      /* private mode: the choice just won't persist */
    }
  };

  const tier = TIERS[selected];
  const plan = plans.find((p) => Number(p.duration_minutes) === tier.minutes);
  const tokens = plan?.token_cap ? Number(plan.token_cap) : tier.tokens;
  const price = plan?.price != null ? `₹${plan.price}` : 'Price at checkout';

  return (
    <div className="orb" data-theme={theme}>
      <header className="orb-nav">
        <Link to="/" className="orb-mark">AIRent</Link>
        <nav className="orb-links">
          <Link to="/pricing">Pricing</Link>
          <Link to="/docs">Docs</Link>
          <Link to="/status">Status</Link>
          <Link to="/login">Sign in</Link>
        </nav>
        <div className="orb-nav-right">
          <button type="button" className="orb-theme" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
          <Link to="/marketplace" className="orb-btn">Rent a key</Link>
        </div>
      </header>

      <main className="orb-main">
        <section className="orb-copy">
          <p className="orb-kicker">Pick a duration</p>
          <h1 className="orb-h1">Pay for the time you use. <span>Nothing else.</span></h1>
          <p className="orb-lede">
            Four sizes, 15 minutes to 24 hours. Each one has a token cap and a flat price. Drag the system to spin it, tap a planet to compare.
          </p>
          <div className="orb-actions">
            <Link to="/marketplace" className="orb-btn">Rent a key</Link>
            <Link to="/pricing" className="orb-btn orb-btn-ghost">See pricing</Link>
          </div>
        </section>

        <section className="orb-stage" aria-label="Interactive map of rental durations">
          {webgl && (
            <Suspense fallback={null}>
              <OrbitScene selected={selected} onSelect={setSelected} colors={THEMES[theme]} reduced={reduced} />
            </Suspense>
          )}

          <div className="orb-card" aria-live="polite">
            <div className="orb-card-name">{tier.name}</div>
            <div className="orb-card-row">{fmtTokens(tokens)} tokens</div>
            <div className="orb-card-price">{price}</div>
            <Link to="/marketplace" className="orb-card-link">Rent this</Link>
          </div>

          <div className="orb-tabs" role="group" aria-label="Choose a duration">
            {TIERS.map((t, i) => (
              <button
                key={t.minutes}
                type="button"
                className={i === selected ? 'is-sel' : ''}
                aria-pressed={i === selected}
                onClick={() => setSelected(i)}
              >
                {t.name}
              </button>
            ))}
          </div>
          <p className="orb-hint">Drag to spin and tilt</p>
        </section>
      </main>
    </div>
  );
}
