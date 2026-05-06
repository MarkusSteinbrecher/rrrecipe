// App shell — composes all screens, navigation, tweaks panel.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#ffff00",
  "showFrame": true
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = React.useState('browse');
  React.useEffect(() => { window.appNav = setScreen; }, []);

  // Inject accent override
  React.useEffect(() => {
    const s = document.getElementById('accent-override') || document.createElement('style');
    s.id = 'accent-override';
    s.textContent = `:root { --accent: ${tweaks.accentColor}; --accent-tint: ${tweaks.accentColor}1a; }`;
    document.head.appendChild(s);
  }, [tweaks.accentColor]);

  const screens = {
    browse: <ScreenBrowse />,
    detail: <ScreenDetail />,
    mise:   <ScreenMise />,
    cook:   <ScreenCook />,
    timers: <ScreenTimers />,
  };

  const nav = [
    { id: 'browse', label: 'browse' },
    { id: 'detail', label: 'recipe' },
    { id: 'mise',   label: 'prep' },
    { id: 'cook',   label: 'cook' },
    { id: 'timers', label: 'timers' },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: '#050505',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 20px',
      fontFamily: "'IBM Plex Sans', -apple-system, system-ui, sans-serif",
    }}>
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 4, padding: 4,
        background: 'rgba(20,20,20,0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 999, zIndex: 100,
      }}>
        {nav.map((s) => (
          <button key={s.id} onClick={() => setScreen(s.id)} style={{
            padding: '7px 14px', borderRadius: 999, border: 'none',
            background: screen === s.id ? '#ffff00' : 'transparent',
            color: screen === s.id ? '#0a0a0a' : 'rgba(244,244,242,0.7)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>{s.label}</button>
        ))}
      </div>

      <div style={{ marginTop: 60 }}>
        {tweaks.showFrame ? (
          <IOSDevice width={402} height={874}>{screens[screen]}</IOSDevice>
        ) : (
          <div style={{ width: 402, height: 874, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            {screens[screen]}
          </div>
        )}
      </div>

      <TweaksPanel>
        <TweakSection title="Theme">
          <TweakColor label="Accent" value={tweaks.accentColor} onChange={(v) => setTweak('accentColor', v)} />
          <TweakToggle label="Device frame" value={tweaks.showFrame} onChange={(v) => setTweak('showFrame', v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
