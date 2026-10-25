import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { marketplaceAPI } from '../api/client';
import './Landing3D.css';

const KeyScene = lazy(() => import('../components/three/KeyScene'));

const RENT_SECONDS = 900;

// Token caps from the plan tiers; the plans API wins when it has a value.
const TIERS = [
  { minutes: 15, name: '15 minutes', tokens: 20000 },
  { minutes: 30, name: '30 minutes', tokens: 40000 },
  { minutes: 60, name: '1 hour', tokens: 80000 },
  { minutes: 1440, name: '24 hours', tokens: 1200000 },
];
const fmtTokens = (n) => (n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}K` : String(n));

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mmss = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function Landing3D() {
  const wrap = useRef(null);
  const stage = useRef(null);
  const numerals = useRef(null);
  const expiresCell = useRef(null);
  const scroll = useRef({ s: 0 });
  const store = useRef({ phase: 'forge', p: 1 });
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const webgl = useMemo(() => hasWebGL(), []);
  const [plans, setPlans] = useState([]);

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

  useEffect(() => {
    const onScroll = () => {
      const max = wrap.current.offsetHeight - window.innerHeight;
      const s = clamp(window.scrollY / max, 0, 1);
      scroll.current.s = s;
      const st = stage.current;
      st.style.setProperty('--b1', 1 - smooth(0.14, 0.26, s));
      st.style.setProperty('--b2', smooth(0.3, 0.4, s) * (1 - smooth(0.58, 0.68, s)));
      st.style.setProperty('--b3', smooth(0.74, 0.86, s));
      st.classList.toggle('hero', s < 0.16);
      st.classList.toggle('cta', s > 0.74);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // The scene writes into `store`; the DOM reads it here, so React never re-renders per frame.
    const id = setInterval(() => {
      const { p, phase } = store.current;
      const text = mmss(Math.round(RENT_SECONDS * p));
      if (numerals.current) {
        numerals.current.textContent = text;
        numerals.current.classList.toggle('expired', phase === 'burst' || phase === 'gap');
      }
      if (expiresCell.current) {
        expiresCell.current.textContent = phase === 'burst' || phase === 'gap' ? 'expired' : `in ${text}`;
      }
    }, 100);

    return () => {
      clearInterval(id);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="l3d">
      <div className="l3d-wrap" ref={wrap}>
        <div className="l3d-stage hero" ref={stage}>
          <div className="l3d-halo" aria-hidden="true" />
          <div className="l3d-num" ref={numerals} aria-hidden="true">15:00</div>

          <div className="l3d-canvas" aria-hidden="true">
            {webgl && (
              <Suspense fallback={null}>
                <KeyScene store={store} scroll={scroll} reduced={reduced} />
              </Suspense>
            )}
          </div>

          <header className="l3d-nav">
            <Link to="/" className="l3d-mark">AIRent</Link>
            <nav>
              <Link to="/pricing">Pricing</Link>
              <Link to="/docs">Docs</Link>
              <Link to="/status">Status</Link>
              <Link to="/login">Sign in</Link>
            </nav>
            <Link to="/marketplace" className="l3d-pill l3d-pill-solid">Rent a key</Link>
          </header>

          <div className="l3d-beat l3d-b1">
            <div className="l3d-copy">
              <p className="l3d-kicker">vk_7f3a9c &middot; gpt-4o &middot; 20K tokens</p>
              <h1 className="l3d-h1">
                Rent a GPT-4o key. <em>15 minutes.</em> Then it&rsquo;s gone.
              </h1>
              <p className="l3d-lede">
                OpenAI, Claude and Gemini through one OpenAI-compatible endpoint. No subscription. The key expires on its own.
              </p>
              <div className="l3d-actions">
                <Link to="/marketplace" className="l3d-pill l3d-pill-solid">Rent a key &rarr;</Link>
                <Link to="/docs" className="l3d-pill l3d-pill-ghost">Read the docs</Link>
              </div>
            </div>
            <dl className="l3d-plate">
              <dt>Provider</dt><dd>gpt-4o</dd>
              <dt>Duration</dt><dd>15 min</dd>
              <dt>Tokens</dt><dd>20K</dd>
              <dt>Expires</dt><dd className="l3d-hot" ref={expiresCell}>in 15:00</dd>
              <dt>Demo</dt><dd>45x speed</dd>
            </dl>
          </div>

          <div className="l3d-beat l3d-b2">
            <ol className="l3d-list l3d-steps">
              <li><span>01</span>Swap the base URL.</li>
              <li><span>02</span>Keep your SDK and your code.</li>
              <li><span>03</span>Pay once. The key expires by itself.</li>
            </ol>
            <div className="l3d-foot">
              <h2 className="l3d-h2">One endpoint for OpenAI, Anthropic and Google.</h2>
              <pre className="l3d-code">{`client = OpenAI(
  base_url="YOUR_AIRENT_URL/v1",
  api_key="vk_7f3a9c",
)`}</pre>
            </div>
          </div>

          <div className="l3d-beat l3d-b3">
            <ul className="l3d-list l3d-tiers">
              {TIERS.map((t) => {
                const plan = plans.find((p) => Number(p.duration_minutes) === t.minutes);
                const tokens = plan?.token_cap ? Number(plan.token_cap) : t.tokens;
                return (
                  <li key={t.minutes}>
                    <span className="l3d-tier-name">{t.name}</span>
                    <span className="l3d-tier-tokens">{fmtTokens(tokens)} tokens</span>
                    {plan?.price != null && <span className="l3d-tier-price">{`₹${plan.price}`}</span>}
                  </li>
                );
              })}
            </ul>
            <div className="l3d-foot">
              <h2 className="l3d-h2 l3d-h2-lg">Pick a duration.<br /><em>Pay once.</em></h2>
              <div className="l3d-actions">
                <Link to="/marketplace" className="l3d-pill l3d-pill-solid">Rent a key &rarr;</Link>
                <Link to="/pricing" className="l3d-pill l3d-pill-ghost">See pricing</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
