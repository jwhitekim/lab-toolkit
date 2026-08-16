import { useT } from '@/shared/i18n'

interface Props {
  redirectTo?: string
}

export function SessionExpiredMessage({ redirectTo = '/translate' }: Props) {
  const t = useT()
  const loginUrl = `/login?redirect=${encodeURIComponent(redirectTo)}`
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', background: '#fef7e0',
      borderRadius: 8, fontSize: 14, color: '#7c4c00',
    }}>
      <span>⚠ {t('common.sessionExpired')}</span>
      <a href={loginUrl} style={{ color: '#1a73e8', fontWeight: 500 }}>{t('common.loginAgain')}</a>
    </div>
  )
}
