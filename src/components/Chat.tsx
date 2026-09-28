import { useEffect, useRef, useState } from 'react'
import type { BotMsg, Scenario, WidgetId } from '../data/scenarios'
import type { Api } from '../store'
import { classify } from '../logic/engine'
import { Widget } from '../widgets/Widgets'

type Item =
  | { kind: 'bot'; text: string; source?: string; tone?: 'alert' }
  | { kind: 'user'; text: string }
  | { kind: 'widget'; widget: WidgetId; props?: Record<string, unknown>; nodeId: string; seq: number }
  | { kind: 'system'; text: string }
  | { kind: 'end' }

const DELAY = 550

interface Props {
  scenario: Scenario
  api: Api
  onNode: (id: string | null) => void
  onSafety: (label: string) => void
  onNext?: () => void
}

export function Chat({ scenario, api, onNode, onSafety, onNext }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const run = useRef(0)
  const step = useRef(0)
  const currentSeq = useRef(-1)
  const apiRef = useRef(api)
  apiRef.current = api
  const scroller = useRef<HTMLDivElement>(null)

  const push = (it: Item) => setItems((xs) => [...xs, it])

  const enter = (id: string, userText?: string) => {
    const token = run.current
    if (userText) push({ kind: 'user', text: userText })
    setCurrent(null)
    setTyping(true)
    // Wait a tick so effects from the reply are applied before bot text is computed.
    setTimeout(() => {
      if (token !== run.current) return
      const node = scenario.nodes[id]
      if (!node) return
      const s = apiRef.current.s
      const raw = typeof node.bot === 'function' ? node.bot(s) : node.bot ?? []
      const msgs: BotMsg[] = raw.map((m) => (typeof m === 'string' ? { text: m } : m))
      msgs.forEach((m, i) =>
        setTimeout(() => {
          if (token === run.current) push({ kind: 'bot', ...m })
        }, DELAY * (i + 1)),
      )
      setTimeout(() => {
        if (token !== run.current) return
        if (node.widget) push({ kind: 'widget', widget: node.widget, props: node.widgetProps, nodeId: id, seq: token * 1000 + ++step.current })
        currentSeq.current = token * 1000 + step.current
        if (node.end) push({ kind: 'end' })
        setTyping(false)
        setCurrent(id)
        onNode(id)
      }, DELAY * (msgs.length + 1) - 200)
    }, 30)
  }

  useEffect(() => {
    run.current++
    setItems([])
    onSafety('')
    enter(scenario.start)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [items, typing])

  const node = current ? scenario.nodes[current] : null
  const replies = node?.replies ? (typeof node.replies === 'function' ? node.replies(api.s) : node.replies) : []

  const goto = (to: string, say?: string) => enter(to, say)

  const submitFree = () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    const cls = classify(text)
    onSafety(cls)
    const to = cls === 'crisis' ? 'crisis' : cls === 'medical' ? 'medical' : cls === 'harmful-request' ? 'harm' : 'ok'
    enter(to, text)
  }

  return (
    <div className="chat">
      <div className="chat-scroll" ref={scroller}>
        {items.map((it, i) => {
          if (it.kind === 'user') return <div key={i} className="bubble user">{it.text}</div>
          if (it.kind === 'bot')
            return (
              <div key={i} className={`bubble bot ${it.tone === 'alert' ? 'alert' : ''}`}>
                {it.text}
                {it.source && <div className="source">Source: {it.source}</div>}
              </div>
            )
          if (it.kind === 'widget') {
            // Only the widget created by the node we are currently on is interactive.
            const active = !typing && it.nodeId === current && it.seq === currentSeq.current
            return (
              <div key={i} className={`widget-wrap ${active ? '' : 'inactive'}`}>
                <Widget id={it.widget} props={it.props ?? {}} api={api} goto={goto} active={active} />
              </div>
            )
          }
          if (it.kind === 'end')
            return (
              <div key={i} className="end-marker">
                End of use case
                {onNext && <button className="link" onClick={onNext}>Next use case →</button>}
              </div>
            )
          return <div key={i} className="system">{it.text}</div>
        })}
        {typing && (
          <div className="bubble bot typing">
            <span /> <span /> <span />
          </div>
        )}
      </div>
      <div className="composer">
        {!typing && replies.length > 0 && (
          <div className="replies">
            {replies.map((r) => (
              <button
                key={r.label}
                onClick={() => {
                  r.effect?.(api)
                  goto(r.to, r.say ?? r.label)
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
        {!typing && node?.freeText && (
          <form
            className="free"
            onSubmit={(e) => {
              e.preventDefault()
              submitFree()
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message to test the safety check…" />
            <button type="submit">Send</button>
          </form>
        )}
      </div>
    </div>
  )
}
