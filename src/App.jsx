import { useState } from 'react'
import { ArrowDown, ArrowRight, Check, ChevronDown, CircleHelp, Clock3, Divide, Equal, FunctionSquare, Languages, LoaderCircle, Plus, RotateCcw, Sigma, Sparkles } from 'lucide-react'

const topics = [
  { id: 'auto', label: 'Auto detect', labelSi: 'ස්වයංක්‍රීයව හඳුනාගන්න', icon: Sparkles },
  { id: 'algebra', label: 'Algebra', labelSi: 'වීජ ගණිතය', icon: FunctionSquare },
  { id: 'circles', label: 'Circle area', labelSi: 'වෘත්ත වර්ගඵලය', icon: CircleHelp },
  { id: 'differentiation', label: 'Calculus', labelSi: 'කලනය', icon: Sigma },
  { id: 'arithmetic', label: 'Arithmetic', labelSi: 'ගණිත ක්‍රියා', icon: Divide },
]

const examples = [
  { text: '2x + 5 = 15', topic: 'algebra', icon: FunctionSquare, label: 'Linear equation', labelSi: 'සරල සමීකරණය' },
  { text: 'Find the area of a circle with radius 7 cm', topic: 'circles', icon: CircleHelp, label: 'Circle area', labelSi: 'වෘත්ත වර්ගඵලය' },
  { text: 'Differentiate x^2 + 3x + 2', topic: 'differentiation', icon: Sigma, label: 'Differentiate', labelSi: 'අවකලනය' },
]

const copy = {
  en: {
    eyebrow: 'YOUR MATH STUDY DESK',
    title: 'Understand the\nway to the answer.',
    subtitle: 'One clear step at a time. Enter a problem and work through the reasoning, not just the result.',
    question: 'YOUR QUESTION',
    placeholder: 'Try “2x + 5 = 15” or describe a problem…',
    topic: 'TOPIC',
    level: 'EXPLANATION',
    solve: 'Solve this problem',
    solving: 'Working it out…',
    steps: 'Solution steps',
    answer: 'Final answer',
    verified: 'Answer verified',
    formula: 'FORMULA',
    check: 'CHECK YOUR ANSWER',
    prompt: 'Your worked solution will appear here.',
    promptSub: 'Start with an equation, a calculation, a circle area, or a derivative.',
    simple: 'Simple',
    standard: 'Standard',
    detailed: 'Detailed',
    tryThis: 'Try a question',
    topics: 'QUICK STARTS',
    recent: 'RECENT EXAMPLES',
    error: 'Something needs a second look',
    calculated: 'Calculated',
    checkNeeded: 'Check needed',
  },
  si: {
    eyebrow: 'ඔබේ ගණිත අධ්‍යයන මේසය',
    title: 'පිළිතුරට යන\nමඟ තේරුම් ගන්න.',
    subtitle: 'පැහැදිලි පියවර එකින් එක. ප්‍රශ්නය ඇතුළත් කර පිළිතුර පමණක් නොව හේතුවත් ඉගෙන ගන්න.',
    question: 'ඔබේ ප්‍රශ්නය',
    placeholder: '“2x + 5 = 15” හෝ ගණිත ගැටලුවක් ඇතුළත් කරන්න…',
    topic: 'මාතෘකාව',
    level: 'පැහැදිලි කිරීම',
    solve: 'ගැටලුව විසඳන්න',
    solving: 'විසඳමින්…',
    steps: 'විසඳුමේ පියවර',
    answer: 'අවසාන පිළිතුර',
    verified: 'පිළිතුර තහවුරුයි',
    formula: 'සූත්‍රය',
    check: 'පිළිතුර පරීක්ෂා කරන්න',
    prompt: 'ඔබේ පියවරෙන් පියවර විසඳුම මෙහි පෙන්වයි.',
    promptSub: 'සමීකරණයක්, ගණනයක්, වෘත්තයක වර්ගඵලයක් හෝ අවකලනයක් අරඹන්න.',
    simple: 'සරල',
    standard: 'සාමාන්‍ය',
    detailed: 'විස්තරාත්මක',
    tryThis: 'උදාහරණයක් බලන්න',
    topics: 'ඉක්මන් ආරම්භය',
    recent: 'මෑත උදාහරණ',
    error: 'නැවත පරීක්ෂා කළ යුතු දෙයක් ඇත',
    calculated: 'ගණනය කළා',
    checkNeeded: 'නැවත පරීක්ෂා කරන්න',
  },
}

