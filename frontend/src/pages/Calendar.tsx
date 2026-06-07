import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import AppHeader from '../components/AppHeader'
import WeekGrid from '../components/WeekGrid'
import * as api from '../api/client'
import type { Todo } from '../types'
import './Calendar.css'

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtWeek(ws: Date): string {
  const we = new Date(ws)
  we.setDate(we.getDate() + 6)
  return `${ws.getMonth() + 1}/${ws.getDate()} – ${we.getMonth() + 1}/${we.getDate()}`
}

interface UnscheduledItemProps {
  todo: Todo
}

function UnscheduledItem({ todo }: UnscheduledItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `unscheduled-${todo.id}`,
    data: { type: 'unscheduled', todo },
  })
  const priorityColor: Record<string, string> = {
    urgent: 'var(--c-urgent-text, #a32d2d)',
    mid: 'var(--c-mid-text, #854f0b)',
    normal: 'var(--text-secondary)',
  }
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="cal-unscheduled-item"
      style={{ opacity: isDragging ? 0.4 : 1, color: priorityColor[todo.priority] }}
    >
      {todo.name}
    </div>
  )
}

export default function Calendar() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [events, setEvents] = useState<Todo[]>([])
  const [unscheduled, setUnscheduled] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const [calTodos, allTodos] = await Promise.all([
        api.getCalendarTodos(weekStart.toISOString(), weekEnd.toISOString()),
        api.getTodos(),
      ])
      setEvents(calTodos)
      setUnscheduled(allTodos.filter(t => !t.start_time && !t.done))
    } catch { /* 조용히 */ }
    finally { setLoading(false) }
  }, [weekStart])

  useEffect(() => { loadData() }, [loadData])

  const handlePlace = useCallback(async (id: number, start: string, end: string) => {
    await api.updateTodo(id, { start_time: start, end_time: end } as Partial<Todo>)
    await loadData()
  }, [loadData])

  const handleMove = useCallback(async (id: number, start: string, end: string) => {
    await api.updateTodo(id, { start_time: start, end_time: end } as Partial<Todo>)
    await loadData()
  }, [loadData])

  const prevWeek = () => {
    setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() - 7); return d })
  }
  const nextWeek = () => {
    setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() + 7); return d })
  }

  return (
    <div className="cal-root">
      <AppHeader
        title="Calendar"
        right={
          <button
            onClick={() => navigate(`/${username}/todo`)}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
          >
            리스트로
          </button>
        }
      />

      <div className="cal-toolbar">
        <button className="cal-nav-btn" onClick={prevWeek}>‹</button>
        <span className="cal-week-label">{fmtWeek(weekStart)}</span>
        <button className="cal-nav-btn" onClick={nextWeek}>›</button>
      </div>

      <DndContext sensors={sensors}>
        <div className="cal-body">
          {/* 미배치 사이드바 */}
          <aside className="cal-sidebar">
            <div className="cal-sidebar-title">미배치 ({unscheduled.length})</div>
            {loading ? (
              <div className="cal-sidebar-empty">불러오는 중...</div>
            ) : unscheduled.length === 0 ? (
              <div className="cal-sidebar-empty">모두 배치됨</div>
            ) : (
              unscheduled.map(t => <UnscheduledItem key={t.id} todo={t} />)
            )}
          </aside>

          {/* 주간 그리드 */}
          <WeekGrid
            weekStart={weekStart}
            events={events}
            onPlace={handlePlace}
            onMove={handleMove}
          />
        </div>
      </DndContext>
    </div>
  )
}
