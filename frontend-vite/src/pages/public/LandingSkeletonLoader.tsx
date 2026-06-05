export default function LandingSkeletonLoader() {
  return (
    <div className="landing-view">
      <style>{`@keyframes skel{0%{opacity:.3}50%{opacity:.6}100%{opacity:.3}}`}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'center', marginBottom: 60 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ height: 40, width: '70%', background: 'rgba(148,163,184,0.15)', borderRadius: 8, marginBottom: 16, animation: 'skel 1.5s ease-in-out infinite' }} />
            <div style={{ height: 20, width: '90%', background: 'rgba(148,163,184,0.1)', borderRadius: 6, marginBottom: 10, animation: 'skel 1.5s ease-in-out infinite' }} />
            <div style={{ height: 20, width: '60%', background: 'rgba(148,163,184,0.1)', borderRadius: 6, animation: 'skel 1.5s ease-in-out infinite' }} />
          </div>
          <div style={{ width: '100%', maxWidth: 500, height: 320, background: 'rgba(148,163,184,0.08)', borderRadius: 16, animation: 'skel 1.5s ease-in-out infinite' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 60 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 180, background: 'rgba(148,163,184,0.08)', borderRadius: 12, animation: 'skel 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: 160, height: 180, background: 'rgba(148,163,184,0.08)', borderRadius: 12, animation: 'skel 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
