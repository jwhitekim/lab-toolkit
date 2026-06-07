import { useDndMonitor, useDroppable, useDraggable } from '@dnd-kit/core'
import type { Todo } from '../types'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 06~23
const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const SLOT_H = 48 // px per hour

function isoToLocal(iso: string) {
  return new Date(iso)
}

function cellId(day: number, hour: number) {
  return `cell-${day}-${hour}`
}

interface EventBlockProps {
  todo: Todo
  dayIndex: number
}

function EventBlock({ todo, dayIndex }: EventBlockProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `block-${todo.id}`,
    data: { type: 'block', todo, dayIndex },
  })
  if (!todo.start_time) return null
  const start = isoToLocal(todo.start_time)
  const end = todo.end_time ? isoToLocal(todo.end_time) : new Date(start.getTime() + 60 * 60 * 1000)
  const startH = start.getHours() + start.getMinutes() / 60
  const endH = end.getHours() + end.getMinutes() / 60
  const top = (startH - 6) * SLOT_H
  const height = Math.max((endH - startH) * SLOT_H, 20)

  const priorityColor: Record<string, string> = {
    urgent: '#a32d2d', mid: '#854f0b', normal: '#0f6e56',
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute',
        top,
        height,
        left: 2,
        right: 2,
        background: priorityColor[todo.priority] ?? '#0f6e56',
        color: '#fff',
        borderRadius: 4,
        fontSize: 11,
        padding: '2px 4px',
        overflow: 'hidden',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        zIndex: 1,
        lineHeight: 1.3,
        userSelect: 'none',
      }}
      title={todo.name}
    >
      {todo.name}
    </div>
  )
}

interface DroppableCellProps {
  id: string
  children?: React.ReactNode
}

function DroppableCell({ id, children }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        height: SLOT_H,
        borderBottom: '1px solid var(--border-subtle)',
        background: isOver ? 'color-mix(in srgb, var(--bg-additive) 60%, transparent)' : undefined,
        transition: 'background 0.1s',
        position: 'relative',
      }}
    >
      {children}
    </div>
  )
}

interface WeekGridProps {
  weekStart: Date
  events: Todo[]
  onPlace: (id: number, start: string, end: string) => void
  onMove: (id: number, start: string, end: string) => void
}

export default function WeekGrid({ weekStart, events, onPlace, onMove }: WeekGridProps) {
  useDndMonitor({
    onDragEnd(event) {
      const { over, active } = event
      if (!over) return
      const overId = String(over.id)
      if (!overId.startsWith('cell-')) return
      const [, dayStr, hourStr] = overId.split('-')
      const day = parseInt(dayStr)
      const hour = parseInt(hourStr)
      const cellDate = new Date(weekStart)
      cellDate.setDate(cellDate.getDate() + day)
      cellDate.setHours(hour, 0, 0, 0)
      const endDate = new Date(cellDate.getTime() + 60 * 60 * 1000)
      const start = cellDate.toISOString()
      const end = endDate.toISOString()
      const data = active.data.current
      if (data?.type === 'unscheduled') {
        onPlace(data.todo.id, start, end)
      } else if (data?.type === 'block') {
        onMove(data.todo.id, start, end)
      }
    },
  })

  const dayColumns = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const getEventsForDay = (dayIndex: number) => {
    const d = dayColumns[dayIndex]
    return events.filter(e => {
      if (!e.start_time) return false
      const s = isoToLocal(e.start_time)
      return s.toDateString() === d.toDateString()
    })
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'auto', minWidth: 0 }}>
      {/* Time axis */}
      <div style={{ width: 48, flexShrink: 0 }}>
        <div style={{ height: 32 }} />
        {HOURS.map(h => (
          <div key={h} style={{ height: SLOT_H, fontSize: 10, color: 'var(--text-disabled)', paddingTop: 2, paddingRight: 4, textAlign: 'right' }}>
            {h.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* Day columns */}
      {dayColumns.map((d, dayIndex) => (
        <div key={dayIndex} style={{ flex: 1, minWidth: 80, borderLeft: '1px solid var(--border-subtle)' }}>
          {/* Header */}
          <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
            {DAYS[dayIndex]} {d.getDate()}
          </div>
          {/* Slots */}
          <div style={{ position: 'relative' }}>
            {HOURS.map(h => (
              <DroppableCell key={h} id={cellId(dayIndex, h)} />
            ))}
            {getEventsForDay(dayIndex).map(ev => (
              <EventBlock key={ev.id} todo={ev} dayIndex={dayIndex} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
