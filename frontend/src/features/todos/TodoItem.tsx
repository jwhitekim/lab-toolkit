import { useState, useRef, useEffect } from 'react'
import { ChevronRight, Pencil } from 'lucide-react'
import dayjs from 'dayjs'
import type { Todo } from '@/shared/types'
import { priorityStyle, priorityLabels } from './priority'
import { useT } from '@/shared/i18n'

interface Props {
  todo: Todo
  selected: boolean
  featured?: boolean
  onSelect: () => void
  onOpen?: () => void
  onToggle: () => void
  onEdit: (id: number, name: string) => void
}

export default function TodoItem({ todo, selected, featured = false, onSelect, onOpen, onToggle, onEdit }: Props) {
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

  const openDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpen?.()
  }

  const selectItem = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
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

  const deadline = todo.deadline
    ? (/^\d{4}-\d{2}-\d{2}$/.test(todo.deadline) ? dayjs(todo.deadline).format('M/D') : todo.deadline)
    : null

  return (
    <article
      onClick={isEditing ? undefined : onSelect}
      className={`todo-item${selected ? ' is-selected' : ''}${featured ? ' is-featured' : ''}${todo.done ? ' is-done' : ''}`}
    >
      <button onClick={handleToggle} className="todo-item-check" aria-label={todo.name}>
        {todo.done && (
          <svg viewBox="0 0 12 10" fill="none">
            <path className={animating ? 'check-path' : ''} d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="todo-item-main">
        {isEditing ? (
          <>
            <input
              ref={inputRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitEdit}
              className="todo-item-edit-input"
            />
            {(deadline || totalSteps > 0) && (
              <div className="todo-item-meta">
                {deadline && <span>{deadline}</span>}
                {totalSteps > 0 && <span>{t('todo.detail.stepsCompleted', { done: completedSteps, total: totalSteps })}</span>}
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            className="todo-item-select"
            onClick={selectItem}
            aria-current={selected ? 'true' : undefined}
            aria-pressed={onOpen ? featured : undefined}
          >
            <p className="todo-item-title">{todo.name}</p>
            {(deadline || totalSteps > 0) && (
              <span className="todo-item-meta">
                {deadline && <span>{deadline}</span>}
                {totalSteps > 0 && <span>{t('todo.detail.stepsCompleted', { done: completedSteps, total: totalSteps })}</span>}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="todo-item-side">
        <span className="todo-item-priority" style={priorityStyle[todo.priority]}>{priorityLabel[todo.priority]}</span>
        {!todo.done && !isEditing && <button onClick={startEdit} className="todo-item-edit" aria-label={t('common.edit')}><Pencil /></button>}
        {onOpen && !isEditing && (
          <button onClick={openDetails} className="todo-item-open" aria-label={t('todo.openDetail')} title={t('todo.openDetail')}>
            <ChevronRight />
          </button>
        )}
      </div>
    </article>
  )
}
