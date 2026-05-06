// Browse — recipe library, rrradio-style

function ScreenBrowse() {
  const [tab, setTab] = React.useState('all');
  const [fav, setFav] = React.useState(new Set(['shakshuka', 'pasta']));
  const tabs = ['all', 'quick', 'brunch', 'dinner', 'baking'];

  return (
    <div className="rr-app">
      <div className="rr-topbar">
        <div className="rr-topbar-row">
          <div className="rr-wordmark"><span className="dot" />mise · recipes</div>
          <button className="rr-icon-btn"><Icon name="plus" /></button>
        </div>
        <div className="rr-search-wrap">
          <Icon name="search" />
          <input className="rr-search" placeholder="search recipes, ingredients" />
        </div>
        <div className="rr-filter-row">
          {tabs.map((t) => (
            <button key={t} className={`rr-chip ${tab === t ? 'is-active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="rr-content">
        <HeroFrame label="tonight's pick" code="01 / 06" title="shakshuka," accentTitle="35 min" />

        <div className="rr-section-label">
          <span>library</span>
          <span className="count">{BROWSE.length} RECIPES</span>
        </div>

        {BROWSE.map((r) => {
          const isFav = fav.has(r.id);
          return (
            <button key={r.id} className={`rr-row ${r.id === 'shakshuka' ? 'is-active' : ''}`} onClick={() => window.appNav?.('detail')}>
              <div className={`rr-fav ${r.tone || ''}`}>{r.mark}</div>
              <div className="rr-row-info">
                <div className="rr-row-name">{r.title}</div>
                <div className="rr-row-tags">{r.tags}</div>
              </div>
              <div className="rr-row-right">
                {r.curated && <Icon name="star" size={13} />}
                <span style={{ opacity: isFav ? 1 : 0.4, color: isFav ? 'var(--accent)' : 'inherit' }} onClick={(e) => { e.stopPropagation(); const n = new Set(fav); isFav ? n.delete(r.id) : n.add(r.id); setFav(n); }}>
                  <Icon name="heart" size={13} />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rr-tabbar">
        <button className="rr-tab-btn active"><Icon name="home" />home</button>
        <button className="rr-tab-btn"><Icon name="book" />library</button>
        <button className="rr-tab-btn"><Icon name="flame" />cooking</button>
        <button className="rr-tab-btn"><Icon name="heart" />saved</button>
      </div>
    </div>
  );
}

// Detail — pre-cook
function ScreenDetail() {
  const r = RECIPE;
  const [serv, setServ] = React.useState(r.servings);
  const totalIng = r.ingredients.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="rr-app">
      <div className="rr-topbar">
        <div className="rr-topbar-row">
          <button className="rr-icon-btn" onClick={() => window.appNav?.('browse')}><Icon name="back" /></button>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>recipe · 01</div>
          <button className="rr-icon-btn"><Icon name="heart" /></button>
        </div>
      </div>

      <div className="rr-content">
        <HeroFrame label={r.source.toLowerCase()} code="35 MIN · 06 STEPS" title={r.title.toLowerCase() + ','} accentTitle="easy" />

        <div style={{ padding: '22px 20px 18px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
            {r.tags.map((t) => t.toLowerCase()).join(' · ')}
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)', textWrap: 'pretty' }}>
            {r.description}
          </div>
        </div>

        <div className="rr-stats">
          <div className="cell"><div className="k">total</div><div className="v">{r.totalMinutes}<span style={{ opacity: 0.5, fontSize: 11, marginLeft: 2 }}>min</span></div></div>
          <div className="cell"><div className="k">active</div><div className="v">{r.activeMinutes}<span style={{ opacity: 0.5, fontSize: 11, marginLeft: 2 }}>min</span></div></div>
          <div className="cell"><div className="k">level</div><div className="v accent">{r.difficulty.toLowerCase()}</div></div>
        </div>

        <div className="rr-section-label" style={{ paddingTop: 24 }}>
          <span>ingredients · {totalIng}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-2)' }}>
            <button className="rr-icon-btn" style={{ width: 22, height: 22 }} onClick={() => setServ(Math.max(1, serv - 1))}><Icon name="minus" size={11} /></button>
            <span style={{ minWidth: 60, textAlign: 'center' }}>{serv} servings</span>
            <button className="rr-icon-btn" style={{ width: 22, height: 22 }} onClick={() => setServ(serv + 1)}><Icon name="plus" size={11} /></button>
          </span>
        </div>

        {r.ingredients.map((g) => (
          <React.Fragment key={g.group}>
            <div style={{ padding: '14px 20px 6px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>{g.group}</div>
            {g.items.map((it) => (
              <div key={it.id} className="rr-ing">
                <div className="qty">{it.qty}</div>
                <div className="name">{it.name}</div>
                <div />
              </div>
            ))}
          </React.Fragment>
        ))}

        <div className="rr-section-label" style={{ paddingTop: 30 }}>
          <span>the plan</span>
          <span className="count">{r.steps.length} STEPS</span>
        </div>
        {r.steps.map((s) => (
          <div key={s.n} className="rr-step-row">
            <div className="n">{String(s.n).padStart(2, '0')}</div>
            <div>
              <div className="title">{s.title}</div>
              <div className="detail">{s.detail.toLowerCase()}</div>
            </div>
            <div className="t">{s.timer ? `${s.timer.minutes}m` : '—'}</div>
          </div>
        ))}

        <button className="rr-action" onClick={() => window.appNav?.('mise')}>
          <Icon name="flame" size={13} /> begin cooking
        </button>
      </div>
    </div>
  );
}

// Mise en place — checklist
function ScreenMise() {
  const r = RECIPE;
  const [checked, setChecked] = React.useState(new Set(['oil', 'onion']));
  const total = r.ingredients.reduce((n, g) => n + g.items.length, 0);
  const pct = Math.round((checked.size / total) * 100);
  const toggle = (id) => { const n = new Set(checked); n.has(id) ? n.delete(id) : n.add(id); setChecked(n); };

  return (
    <div className="rr-app">
      <div className="rr-topbar">
        <div className="rr-topbar-row">
          <button className="rr-icon-btn" onClick={() => window.appNav?.('detail')}><Icon name="back" /></button>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>mise en place</div>
          <div style={{ width: 28 }} />
        </div>
      </div>

      <div style={{ padding: '22px 20px 14px' }}>
        <div style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          set yourself up.<br/><span style={{ color: 'var(--accent)' }}>then cook.</span>
        </div>
      </div>

      <div style={{ padding: '0 20px 14px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        <span>{checked.size} of {total} ready</span>
        <span style={{ color: 'var(--ink)' }}>{pct}%</span>
      </div>
      <div className="rr-progress"><i style={{ width: `${pct}%` }} /></div>

      <div className="rr-content" style={{ paddingTop: 8 }}>
        {r.ingredients.map((g) => (
          <React.Fragment key={g.group}>
            <div style={{ padding: '18px 20px 6px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>{g.group}</div>
            {g.items.map((it) => {
              const on = checked.has(it.id);
              return (
                <button key={it.id} className={`rr-ing ${on ? 'is-on' : ''}`} onClick={() => toggle(it.id)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
                  <div className="qty">{it.qty}</div>
                  <div className="name">{it.name}</div>
                  <div className="check">{on && <Icon name="check" size={10} />}</div>
                </button>
              );
            })}
          </React.Fragment>
        ))}
        <div style={{ padding: 20 }}>
          <button className="rr-action" onClick={() => window.appNav?.('cook')} style={{ width: '100%', margin: 0 }}>
            begin cooking <Icon name="chevR" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenBrowse, ScreenDetail, ScreenMise });
