import { useState, useRef, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import dayjs from 'dayjs'
import type { Todo } from '@/shared/types'
import { priorityStyle, priorityLabels } from './priority'
import { useT } from '@/shared/i18n'

interface Props {
  todo: Todo
  selected: boolean
  onSelect: () => void
  onToggle: () => void
  onEdit: (id: number, name: string) => void
}

export default function TodoItem({ todo, selected, onSelect, onToggle, onEdit }: Props) {
  const t = useT()
  const priorityLabel = priorityLabels(t)
  const [animating, setAnimating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(todo.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const completedSteps = todo.steps.filter(s => s.done).length
  const totalSteps = todo.steps.length

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!todo.done) setAnimating(true)
    onToggle()
  }

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(todo.name)
    setIsEditing(true)
  }

  const commitEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== todo.name) onEdit(todo.id, trimmed)
    setIsEditing(false)
  }

  const cancelEdit = () => {
    setEditValue(todo.name)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') cancelEdit()
  }

  return (
    <div
      onClick={isEditing ? undefined : onSelect}
      style={{ transition: 'background 0.15s ease', background: selected ? 'var(--bg-additive)' : undefined }}
      className="group px-3 py-2.5 rounded-md cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <button
          onClick={handleToggle}
          style={{
            background: todo.done ? 'var(--selected-bg)' : undefined,
            borderColor: todo.done ? 'var(--selected-bg)' : 'var(--border-subtle)',
            transition: 'background 0.2s ease, border-color 0.2s ease',
          }}
          className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border"
        >
          {todo.done && (
            <svg viewBox="0 0 12 10" fill="none" className="w-full h-full p-0.5">
              <path
                className={animating ? 'check-path' : ''}
                d="M1 5l3.5 3.5L11 1"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500, ...priorityStyle[todo.priority] }}>
              {priorityLabel[todo.priority]}
            </span>
            {todo.deadline && (
              <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>
                {/^\d{4}-\d{2}-\d{2}$/.test(todo.deadline) ? dayjs(todo.deadline).format('M/D') : todo.deadline}
              </span>
            )}
          </div>

          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitEdit}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 16, marginTop: 2, background: 'transparent', borderBottom: '1px solid var(--selected-bg)', outline: 'none', color: 'var(--text-primary)', width: '100%' }}
            />
          ) : (
            <p style={{
              fontSize: 13, marginTop: 2, lineHeight: 1.4,
              color: todo.done ? 'var(--text-disabled)' : 'var(--text-primary)',
              textDecoration: todo.done ? 'line-through' : 'none',
              textDecorationColor: 'var(--text-disabled)',
            }}>
              {todo.name}
            </p>
          )}

          {totalSteps > 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 2 }}>
              {t('todo.detail.stepsCompleted', { done: completedSteps, total: totalSteps })}
            </p>
          )}
        </div>

        {!todo.done && !isEditing && (
          <button
            onClick={startEdit}
            style={{ color: 'var(--text-disabled)' }}
            className="flex-shrink-0 mt-0.5 p-0.5 rounded opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
