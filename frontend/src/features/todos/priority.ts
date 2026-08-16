import type { CSSProperties } from 'react'

// TodoItem/FocusPanel이 공유하는 우선순위 배지 스타일 — 앱 전역 흑백 톤(--selected-bg 등)에 맞춤.
export const priorityStyle: Record<string, CSSProperties> = {
  urgent: { background: 'var(--selected-bg)', color: 'var(--selected-text)' },
  mid:    { background: 'var(--bg-additive)', color: 'var(--text-primary)' },
  normal: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
}

// 라벨은 언어별로 달라지므로 상수가 아니라 t()를 받아 만드는 함수로 제공.
export function priorityLabels(t: (key: string) => string): Record<string, string> {
  return {
    urgent: t('todo.priority.urgent'),
    mid:    t('todo.priority.mid'),
    normal: t('todo.priority.normal'),
  }
}
