import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import type { Priority } from '@/shared/types'

interface Props {
  onClose: () => void
  onSave: (data: { name: string; memo: string; priority: Priority; deadline: string }) => Promise<void>
}

const priorities: { value: Priority; label: string }[] = [
  { value: 'urgent', label: '긴급' },
  { value: 'mid',    label: '보통' },
  { value: 'normal', label: '낮음' },
]

export default function AddTodoModal({ onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [memo, setMemo] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), memo, priority, deadline })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          width: 'min(480px, calc(100vw - 32px))',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-[14px] font-semibold text-gray-800">할 일 추가</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-5 space-y-4">
          {/* Title */}
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="무엇을 해야 하나요?"
            className="w-full text-[15px] font-medium placeholder:text-gray-300 bg-transparent outline-none text-gray-900 border-b pb-2 transition-colors focus:border-[var(--selected-bg)]"
            style={{ borderColor: 'var(--border)' }}
          />

          {/* Memo */}
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="맥락이나 배경을 적어두세요 — 피드백, 참고사항, 이전 논의 등"
            rows={3}
            className="w-full text-[13px] placeholder:text-gray-300 bg-transparent outline-none resize-none text-gray-700 rounded-lg px-3 py-2.5 transition-colors"
            style={{ background: 'var(--list)' }}
          />

          {/* Priority pills */}
          <div>
            <div className="text-[11px] text-gray-400 mb-2">우선순위</div>
            <div className="flex gap-2">
              {priorities.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className="flex-1 py-1.5 rounded-lg text-[12px] font-medium border transition-colors"
                  style={priority === p.value
                    ? { background: 'var(--selected-bg)', borderColor: 'var(--selected-bg)', color: 'var(--selected-text)' }
                    : { background: 'transparent', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <div className="text-[11px] text-gray-400 mb-2">마감</div>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full text-[13px] rounded-lg px-3 py-2 outline-none border bg-transparent text-gray-700 focus:border-[var(--selected-bg)] transition-colors"
              style={{ borderColor: 'var(--input-border)' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: 'var(--border)', background: 'var(--list)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-gray-500 hover:bg-black/5 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-[13px] bg-[var(--selected-bg)] text-[var(--selected-text)] hover:opacity-90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Sparkles size={13} />
                저장하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
