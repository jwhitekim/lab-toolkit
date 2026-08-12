import type { CSSProperties } from 'react'

// TodoItem/FocusPanel이 공유하는 우선순위 배지 스타일 — 앱 전역 흑백 톤(--selected-bg 등)에 맞춤.
export const priorityStyle: Record<string, CSSProperties> = {
  urgent: { background: 'var(--selected-bg)', color: 'var(--selected-text)' },
  mid:    { background: 'var(--bg-additive)', color: 'var(--text-primary)' },
  normal: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
}

export const priorityLabel: Record<string, string> = { urgent: '긴급', mid: '보통', normal: '낮음' }
