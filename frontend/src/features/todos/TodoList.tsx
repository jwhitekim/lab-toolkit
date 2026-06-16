import { useState } from 'react'
import { Plus } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import type { Todo, NavFilter, Priority } from '@/shared/types'
import TodoItem from './TodoItem'
import AddTodoModal from './AddTodoModal'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

dayjs.locale('ko')

interface Props {
  todos: Todo[]
  filter: NavFilter
  onFilter: (f: NavFilter) => void
  selectedId: number | null
  onSelect: (id: number) => void
  onToggle: (id: number) => void
  onEdit: (id: number, name: string) => void
  onAdd: (data: { name: string; memo: string; priority: Priority; deadline: string }) => Promise<void>
  width?: number
}

const filterTabs: { label: string; key: NavFilter }[] = [
  { label: '오늘', key: 'today' },
  { label: '이번주', key: 'week' },
  { label: '전체', key: 'all' },
  { label: '메모', key: 'memo' },
]

export default function TodoList({ todos, filter, onFilter, selectedId, onSelect, onToggle, onEdit, onAdd, width }: Props) {
  const [showModal, setShowModal] = useState(false)
  const isMobile = useIsMobile()

  const active = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)

  const filterSubtitle = filter === 'today' ? dayjs().format('YYYY년 M월 D일') : null

  return (
    <div
      className="flex flex-col h-full border-r"
      style={{ width: width ?? '100%', flexShrink: width !== undefined ? 0 : undefined, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-additive)' }}
    >
      <div className="px-3 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>Todo List</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              {active.length}개 진행 중{filterSubtitle ? ` · ${filterSubtitle}` : ''}
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setShowModal(true)}
              type="button"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                height: 32, padding: '0 11px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)', background: 'var(--bg-base)',
                color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-sans)', flexShrink: 0,
              }}
            >
              <Plus size={14} />
              추가
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Todo 필터"
          className="mt-3 grid grid-cols-4 gap-1"
          style={{ borderRadius: 'var(--radius-md)', background: 'var(--bg-base)', padding: 3 }}
        >
          {filterTabs.map(item => {
            const isActive = filter === item.key
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onFilter(item.key)}
                style={{
                  minWidth: 0,
                  height: 32,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--selected-bg)' : 'transparent',
                  color: isActive ? 'var(--selected-text)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {active.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            selected={todo.id === selectedId}
            onSelect={() => onSelect(todo.id)}
            onToggle={() => onToggle(todo.id)}
            onEdit={onEdit}
          />
        ))}

        {done.length > 0 && (
          <>
            <div className="px-3 pt-3 pb-1 text-[11px] text-gray-400 dark:text-gray-600">완료됨 ({done.length})</div>
            {done.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                selected={todo.id === selectedId}
                onSelect={() => onSelect(todo.id)}
                onToggle={() => onToggle(todo.id)}
                onEdit={onEdit}
              />
            ))}
          </>
        )}

        {todos.length === 0 && (
          <div className="px-3 py-8 text-center text-[12px] text-gray-400 dark:text-gray-600">
            할 일이 없습니다
          </div>
        )}
      </div>

      {!isMobile && (
        <div className="p-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setShowModal(true)}
            className="sidebar-item"
            style={{ color: 'var(--text-secondary)', fontWeight: 500, gap: 6 }}
          >
            <Plus size={14} />
            할 일 추가
          </button>
        </div>
      )}

      {showModal && (
        <AddTodoModal
          onClose={() => setShowModal(false)}
          onSave={async data => { await onAdd(data) }}
        />
      )}
    </div>
  )
}
