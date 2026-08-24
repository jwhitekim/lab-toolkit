import { useState, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import 'dayjs/locale/en'
import 'dayjs/locale/zh-cn'
import type { NavFilter, Priority, Todo } from '@/shared/types'
import { useTodos } from './hooks/useTodos'
import { useAi } from './hooks/useAi'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useT, useLanguage } from '@/shared/i18n'
import TodoList from './TodoList'
import FocusPanel from './FocusPanel'
import * as api from '@/shared/api/client'
import './Todo.css'

// dayjs 'LL' 같은 로케일 포맷에 쓰는 태그. i18n의 BCP-47 태그(ko-KR 등)와는
// 형식이 달라 별도로 매핑한다.
const DAYJS_LOCALE: Record<string, string> = { ko: 'ko', en: 'en', zh: 'zh-cn' }

function TodoSummarySidebar({
  todos,
}: {
  todos: Todo[]
}) {
  const t = useT()
  const active = todos.filter(todo => !todo.done)
  const urgent = active.filter(todo => todo.priority === 'urgent')
  const completed = todos.filter(todo => todo.done).length
  const completionRate = todos.length ? Math.round((completed / todos.length) * 100) : 0

  return (
    <aside className="todo-summary-sidebar">
      <strong>{t('todo.summary.today')}</strong>
      <div className="todo-summary-progress" aria-label={`${t('todo.overview.completionRate')} ${completionRate}%`}>
        <span style={{ width: `${completionRate}%` }} />
      </div>
      <small>{completed} / {todos.length} {t('todo.summary.complete')}</small>
      <div className="todo-summary-stat">
        <span>{t('todo.overview.inProgress')}</span>
        <b>{active.length}</b>
      </div>
      <div className="todo-summary-stat">
        <span>{t('todo.overview.urgentItems')}</span>
        <b>{urgent.length}</b>
      </div>
    </aside>
  )
}

export default function TodoPage() {
  const t = useT()
  const { language } = useLanguage()
  dayjs.locale(DAYJS_LOCALE[language])
  const isMobile = useIsMobile()
  const [filter, setFilter] = useState<NavFilter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [featuredId, setFeaturedId] = useState<number | null>(null)

  const { todos, loading, reload, addTodo, editTodo, removeTodo, toggleDone, refresh, toastError, clearToastError } = useTodos(filter)

  useEffect(() => {
    if (!toastError) return
    const t = setTimeout(clearToastError, 3000)
    return () => clearTimeout(t)
  }, [toastError, clearToastError])
  const { generateSteps, generateStrategy, generatingSteps, generatingStrategy } = useAi()

  const selectedTodo = todos.find(t => t.id === selectedId) ?? null

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
      {selectedId !== null ? (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
          {loading && !selectedTodo ? (
            <div className="flex-1 flex items-center justify-center">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('todo.loading')}</span>
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
          featuredId={featuredId}
          onSelect={openTodo}
          onFeature={setFeaturedId}
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
    <div className="todo-desktop-frame">
      <div className="todo-desktop-layout">
        <TodoSummarySidebar todos={todos} />
        <main className="todo-desktop-content">
          {loading && todos.length === 0 ? (
            <div className="todo-desktop-loading">
              <span>{t('todo.loading')}</span>
            </div>
          ) : selectedTodo ? (
            <FocusPanel
              todo={selectedTodo}
              {...focusPanelProps}
              onBack={closeTodo}
            />
          ) : (
            <TodoList
              todos={todos}
              filter={filter}
              onFilter={setFilter}
              selectedId={selectedId}
              featuredId={featuredId}
              onSelect={setSelectedId}
              onFeature={setFeaturedId}
              onToggle={handleToggleDone}
              onEdit={(id, name) => handleUpdate(id, { name })}
              onAdd={handleAdd}
            />
          )}
        </main>
      </div>
    </div>
    {toast}
    </>
  )
}
