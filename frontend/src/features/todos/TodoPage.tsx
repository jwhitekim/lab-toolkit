import { useState, useCallback, useRef, useEffect } from 'react'
import { ArrowRight, CheckCircle2, ListTodo, Sparkles, Zap } from 'lucide-react'
import type { NavFilter, Priority, Todo } from '@/shared/types'
import { useTodos } from './hooks/useTodos'
import { useAi } from './hooks/useAi'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useT } from '@/shared/i18n'
import TodoList from './TodoList'
import FocusPanel from './FocusPanel'
import * as api from '@/shared/api/client'

const LIST_MIN = 280
const LIST_MAX = 680
const LIST_DEFAULT = 340

function TodoOverview({ todos, onSelect }: { todos: Todo[]; onSelect: (id: number) => void }) {
  const t = useT()
  const active = todos.filter(todo => !todo.done)
  const urgent = active.filter(todo => todo.priority === 'urgent')
  const completed = todos.filter(todo => todo.done).length
  const completionRate = todos.length ? Math.round((completed / todos.length) * 100) : 0
  const next = active.slice(0, 3)

  return (
    <section className="todo-overview">
      <div className="todo-overview-inner">
        <header className="todo-page-heading">
          <div>
            <span className="todo-overview-kicker">Today at a glance</span>
            <h1>{t('todo.overview.heroTitle')}</h1>
            <p className="todo-overview-lead">{t('todo.overview.heroDescription')}</p>
          </div>
          <span className="todo-ai-badge"><Sparkles size={14} /> {t('todo.overview.aiBadge')}</span>
        </header>
        <div className="todo-stat-grid">
          <article className="todo-stat-card"><div className="todo-stat-label"><ListTodo size={14} />{t('todo.overview.inProgress')}</div><div className="todo-stat-value">{active.length}</div></article>
          <article className="todo-stat-card"><div className="todo-stat-label"><Zap size={14} />{t('todo.overview.urgentItems')}</div><div className="todo-stat-value">{urgent.length}</div></article>
          <article className="todo-stat-card"><div className="todo-stat-label"><CheckCircle2 size={14} />{t('todo.overview.completionRate')}</div><div className="todo-stat-value">{completionRate}%</div><div className="todo-progress"><div className="todo-progress-fill" style={{ width: `${completionRate}%` }} /></div></article>
        </div>
        <div className="todo-next-card">
          <div className="todo-next-head"><strong>{t('todo.overview.nextTodo')}</strong><span>{active.length} items</span></div>
          {next.length > 0 ? next.map(todo => <button key={todo.id} type="button" className="todo-overview-item" onClick={() => onSelect(todo.id)}><span className="todo-overview-dot" /><span>{todo.name}</span><ArrowRight size={14} /></button>) : <div className="todo-overview-empty">{t('todo.overview.emptyActive')}</div>}
        </div>
      </div>
    </section>
  )
}

export default function TodoPage() {
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

  useEffect(() => {
    if (!isMobile && selectedId === null && todos.length > 0) setSelectedId(todos[0].id)
  }, [isMobile, selectedId, todos])

  // 모바일은 목록→상세가 실제로는 같은 화면 안에서 상태만 바뀌는 거라, 브라우저
  // 히스토리에 아무 흔적이 없음 — 스와이프 뒤로가기/하드웨어 뒤로가기가 안 먹힘.
  // 상세를 열 때 history entry를 하나 쌓고, popstate(스와이프 포함)로 닫히게 함.
  const openTodo = useCallback((id: number) => {
    if (isMobile) window.history.pushState({ velooTodoDetail: true }, '')
    setSelectedId(id)
  }, [isMobile])

  const closeTodo = useCallback(() => {
    if (isMobile) window.history.back()
    else setSelectedId(null)
  }, [isMobile])

  useEffect(() => {
    if (!isMobile) return
    const onPopState = () => setSelectedId(null)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isMobile])

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
    openTodo(todo.id)
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
    closeTodo()
  }, [removeTodo, closeTodo])

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
      {selectedId === null && <TodoOverview todos={todos} onSelect={openTodo} />}
      {selectedId !== null ? (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
          {loading && !selectedTodo ? (
            <div className="flex-1 flex items-center justify-center">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>불러오는 중...</span>
            </div>
          ) : (
            <FocusPanel
              todo={selectedTodo}
              {...focusPanelProps}
              onBack={closeTodo}
            />
          )}
        </div>
      ) : (
        <TodoList
          todos={todos}
          filter={filter}
          onFilter={setFilter}
          selectedId={selectedId}
          onSelect={openTodo}
          onToggle={handleToggleDone}
          onEdit={(id, name) => handleUpdate(id, { name })}
          onAdd={handleAdd}
        />
      )}
      {toast}
      </>
    )
  }

  return (
    <>
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <TodoOverview todos={todos} onSelect={setSelectedId} />
      <div className="flex flex-1 overflow-hidden">
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

        <div
          onMouseDown={handleResizerMouseDown}
          className="w-1 flex-shrink-0 cursor-col-resize transition-colors"
          style={{ background: 'var(--border-subtle)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-additive-hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border-subtle)' }}
        />

        <TodoList
          todos={todos}
          filter={filter}
          onFilter={setFilter}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggle={handleToggleDone}
          onEdit={(id, name) => handleUpdate(id, { name })}
          onAdd={handleAdd}
          width={listWidth}
        />
      </div>
    </div>
    {toast}
    </>
  )
}
