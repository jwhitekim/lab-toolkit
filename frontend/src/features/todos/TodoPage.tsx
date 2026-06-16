import { useState, useCallback, useRef, useEffect } from 'react'
import { BarChart3, CalendarDays } from 'lucide-react'
import { useShellNav } from '@/shared/hooks/useShellNav'
import type { NavFilter, Priority, Todo } from '@/shared/types'
import { useTodos } from './hooks/useTodos'
import { useAi } from './hooks/useAi'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import AppHeader from '@/shared/components/AppHeader'
import Sidebar from './Sidebar'
import TodoList from './TodoList'
import FocusPanel from './FocusPanel'
import * as api from '@/shared/api/client'

const navItems: { label: string; key: NavFilter }[] = [
  { label: '오늘', key: 'today' },
  { label: '이번주', key: 'week' },
  { label: '전체', key: 'all' },
  { label: '메모', key: 'memo' },
]

function MobileTabBar({ filter, onFilter }: { filter: NavFilter; onFilter: (f: NavFilter) => void }) {
  return (
    <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {navItems.map(item => (
        <button
          key={item.key}
          onClick={() => onFilter(item.key)}
          style={{
            flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 500,
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            borderBottom: filter === item.key ? '2px solid var(--text-primary)' : '2px solid transparent',
            color: filter === item.key ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

const LIST_MIN = 120
const LIST_MAX = 600
const LIST_DEFAULT = 220

export default function TodoPage() {
  const { setActive } = useShellNav()
  const isMobile = useIsMobile()
  const [filter, setFilter] = useState<NavFilter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [listWidth, setListWidth] = useState(LIST_DEFAULT)

  const { todos, loading, reload, addTodo, editTodo, removeTodo, toggleDone, refresh, toastError, clearToastError } = useTodos(filter)

  useEffect(() => {
    if (!toastError) return
    const t = setTimeout(clearToastError, 3000)
    return () => clearTimeout(t)
  }, [toastError, clearToastError])
  const { generateSteps, generateStrategy, generatingSteps, generatingStrategy } = useAi()

  const selectedTodo = todos.find(t => t.id === selectedId) ?? null

  const dragRef = useRef<{ startX: number; startW: number } | null>(null)

  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startW: listWidth }
    document.documentElement.classList.add('is-resizing')

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = ev.clientX - dragRef.current.startX
      setListWidth(Math.max(LIST_MIN, Math.min(LIST_MAX, dragRef.current.startW + delta)))
    }

    const onUp = () => {
      dragRef.current = null
      document.documentElement.classList.remove('is-resizing')
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [listWidth])

  const handleAdd = async (data: { name: string; memo: string; priority: Priority; deadline: string }) => {
    const todo = await addTodo(data)
    setSelectedId(todo.id)
    await reload()
    // 백그라운드에서 AI 단계 생성 요청 후 steps 생길 때까지 폴링
    api.generateStepsAsync({
      todo_id: todo.id,
      todo_name: todo.name,
      memo: todo.memo,
      priority: todo.priority,
      deadline: todo.deadline,
    }).catch(() => {});
    // 전략 생성 (fire-and-forget)
    ;(async () => {
      try {
        const allTodos = await api.getTodos()
        const updated = await api.generateStrategy({
          todo_id: todo.id,
          todos: allTodos.map((t: Todo) => ({ id: t.id, name: t.name, priority: t.priority, deadline: t.deadline, done: t.done })),
        })
        refresh(updated)
      } catch { /* 조용히 실패 */ }
    })()
    const poll = setInterval(async () => {
      const updated = await api.getTodos()
      const t = updated.find((t: { id: number }) => t.id === todo.id)
      if (t && Array.isArray(t.steps) && t.steps.length > 0) {
        clearInterval(poll)
        await reload()
      }
    }, 3000)
    setTimeout(() => clearInterval(poll), 60_000) // 1분 후 자동 중단
  }

  const handleToggleStep = useCallback(async (stepId: number) => {
    await api.toggleStepDone(stepId)
    await reload()
  }, [reload])

  const handleAddStep = useCallback(async (todoId: number, text: string, orderIndex = 999) => {
    await api.addStep(todoId, { text, order_index: orderIndex })
    await reload()
  }, [reload])

  const handleDeleteStep = useCallback(async (stepId: number) => {
    await api.deleteStep(stepId)
    await reload()
  }, [reload])

  const handleGenerateSteps = useCallback(async (todo: Todo) => generateSteps(todo), [generateSteps])

  const handleGenerateStrategy = useCallback(async (todo: Todo) => {
    const allTodos = await api.getTodos()
    const updated = await generateStrategy(todo, allTodos)
    refresh(updated)
    return updated
  }, [generateStrategy, refresh])

  const handleUpdate = useCallback(async (id: number, data: Partial<Todo>) => {
    await editTodo(id, data)
  }, [editTodo])

  const handleDelete = useCallback(async (id: number) => {
    await removeTodo(id)
    setSelectedId(null)
  }, [removeTodo])

  const handleToggleDone = useCallback(async (id: number) => {
    await toggleDone(id)
  }, [toggleDone])

  const focusPanelProps = {
    todos,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    onToggleStep: handleToggleStep,
    onAddStep: handleAddStep,
    onDeleteStep: handleDeleteStep,
    onGenerateSteps: handleGenerateSteps,
    onGenerateStrategy: handleGenerateStrategy,
    generatingSteps,
    generatingStrategy,
  }

  const toast = toastError ? (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#1f2937', color: '#f9fafb', borderRadius: 8,
      padding: '10px 16px', fontSize: 13, zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)', pointerEvents: 'none',
    }}>
      {toastError}
    </div>
  ) : null

  if (isMobile) {
    return (
      <>
      <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
        <AppHeader title="Todo List" right={
          <div style={{ display: 'flex', gap: 6 }}>
            {/* <button
              onClick={() => setActive('calendar')}
              aria-label="캘린더"
              title="캘린더"
              style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <CalendarDays size={14} />
            </button>
            <button
              onClick={() => setActive('weekly-review')}
              aria-label="주간 리뷰"
              title="주간 리뷰"
              style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <BarChart3 size={14} />
            </button> */}
          </div>
        } />
        <MobileTabBar filter={filter} onFilter={setFilter} />
        {selectedId !== null ? (
          loading && !selectedTodo ? (
            <div className="flex-1 flex items-center justify-center">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>불러오는 중...</span>
            </div>
          ) : (
            <FocusPanel
              todo={selectedTodo}
              {...focusPanelProps}
              onBack={() => setSelectedId(null)}
            />
          )
        ) : (
          <TodoList
            todos={todos}
            filter={filter}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggle={handleToggleDone}
            onEdit={(id, name) => handleUpdate(id, { name })}
            onAdd={handleAdd}
          />
        )}
      </div>
      {toast}
      </>
    )
  }

  return (
    <>
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <AppHeader title="Todo List" right={
        <div style={{ display: 'flex', gap: 6 }}>
          {/* <button
            onClick={() => setActive('calendar')}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <CalendarDays size={14} />
            캘린더
          </button>
          <button
            onClick={() => setActive('weekly-review')}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <BarChart3 size={14} />
            주간 리뷰
          </button> */}
        </div>
      } />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar filter={filter} onFilter={setFilter} todos={todos} />

        <TodoList
          todos={todos}
          filter={filter}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggle={handleToggleDone}
          onEdit={(id, name) => handleUpdate(id, { name })}
          onAdd={handleAdd}
          width={listWidth}
        />

        <div
          onMouseDown={handleResizerMouseDown}
          className="w-1 flex-shrink-0 cursor-col-resize transition-colors"
          style={{ background: 'var(--border-subtle)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-additive-hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border-subtle)' }}
        />

        {loading && !selectedTodo ? (
          <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>불러오는 중...</span>
          </div>
        ) : (
          <FocusPanel
            todo={selectedTodo}
            {...focusPanelProps}
          />
        )}
      </div>
    </div>
    {toast}
    </>
  )
}
