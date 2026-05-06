// Cook mode + Timers — rrradio-style

function ScreenCook({ layout = 'fullbleed' }) {
  const r = RECIPE;
  const [idx, setIdx] = React.useState(0);
  const [voice, setVoice] = React.useState(false);
  const [timer, setTimer] = React.useState(null);
  const step = r.steps[idx];

  React.useEffect(() => {
    if (step.timer) setTimer({ remaining: step.timer.minutes * 60, total: step.timer.minutes * 60, running: false });
    else setTimer(null);
  }, [idx]);

  React.useEffect(() => {
    if (!timer || !timer.running) return;
    const id = setInterval(() => setTimer((t) => t && t.running ? { ...t, remaining: Math.max(0, t.remaining - 1), running: t.remaining > 1 } : t), 1000);
    return () => clearInterval(id);
  }, [timer?.running]);

  const next = () => idx < r.steps.length - 1 && setIdx(idx + 1);
  const prev = () => idx > 0 && setIdx(idx - 1);
  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const pct = timer ? (timer.total - timer.remaining) / timer.total * 100 : 0;

  return (
    <div className="rr-app">
      <div className="rr-cook__header">
        <button className="rr-icon-btn" onClick={() => window.appNav?.('detail')}><Icon name="close" /></button>
        <div className="rr-cook__pips">
          {r.steps.map((_, i) => (
            <i key={i} className={i < idx ? 'done' : i === idx ? 'now' : ''} />
          ))}
        </div>
        <button className="rr-icon-btn" onClick={() => window.appNav?.('timers')}><Icon name="timer" /></button>
        <button className="rr-icon-btn" onClick={() => setVoice(!voice)} style={voice ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}><Icon name="mic" /></button>
      </div>

      <div className="rr-cook__photo">
        <div className="rr-cook__stripes" />
        <div className="rr-cook__label">step {String(step.n).padStart(2,'0')} · {step.detail.toLowerCase()}</div>
        {step.timer && (
          <button className="rr-cook__media-toggle"><Icon name="play" size={10} /> watch</button>
        )}
      </div>

      <div className="rr-cook__body" onClick={next} style={{ cursor: 'pointer' }}>
        <div className="rr-cook__num">
          <span>step {String(step.n).padStart(2,'0')} / {String(r.steps.length).padStart(2,'0')}</span>
          <span className="rule" />
          {step.timer && <span>{step.timer.label.toLowerCase()} · {step.timer.minutes}m</span>}
        </div>

        <div className="rr-cook__title">
          {step.title.split(' ').slice(0, -1).join(' ')} <span className="accent">{step.title.split(' ').slice(-1)}</span>
        </div>

        <div className="rr-cook__instr">{step.instruction}</div>

        {step.tip && (
          <div className="rr-cook__tip"><strong>TIP</strong> &nbsp;{step.tip}</div>
        )}

        {timer && (
          <div className="rr-cook__timer" onClick={(e) => e.stopPropagation()}>
            <svg className="ring" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="18" fill="none" stroke="var(--line-2)" strokeWidth="2" />
              <circle cx="21" cy="21" r="18" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - pct/100)}`}
                transform="rotate(-90 21 21)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div style={{ flex: 1 }}>
              <div className="label">{step.timer.label}</div>
              <div className="clock">{fmt(timer.remaining)}</div>
            </div>
            <button className="go" onClick={() => setTimer((t) => ({ ...t, running: !t.running }))}>
              <Icon name={timer.running ? 'pause' : 'play'} size={11} />
            </button>
          </div>
        )}
      </div>

      <div className="rr-cook__nav">
        <button className="rr-cook__back" onClick={prev} disabled={idx === 0} style={{ opacity: idx === 0 ? 0.4 : 1 }}>
          <Icon name="chevL" size={11} /> back
        </button>
        <button className="rr-cook__next" onClick={next}>
          {idx === r.steps.length - 1 ? 'finish' : 'next step'} <Icon name="chevR" size={11} />
        </button>
      </div>

      {voice && (
        <div className="rr-voice">
          <span className="bars"><i /><i /><i /></span>
          listening · "next step"
        </div>
      )}
    </div>
  );
}

// Timers overview
function ScreenTimers() {
  const timers = [
    { id: 't1', label: 'Reduce sauce', recipe: 'Shakshuka · step 03', remaining: 432, total: 720, running: true },
    { id: 't2', label: 'Toast bread', recipe: 'Side', remaining: 75, total: 180, running: true },
    { id: 't3', label: 'Cool cake', recipe: 'Olive oil cake · step 07', remaining: 1280, total: 1800, running: true },
    { id: 't4', label: 'Bloom yeast', recipe: 'Tomorrow\'s loaf', remaining: 0, total: 600, running: false, done: true },
  ];
  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="rr-app">
      <div className="rr-topbar">
        <div className="rr-topbar-row">
          <button className="rr-icon-btn" onClick={() => window.appNav?.('cook')}><Icon name="close" /></button>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>timers</div>
          <button className="rr-icon-btn"><Icon name="plus" /></button>
        </div>
      </div>

      <div style={{ padding: '24px 20px 22px' }}>
        <div style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {timers.filter((t) => t.running).length} <span style={{ color: 'var(--ink-3)' }}>running</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginTop: 8 }}>
          next: bread in 1:15
        </div>
      </div>

      <div className="rr-content">
        {timers.map((t) => {
          const pct = t.total ? (1 - t.remaining / t.total) * 100 : 100;
          const urgent = t.remaining > 0 && t.remaining < 120;
          return (
            <div key={t.id} className={`rr-timer-card ${urgent ? 'is-urgent' : ''} ${t.done ? 'is-done' : ''}`}>
              <div className="head">
                <div>
                  <div className="meta">{t.recipe.toLowerCase()}</div>
                  <div className="label">{t.label}</div>
                </div>
                <div className="clock">{t.done ? 'DONE' : fmt(t.remaining)}</div>
              </div>
              <div className="actions">
                {!t.done ? (
                  <>
                    <button className="primary"><Icon name={t.running ? 'pause' : 'play'} size={10} /> {t.running ? 'pause' : 'resume'}</button>
                    <button>+1 min</button>
                    <button>reset</button>
                  </>
                ) : (
                  <button className="primary">dismiss</button>
                )}
              </div>
              {!t.done && <div className="bar" style={{ width: `${pct}%` }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenCook, ScreenTimers });
