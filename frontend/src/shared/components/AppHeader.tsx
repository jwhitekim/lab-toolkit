interface Props {
  title?: string
  right?: React.ReactNode
}

export default function AppHeader({ title, right }: Props) {
  return (
    <header style={{
      height: 'var(--header-h)',
      position: 'sticky',
      top: 0,
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 12,
      zIndex: 100,
      flexShrink: 0,
    }}>
      {title && (
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
      )}
      <div style={{ flex: 1 }} />
      {right}
    </header>
  )
}
