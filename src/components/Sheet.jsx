export default function Sheet({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <>
      <div style={s.backdrop} onClick={onClose} />
      <div style={s.sheet}>
        <div style={s.header}>
          <span style={s.title}>{title}</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </>
  )
}

const s = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100 },
  sheet: {
    position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 600, margin: '0 auto',
    background: '#1a1a2e', borderRadius: '16px 16px 0 0',
    padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
    zIndex: 101, maxHeight: '88dvh', overflowY: 'auto',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontWeight: 700, fontSize: 17 },
  closeBtn: { background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 },
}
