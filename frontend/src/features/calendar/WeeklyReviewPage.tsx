import { useState, useEffect } from 'react'
import AppHeader from '@/shared/components/AppHeader'
import { useShellNav } from '@/shared/hooks/useShellNav'
import * as api from '@/shared/api/client'
import type { WeeklyReview } from '@/shared/types'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

const PRIORITY_LABEL: Record<string, string> = { urgent: '긴급', mid: '보통', normal: '낮음' }
const PRIORITY_COLOR: Record<string, string> = { urgent: '#a32d2d', mid: '#854f0b', normal: '#0f6e56' }

export default function WeeklyReview() {
  const { setActive } = useShellNav()
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [data, setData] = useState<WeeklyReview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api.getWeeklyReview(weekStart.toISOString())
      .then(setData)
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [weekStart])

  const prevWeek = () => setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() - 7); return d })
  const nextWeek = () => setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() + 7); return d })

  const statCard = (label: string, value: string | number) => (
    <div style={{ flex: 1, minWidth: 110, background: 'var(--bg-additive)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', overflow: 'hidden' }}>
      <AppHeader
        title="주간 리뷰"
        right={
          <button
            onClick={() => setActive('todo')}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
          >
            할일 목록
          </button>
        }
      />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <button onClick={prevWeek} style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', minWidth: 180, textAlign: 'center' }}>
          {fmtDate(weekStart.toISOString())} – {fmtDate(new Date(weekStart.getTime() + 6 * 86400000).toISOString())}
        </span>
        <button onClick={nextWeek} style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' }}>›</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {loading && <p style={{ fontSize: 13, color: 'var(--text-disabled)' }}>불러오는 중...</p>}
        {error && <p style={{ fontSize: 13, color: 'var(--c-error)' }}>{error}</p>}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680 }}>
            {/* 통계 카드 */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {statCard('완료', data.completed)}
              {statCard('생성', data.created)}
              {statCard('완료율', `${Math.round(data.completion_rate * 100)}%`)}
              {statCard('밀린 할일', data.overdue.length)}
            </div>

            {/* 우선순위별 분포 */}
            <div style={{ background: 'var(--bg-additive)', borderRadius: 10, padding: '16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>우선순위별 현황</div>
              {(['urgent', 'mid', 'normal'] as const).map(p => {
                const { done, todo } = data.by_priority[p] ?? { done: 0, todo: 0 }
                const total = done + todo
                const pct = total ? Math.round((done / total) * 100) : 0
                return (
                  <div key={p} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: PRIORITY_COLOR[p], fontWeight: 600 }}>{PRIORITY_LABEL[p]}</span>
                      <span style={{ color: 'var(--text-disabled)' }}>{done}/{total}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: PRIORITY_COLOR[p], borderRadius: 3, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 밀린 할일 목록 */}
            {data.overdue.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  밀린 할일 ({data.overdue.length}개)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {data.overdue.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActive('todo')}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-additive)', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--text-primary)' }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[t.priority], flexShrink: 0 }} />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