export default function App() {
  const [question, setQuestion] = useState('')
  const [topic, setTopic] = useState('auto')
  const [mode, setMode] = useState('standard')
  const [language, setLanguage] = useState('en')
  const [solution, setSolution] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState([])
  const t = copy[language]

  async function solve(event) {
    event?.preventDefault()
    if (!question.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, topic, mode, language }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to solve this problem.')
      setSolution(data)
      setRecent((items) => [question, ...items.filter((item) => item !== question)].slice(0, 4))
    } catch (requestError) {
      setSolution(null)
      setError(requestError.message || 'The solver is unavailable. Check that the API is running.')
    } finally {
      setLoading(false)
    }
  }

  function chooseExample(example) {
    setQuestion(example.text)
    setTopic(example.topic)
    setSolution(null)
    setError('')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="MathSolve home">
          <span className="brand-mark"><Sigma size={20} strokeWidth={2.4} /></span>
          <span>math<span className="brand-accent">solve</span></span>
        </a>
        <div className="topbar-right">
          <span className="edition-label">A BETTER WAY TO LEARN MATH</span>
          <button className="language-toggle" type="button" onClick={() => setLanguage(language === 'en' ? 'si' : 'en')} aria-label="Switch language">
            <Languages size={16} /><span>{language === 'en' ? 'සිංහල' : 'English'}</span><ChevronDown size={14} />
          </button>
        </div>
      </header>

      <main id="home">
        <section className="intro-row">
          <div className="intro-copy">
            <p className="eyebrow"><span className="eyebrow-line" />{t.eyebrow}</p>
            <h1>{t.title.split('\n').map((line, index) => <span key={line}>{index === 1 ? <><i>{line.split(' ').slice(0, -1).join(' ')} </i>{line.split(' ').at(-1)}</> : line}<br /></span>)}</h1>
            <p className="intro-subtitle">{t.subtitle}</p>
          </div>
          <div className="math-stamp" aria-hidden="true">
            <span className="stamp-ring" />
            <span className="stamp-top">LEARN IT</span>
            <span className="stamp-symbol">x + y</span>
            <span className="stamp-bottom">STEP BY STEP · 01</span>
          </div>
        </section>

        <section className="workspace" aria-label="Math solver">
          <form className="question-panel" onSubmit={solve}>
            <div className="panel-heading">
              <div><span className="section-number">01</span><h2>{t.question}</h2></div>
              <span className="input-hint">↵ Enter to solve</span>
            </div>
            <label className="sr-only" htmlFor="question-input">{t.question}</label>
            <textarea id="question-input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t.placeholder} rows={4} />
            <div className="input-footer">
              <span><span className="status-dot" />TEXT INPUT</span>
              <span>{question.length}/240</span>
            </div>
            <div className="control-row">
              <div className="select-control">
                <label htmlFor="topic-select">{t.topic}</label>
                <select id="topic-select" value={topic} onChange={(event) => setTopic(event.target.value)}>
                  {topics.map((item) => <option key={item.id} value={item.id}>{language === 'si' ? item.labelSi : item.label}</option>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </div>
              <div className="mode-control">
                <span>{t.level}</span>
                <div className="mode-switch" role="group" aria-label={t.level}>
                  {['simple', 'standard', 'detailed'].map((item) => <button type="button" key={item} className={mode === item ? 'selected' : ''} onClick={() => setMode(item)}>{t[item]}</button>)}
                </div>
              </div>
            </div>
            <button className="solve-button" type="submit" disabled={!question.trim() || loading}>
              {loading ? <LoaderCircle size={18} className="spin" /> : <Sparkles size={17} />}
              <span>{loading ? t.solving : t.solve}</span><ArrowRight size={18} className="solve-arrow" />
            </button>
            <div className="examples-block">
              <p className="micro-label">{t.tryThis}</p>
              <div className="example-list">
                {examples.map((example) => {
                  const Icon = example.icon
                  return <button type="button" key={example.text} className="example-button" onClick={() => chooseExample(example)}><Icon size={15} /><span>{language === 'si' ? example.labelSi : example.label}</span><ArrowDown size={13} /></button>
                })}
              </div>
            </div>
          </form>

          <section className={`solution-panel ${solution ? 'has-solution' : ''}`} aria-live="polite">
            {solution ? <>
              <div className="solution-head">
                <div><p className="micro-label">{t.steps}</p><h2>{solution.topic}</h2></div>
                <button className="icon-button" type="button" title="Start a new solution" aria-label="Start a new solution" onClick={() => { setSolution(null); setError('') }}><RotateCcw size={17} /></button>
              </div>
              <div className="solved-question"><span>Q</span><p>{solution.question}</p></div>
              {solution.steps.map((step, index) => <article className="step-row" key={`${step.title}-${index}`}>
                <div className="step-marker">{String(index + 1).padStart(2, '0')}</div>
                <div className="step-content"><h3>{step.title}</h3><p>{step.explanation}</p><div className="math-line">{step.math}</div></div>
              </article>)}
              <div className="answer-block">
                <div className="answer-title"><span>{t.answer}</span><span className={`verified-badge ${solution.verified ? '' : 'needs-check'}`}><Check size={13} />{solution.verificationLabel || (solution.verified ? t.verified : t.checkNeeded)}</span></div>
                <p className="answer-value">{solution.answer}</p>
              </div>
              <div className="verification-block">
                <div className="verification-title"><Check size={15} /><span>{t.check}</span></div>
                <p>{solution.verification}</p>
              </div>
              <div className="formula-footer"><span className="micro-label">{t.formula}</span><code>{solution.formula}</code></div>
            </> : <div className="empty-solution">
              <div className="empty-graphic"><span className="graphic-line graphic-line-one" /><span className="graphic-line graphic-line-two" /><span className="graphic-center"><Equal size={23} /></span><span className="graphic-dot graphic-dot-one" /><span className="graphic-dot graphic-dot-two" /></div>
              {error ? <><p className="empty-title error-title">{t.error}</p><p className="empty-subtitle">{error}</p></> : <><p className="empty-title">{t.prompt}</p><p className="empty-subtitle">{t.promptSub}</p></>}
              <div className="formula-note"><span>π</span><span>x²</span><span>∑</span><span>√</span><span>÷</span></div>
            </div>}
          </section>
        </section>

        <section className="below-workspace">
          <div className="quick-starts">
            <p className="micro-label">{t.topics}</p>
            <div className="topic-list">{topics.slice(1).map((item) => {
              const Icon = item.icon
              return <button type="button" className={`topic-chip ${topic === item.id ? 'active' : ''}`} key={item.id} onClick={() => setTopic(item.id)}><Icon size={15} /><span>{language === 'si' ? item.labelSi : item.label}</span><Plus size={13} className="chip-plus" /></button>
            })}</div>
          </div>
          <div className="recent-questions">
            <p className="micro-label"><Clock3 size={13} />{t.recent}</p>
            {recent.length ? <div className="recent-list">{recent.map((item) => <button type="button" key={item} onClick={() => { setQuestion(item); setSolution(null) }}>{item}<ArrowRight size={14} /></button>)}</div> : <p className="recent-empty">Your solved examples will be kept here during this session.</p>}
          </div>
        </section>
      </main>
      <footer className="page-footer"><span>MathSolve <span className="footer-dot">·</span> Learn by solving</span><span>BUILT FOR CURIOUS MINDS</span></footer>
    </div>
  )
}