import { useState, useRef, useEffect } from 'react'
import { BadgeCheck, BrainCircuit, ImagePlus, MessageSquareText, RotateCcw, ScanSearch } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useT, useDateLocale } from '@/shared/i18n'
import PageHeader from '@/shared/components/PageHeader'
import StatePanel from '@/shared/components/StatePanel'
import * as api from './api'
import type { ExplanationJSON, FeedbackJSON, ArchHistoryItem } from './api'
import './ArchTrainer.css'

const C = {
  bg:         'var(--bg-canvas)',
  surface:    'var(--bg-base)',
  card:       'var(--bg-additive)',
  border:     'var(--border-subtle)',
  accent:     'var(--accent)',
  accentDim:  'var(--accent-soft)',
  accentText: 'var(--accent)',
  text:       'var(--text-primary)',
  textSub:    'var(--text-secondary)',
  textMuted:  'var(--text-disabled)',
  green:      'var(--c-green)',
  greenDim:   'var(--c-green-dim)',
  error:      'var(--c-error)',
}

type Step = 'upload' | 'train' | 'feedback'

export default function ArchTrainer() {
  const t = useT()
  const dateLocale = useDateLocale()
  const isMobile = useIsMobile()

  const SECTION_LABELS: Record<keyof ExplanationJSON, string> = {
    overview:     t('reviewer.sections.overview'),
    modules:      t('reviewer.sections.modules'),
    data_flow:    t('reviewer.sections.data_flow'),
    contribution: t('reviewer.sections.contribution'),
  }

  const FEEDBACK_LABELS: Record<keyof FeedbackJSON, string> = {
    correct:    t('reviewer.feedback.correct'),
    missing:    t('reviewer.feedback.missing'),
    suggestion: t('reviewer.feedback.suggestion'),
  }
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<ExplanationJSON | null>(null)
  const [userText, setUserText] = useState('')
  const [feedback, setFeedback] = useState<FeedbackJSON | null>(null)
  const [step, setStep] = useState<Set<Step>>(new Set(['upload']))
  const [loadingExplain, setLoadingExplain] = useState(false)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<number | null>(null)
  const [archHistory, setArchHistory] = useState<ArchHistoryItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [textareaFocused, setTextareaFocused] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { api.getArchHistory().then(setArchHistory) }, [])

  const show = (s: Step) => setStep(prev => new Set([...prev, s]))

  const setFile = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const resetUpload = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImageFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const doExplain = async () => {
    if (!imageFile) return
    setLoadingExplain(true)
    setError(null)
    setStep(new Set(['upload']))
    try {
      const data = await api.explain(imageFile)
      setExplanation(data.explanation)
      setHistoryId(data.history_id)
      show('train')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingExplain(false)
    }
  }

  const doFeedback = async () => {
    if (!userText.trim()) { setError(t('reviewer.enterDescriptionError')); return }
    setLoadingFeedback(true)
    setError(null)
    setStep(prev => { const s = new Set(prev); s.delete('feedback'); return s })
    try {
      const data = await api.feedback(explanation!, userText, historyId)
      setFeedback(data.feedback)
      show('feedback')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingFeedback(false)
    }
  }

  const resetAll = () => {
    resetUpload()
    setExplanation(null); setUserText(''); setFeedback(null)
    setHistoryId(null)
    setStep(new Set(['upload']))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const loadFromHistory = (item: ArchHistoryItem) => {
    setExplanation(item.explanation)
    setHistoryId(item.id)
    setFeedback(null)
    setUserText('')
    setStep(new Set(['upload', 'train']))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="arch-root" style={{ background: C.bg, color: C.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .reselect-btn { position: absolute; top: 10px; right: 10px; display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 9px; font-size: 0.78rem; font-weight: 600; cursor: pointer; background: rgba(255,255,255,0.92); color: var(--accent); border: 1px solid var(--border-subtle); transition: background 0.18s, transform 0.12s; }
        .reselect-btn:hover { background: var(--accent-soft); }
        .reselect-btn:active { transform: scale(0.97); }
        textarea::placeholder { color: var(--text-secondary); }
      `}</style>

      <div className="app-page-intro-shell app-page-intro-shell--workspace">
        <PageHeader
          kicker="Model learning lab"
          title={t('reviewer.heroTitle')}
          description={t('reviewer.heroDescription')}
          badge={<><BrainCircuit size={14} /> {t('reviewer.historyBadge', { count: archHistory.length })}</>}
        />
      </div>
      <div className="arch-shell">
        {error && (
          <StatePanel compact kind="error" title={t('reviewer.requestFailedTitle')} description={error} />
        )}


        {/* History */}
        {!previewUrl && archHistory.length > 0 && (
          <Card compact={isMobile}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: C.textMuted, marginBottom: 12 }}>{t('reviewer.recentAnalysis')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {archHistory.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', textAlign: 'left', background: 'none', border: 'none',
                    borderBottom: i < archHistory.length - 1 ? `1px solid ${C.border}` : 'none',
                    cursor: 'pointer', width: '100%',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
                      {item.image_name ?? t('reviewer.untitledImage')}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                      {item.explanation.overview.slice(0, 60)}…
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 12, flexShrink: 0 }}>
                    {new Date(item.created_at).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Step 1 — Upload */}
        <Card compact={isMobile}>
          <CardTitle step={1}>{t('reviewer.uploadTitle')}</CardTitle>
          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) setFile(f) }}
              style={{
                border: `1.5px dashed ${dragOver ? C.accent : C.border}`,
                borderRadius: 'var(--radius-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: C.card,
                transition: 'border-color 0.15s',
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]) }} />
              <div className="arch-upload-icon"><ImagePlus size={26} /></div>
              <p className="arch-upload-hint">
                <strong>{t('reviewer.uploadHintBold')}</strong>{t('reviewer.uploadHintSuffix')}
              </p>
              <p className="arch-upload-formats">{t('reviewer.uploadFormats')}</p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <img
                src={previewUrl}
                alt={t('reviewer.previewAlt')}
                style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card }}
              />
              <button onClick={resetUpload} className="reselect-btn">
                <RotateCcw size={11} />{t('reviewer.reselect')}
              </button>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <Btn primary disabled={!imageFile || loadingExplain} onClick={doExplain} loading={loadingExplain}>
              {loadingExplain ? t('reviewer.analyzingButton') : t('reviewer.getExplanationButton')}
            </Btn>
          </div>
        </Card>

        {!previewUrl && archHistory.length === 0 && (
          <section className="arch-guide" aria-label={t('reviewer.guideAria')}>
            <article><ScanSearch size={20} /><span>01</span><strong>{t('reviewer.guide.analyzeTitle')}</strong><p>{t('reviewer.guide.analyzeDesc')}</p></article>
            <article><MessageSquareText size={20} /><span>02</span><strong>{t('reviewer.guide.explainTitle')}</strong><p>{t('reviewer.guide.explainDesc')}</p></article>
            <article><BadgeCheck size={20} /><span>03</span><strong>{t('reviewer.guide.feedbackTitle')}</strong><p>{t('reviewer.guide.feedbackDesc')}</p></article>
          </section>
        )}

        {/* Step 2 — User Input */}
        {step.has('train') && (
          <Card compact={isMobile}>
            <CardTitle step={2}>{t('reviewer.explainYourselfTitle')}</CardTitle>
            <p style={{ fontSize: '0.85rem', color: C.textMuted, marginBottom: 12 }}>{t('reviewer.readyPrompt')}</p>
            <textarea
              value={userText}
              onChange={e => setUserText(e.target.value)}
              onFocus={() => setTextareaFocused(true)}
              onBlur={() => setTextareaFocused(false)}
              placeholder={t('reviewer.textareaPlaceholder')}
              style={{
                width: '100%', minHeight: 130, outline: 'none',
                border: `1px solid ${textareaFocused ? 'var(--accent)' : C.border}`,
                borderRadius: 'var(--radius-md)', padding: 14, fontSize: 14,
                fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.85,
                background: C.bg, color: C.text,
                transition: 'border-color 0.15s',
              }}
            />
            <div style={{ marginTop: 14 }}>
              <Btn primary disabled={loadingFeedback} onClick={doFeedback} loading={loadingFeedback}>
                {loadingFeedback ? t('reviewer.generatingFeedback') : t('reviewer.getFeedbackButton')}
              </Btn>
            </div>
          </Card>
        )}

        {/* Step 3 — AI Explanation + Feedback */}
        {step.has('feedback') && explanation && feedback && (
          <Card compact={isMobile}>
            <CardTitle step={3}>{t('reviewer.resultTitle')}</CardTitle>

            {/* AI 설명 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: C.textMuted, marginBottom: 10 }}>{t('reviewer.aiExplanationLabel')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(Object.keys(SECTION_LABELS) as (keyof ExplanationJSON)[]).map(key => (
                  <SectionBlock key={key} label={SECTION_LABELS[key]} content={explanation[key]} />
                ))}
              </div>
            </div>

            {/* 피드백 */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: C.textMuted, marginBottom: 10 }}>{t('reviewer.feedbackLabel')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(Object.keys(FEEDBACK_LABELS) as (keyof FeedbackJSON)[]).map(key => (
                  <SectionBlock key={key} label={FEEDBACK_LABELS[key]} content={feedback[key]} />
                ))}
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: C.textMuted, marginTop: 16 }}>{t('reviewer.tryAgainHint')}</p>
            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <Btn ghost onClick={() => { setUserText(''); setStep(prev => { const s = new Set(prev); s.delete('feedback'); return s }) }}>{t('reviewer.explainAgain')}</Btn>
              <Btn onClick={resetAll}>{t('reviewer.newUpload')}</Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function SectionBlock({ label, content }: { label: string; content: string }) {
  return (
    <div style={{ borderRadius: 'var(--radius-md)', padding: '10px 14px', background: 'var(--bg-additive)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 6, color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.75, margin: 0 }}>{content}</p>
    </div>
  )
}

function Card({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div style={{ background: 'var(--bg-base)', borderRadius: 16, padding: compact ? 16 : 24, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {children}
    </div>
  )
}

function CardTitle({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="arch-card-title">
      <span className="arch-step-number">{step}</span>
      <span className="arch-card-title-text">{children}</span>
    </div>
  )
}

function Btn({ children, primary, ghost, disabled, loading, onClick }: {
  children: React.ReactNode; primary?: boolean; ghost?: boolean
  disabled?: boolean; loading?: boolean; onClick?: () => void
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '8px 20px', borderRadius: 'var(--radius-md)',
    fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background 0.15s',
    border: 'none',
  }
  const variant = primary
    ? { background: 'var(--accent)', color: 'var(--selected-text)' }
    : ghost
      ? { background: 'transparent', color: 'var(--text-primary)', border: '1.5px solid var(--border-subtle)' }
      : { background: 'var(--bg-additive)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
  return (
    <button style={{ ...base, ...variant }} disabled={disabled} onClick={onClick}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <span style={{
      width: 13, height: 13,
      border: '2px solid var(--border-subtle)',
      borderTopColor: 'var(--text-primary)',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}
