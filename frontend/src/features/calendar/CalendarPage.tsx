import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { DndContext, PointerSensor, useDroppable, useSensor, useSensors, useDraggable } from '@dnd-kit/core'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, GripVertical, ListTodo } from 'lucide-react'
import { useShellNav } from '@/shared/hooks/useShellNav'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useT } from '@/shared/i18n'
import PageHeader from '@/shared/components/PageHeader'
import StatePanel from '@/shared/components/StatePanel'
import WeekGrid from './WeekGrid'
import * as api from '@/shared/api/client'
import type { Todo } from '@/shared/types'
import './Calendar.css'

function getWeekStart(date: Date): Date {
  const d = new Date(date); const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0, 0, 0, 0); return d
}
function fmtWeek(ws: Date): string { const we = new Date(ws); we.setDate(we.getDate() + 6); return `${ws.getMonth() + 1}/${ws.getDate()} – ${we.getMonth() + 1}/${we.getDate()}` }

function UnscheduledItem({ todo }: { todo: Todo }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `unscheduled-${todo.id}`, data: { type: 'unscheduled', todo } })
  const colors: Record<string, string> = { urgent: 'var(--c-urgent-text, #a32d2d)', mid: 'var(--c-mid-text, #854f0b)', normal: 'var(--text-secondary)' }
  return <div ref={setNodeRef} {...listeners} {...attributes} className="cal-unscheduled-item" style={{ opacity: isDragging ? 0.4 : 1, color: colors[todo.priority] }}><GripVertical size={14} aria-hidden="true" />{todo.name}</div>
}

function UnscheduledDropZone({ children, hint }: { children: ReactNode; hint: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled-drop' })
  return <aside ref={setNodeRef} className={`cal-sidebar${isOver ? ' is-drop-target' : ''}`}>{children}{isOver && <div className="cal-drop-hint">{hint}</div>}</aside>
}

export default function Calendar() {
  const t = useT(); const isMobile = useIsMobile(); const { setActive } = useShellNav()
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [events, setEvents] = useState<Todo[]>([]); const [unscheduled, setUnscheduled] = useState<Todo[]>([]); const [loading, setLoading] = useState(false)
  const [durationHours, setDurationHours] = useState(1); const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const loadData = useCallback(async () => {
    setLoading(true)
    try { const end = new Date(weekStart); end.setDate(end.getDate() + 7); const [calTodos, allTodos] = await Promise.all([api.getCalendarTodos(weekStart.toISOString(), end.toISOString()), api.getTodos()]); setEvents(calTodos); setUnscheduled(allTodos.filter(todo => !todo.start_time && !todo.done)) }
    finally { setLoading(false) }
  }, [weekStart])
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { const today = new Date(); setSelectedDayIndex(getWeekStart(today).getTime() === weekStart.getTime() ? (today.getDay() + 6) % 7 : 0) }, [weekStart])
  const updateTime = useCallback(async (id: number, start: string, end: string) => { await api.updateTodo(id, { start_time: start, end_time: end }); await loadData() }, [loadData])
  const unschedule = useCallback(async (id: number) => { await api.updateTodo(id, { start_time: null, end_time: null, remind_at: null }); await loadData() }, [loadData])
  const moveWeek = (amount: number) => setWeekStart(ws => { const next = new Date(ws); next.setDate(next.getDate() + amount * 7); return next })
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

  return <div className="cal-root"><div className="cal-shell">
    <PageHeader kicker="Weekly planner" title={t('calendar.heroTitle')} description={t('calendar.heroDescription')} badge={<><CalendarDays size={14} /> {t('calendar.eventsBadge', { count: events.length })}</>} />
    <DndContext sensors={sensors}><section className="cal-workspace">
      <div className="cal-toolbar"><div className="cal-week-nav"><button className="cal-nav-btn" onClick={() => moveWeek(-1)} aria-label={t('calendar.prevWeek')}><ChevronLeft size={16} /></button><span className="cal-week-label">{fmtWeek(weekStart)}</span><button className="cal-nav-btn" onClick={() => moveWeek(1)} aria-label={t('calendar.nextWeek')}><ChevronRight size={16} /></button></div><div className="cal-toolbar-actions"><label className="cal-duration-control"><Clock3 size={15} /><span>{t('calendar.durationLabel')}</span><select value={durationHours} onChange={event => setDurationHours(Number(event.target.value))} aria-label={t('calendar.durationLabel')}>{[1, 2, 3, 4].map(hours => <option key={hours} value={hours}>{t('calendar.durationHours', { count: hours })}</option>)}</select></label><button className="cal-list-btn" onClick={() => setActive('todo')}><ListTodo size={15} />{t('calendar.todoListButton')}</button></div></div>
      <div className="cal-day-strip" role="tablist" aria-label={t('calendar.weekDaysLabel')}>{dayKeys.map((key, index) => { const date = new Date(weekStart); date.setDate(date.getDate() + index); const today = date.toDateString() === new Date().toDateString(); return <button key={key} type="button" role="tab" aria-selected={selectedDayIndex === index} onClick={() => setSelectedDayIndex(index)} className={`${selectedDayIndex === index ? 'is-active' : ''}${today ? ' is-today' : ''}`}><span>{t(`calendar.days.${key}`)}</span><strong>{date.getDate()}</strong></button> })}</div>
      <div className="cal-body"><div className="cal-grid-wrap"><WeekGrid weekStart={weekStart} events={events} durationHours={durationHours} visibleDayIndexes={isMobile ? [selectedDayIndex] : undefined} onPlace={updateTime} onMove={updateTime} onUnschedule={unschedule} /></div><UnscheduledDropZone hint={t('calendar.removeScheduleHint')}><div className="cal-sidebar-title"><span>{t('calendar.unscheduledTitle')}</span><strong>{unscheduled.length}</strong></div>{loading ? <StatePanel compact kind="loading" title={t('calendar.loadingEvents')} /> : unscheduled.length === 0 ? <StatePanel compact kind="empty" title={t('calendar.allPlaced')} /> : <div className="cal-unscheduled-list">{unscheduled.map(todo => <UnscheduledItem key={todo.id} todo={todo} />)}</div>}</UnscheduledDropZone></div>
    </section></DndContext>
  </div></div>
}
