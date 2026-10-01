import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronDown, ImagePlus, Languages, LoaderCircle, RotateCcw, Sparkles, X, AlertCircle, BookOpen, Sigma } from 'lucide-react'

const EXAMPLES = {
  en: [
    '2x + 5 = 15',
    'x² - 5x + 6 = 0',
    'Find the area of a circle with radius 7 cm',
    'What is 15% of 200?',
    'Solve the system: 2x + y = 10, x - y = 2',
    'Differentiate x³ + 4x² - 2x + 1',
    'Find the volume of a cylinder with radius 5 cm and height 12 cm',
    'John has 48 chocolates. He shares them equally among 6 friends. How many does each get?',
    'Find the average of 12, 18, 24, 30, 36',
    'Simplify: (3x² + 6x) / (x + 2)',
    'sin(30°) + cos(60°)',
    'Find the probability of getting heads twice when flipping a coin twice',
  ],
  si: [
    '2x + 5 = 15',
    'x² - 5x + 6 = 0',
    'අරය 7 cm වූ වෘත්තයක වර්ගඵලය සොයන්න',
    '200 න් 15% කීයද?',
    'ත්රිකෝණයක පාදය 10 cm සහ උස 8 cm නම් වර්ගඵලය සොයන්න',
    'x³ + 4x² - 2x + 1 අවකලනය කරන්න',
    '12, 18, 24, 30, 36 හි සාමාන්යය සොයන්න',
    'ජෝන් සතු ඇපල් 24 ක් ඇත. ඔහු 9 ක් දුන්නේය. ඉතිරිය කීයද?',
    'LCM of 12 and 18',
    '1/2 + 3/4 - 1/6',
  ],
}

const TOPICS = {
  en: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry', 'Fractions', 'Percentages', 'Word Problems', 'Number Theory'],
  si: ['වීජ ගණිතය', 'ජ්යාමිතිය', 'කලනය', 'සංඛ්යාන', 'ත්රිකෝණමිතිය', 'භාග', 'ප්රතිශත', 'වචන ගැටලු', 'සංඛ්යා න්යාය'],
}

const T = {
  en: {
    brand: 'MathSolve',
    tagline: 'AI-Powered Mathematics Solver',
    subtitle: 'Ask any math question — get step-by-step solutions instantly.',
    placeholder: 'Type any math question… e.g. "Solve x² - 5x + 6 = 0" or "Find the area of a circle with radius 7 cm"',
    mode: 'Explanation level',
    simple: 'Simple', standard: 'Standard', detailed: 'Detailed',
    solve: 'Solve', solving: 'Solving…',
    upload: 'Upload image',
    reading: 'Reading…',
    extracted: 'Text extracted — review and solve.',
    imgErr: 'Choose a PNG, JPG, or WebP image under 10 MB.',
    imgReadErr: 'Could not read text from this image.',
    steps: 'Solution Steps',
    answer: 'Final Answer',
    check: 'Verification',
    formula: 'Formula',
    newQ: 'New question',
    examples: 'Try an example',
    topics: 'Topics',
    recent: 'Recent',
    noKey: 'Add your OpenAI API key to the .env file to enable AI solving.',
    errTitle: 'Could not solve',
    aiLabel: 'AI',
    switchLang: 'සිංහල',
  },
  si: {
    brand: 'MathSolve',
    tagline: 'AI ගණිත විසඳුම් යන්ත්රය',
    subtitle: 'ඕනෑම ගණිත ප්රශ්නයක් ඇසීමෙන් පියවරෙන් පියවර විසඳුම ලබා ගන්න.',
    placeholder: 'ඕනෑම ගණිත ප්රශ්නයක් ලියන්න… උදා: "2x + 5 = 15 විසඳන්න" හෝ "අරය 7 cm වූ වෘත්තයක වර්ගඵලය"',
    mode: 'පැහැදිලි කිරීමේ මට්ටම',
    simple: 'සරල', standard: 'සාමාන්ය', detailed: 'විස්තරාත්මක',
    solve: 'විසඳන්න', solving: 'විසඳමින්…',
    upload: 'රූපයක් එක් කරන්න',
    reading: 'කියවමින්…',
    extracted: 'පෙළ හඳුනාගත්තා — පරීක්ෂා කර විසඳන්න.',
    imgErr: '10 MB ට අඩු PNG, JPG හෝ WebP රූපයක් තෝරන්න.',
    imgReadErr: 'රූපයෙන් පෙළ කියවිය නොහැකි විය.',
    steps: 'විසඳුමේ පියවර',
    answer: 'අවසාන පිළිතුර',
    check: 'තහවුරු කිරීම',
    formula: 'සූත්රය',
    newQ: 'නව ප්රශ්නයක්',
    examples: 'උදාහරණයක් බලන්න',
    topics: 'මාතෘකා',
    recent: 'මෑත',
    noKey: 'AI සේවාව සක්රිය කිරීමට .env ගොනුවේ OPENAI_API_KEY එකතු කරන්න.',
    errTitle: 'විසඳිය නොහැකි විය',
    aiLabel: 'AI',
    switchLang: 'English',
  },
}

export default function App() {
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState('standard')
  const [language, setLanguage] = useState('en')
  const [solution, setSolution] = useState(null)
  const [error, setError] = useState('')
  const [noKey, setNoKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState([])
  const [imagePreview, setImagePreview] = useState('')
  const [ocrStatus, setOcrStatus] = useState('')
  const textareaRef = useRef(null)
  const t = T[language]

  function detectLanguage(value) {
    if (/[\u0D80-\u0DFF]/.test(value)) return 'si'
    if (/[A-Za-z]/.test(value)) return 'en'
    return language
  }

  function setQ(value) {
    setQuestion(value)
    setLanguage(detectLanguage(value))
  }

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])

  async function readImage(file) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError(t.imgErr); return
    }
    setError(''); setImagePreview(URL.createObjectURL(file)); setOcrStatus('reading')
    let worker
    try {
      const { createWorker } = await import('tesseract.js')
      worker = await createWorker('eng', 1, { logger: () => {} })
      const { data: { text } } = await worker.recognize(file)
      const extracted = text.trim()
      if (!extracted) throw new Error()
      setQ(question.trim() ? `${question.trim()}\n${extracted}` : extracted)
      setOcrStatus('done')
    } catch { setOcrStatus(''); setError(t.imgReadErr) }
    finally { await worker?.terminate() }
  }

  async function solve(e) {
    e?.preventDefault()
    if (!question.trim() || loading) return
    setLoading(true); setError(''); setNoKey(false); setSolution(null)
    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, mode, language }),
      })
      const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }))
      if (!res.ok) {
        if (data.noKey) { setNoKey(true); return }
        throw new Error(data.error || `Error ${res.status}: Unable to solve.`)
      }
      setSolution(data)
      setRecent((prev) => [question, ...prev.filter((q) => q !== question)].slice(0, 6))
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError(language === 'si' ? 'සම්බන්ධතා දෝෂයකි. Internet connection check කරන්න.' : 'Network error. Check your internet connection.')
      } else {
        setError(err.message || 'The solver is unavailable.')
      }
    } finally { setLoading(false) }
  }

  function useExample(text) {
    setQ(text); setSolution(null); setError(''); setNoKey(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function reset() { setSolution(null); setError(''); setNoKey(false); setQuestion(''); setImagePreview(''); setOcrStatus('') }

  return (
    <div className="ms-shell">
      {/* Header */}
      <header className="ms-header">
        <div className="ms-brand">
          <span className="ms-brand-icon"><Sigma size={18} strokeWidth={2.5} /></span>
          <span className="ms-brand-name">{t.brand}</span>
          <span className="ms-brand-tag">{t.tagline}</span>
        </div>
        <button className="ms-lang-btn" onClick={() => setLanguage(language === 'en' ? 'si' : 'en')}>
          <Languages size={14} />{t.switchLang}
        </button>
      </header>

      <main className="ms-main">
        {/* Hero */}
        <section className="ms-hero">
          <h1>{t.subtitle}</h1>
        </section>

        {/* Input area */}
        <section className="ms-input-section">
          <form onSubmit={solve} className="ms-form">
            <div className="ms-textarea-wrap">
              <textarea
                ref={textareaRef}
                className="ms-textarea"
                value={question}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.placeholder}
                rows={4}
                maxLength={2000}
              />
              <div className="ms-textarea-footer">
                <label className="ms-img-btn">
                  <ImagePlus size={14} />
                  <span>{t.upload}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => readImage(e.target.files?.[0])} />
                </label>
                {ocrStatus === 'reading' && <span className="ms-ocr-msg"><LoaderCircle size={12} className="spin" />{t.reading}</span>}
                {ocrStatus === 'done' && <span className="ms-ocr-msg ok"><Check size={12} />{t.extracted}</span>}
                {imagePreview && (
                  <div className="ms-img-preview">
                    <img src={imagePreview} alt="uploaded" />
                    <button type="button" onClick={() => { setImagePreview(''); setOcrStatus('') }}><X size={11} /></button>
                  </div>
                )}
                <span className="ms-char-count">{question.length}/2000</span>
              </div>
            </div>

            <div className="ms-controls">
              <div className="ms-mode-group">
                <span className="ms-mode-label">{t.mode}</span>
                <div className="ms-mode-btns">
                  {['simple', 'standard', 'detailed'].map((m) => (
                    <button key={m} type="button" className={`ms-mode-btn ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
                      {t[m]}
                    </button>
                  ))}
                </div>
              </div>
              <button className="ms-solve-btn" type="submit" disabled={!question.trim() || loading}>
                {loading ? <LoaderCircle size={17} className="spin" /> : <Sparkles size={17} />}
                <span>{loading ? t.solving : t.solve}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        </section>

        {/* No key warning */}
        {noKey && (
          <div className="ms-nokey">
            <AlertCircle size={18} />
            <div>
              <strong>{language === 'si' ? 'API Key නොමැත' : 'API Key Required'}</strong>
              <p>{t.noKey}</p>
              <code>OPENAI_API_KEY=sk-...</code>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !noKey && (
          <div className="ms-error">
            <AlertCircle size={16} />
            <div><strong>{t.errTitle}</strong><p>{error}</p></div>
          </div>
        )}

        {/* Solution */}
        {solution && (
          <section className="ms-solution">
            <div className="ms-sol-header">
              <div className="ms-sol-meta">
                <span className="ms-sol-topic">{solution.topic}</span>
                {solution.solvedByAI && <span className="ms-ai-badge"><Sparkles size={10} />{t.aiLabel}</span>}
              </div>
              <button className="ms-reset-btn" onClick={reset}><RotateCcw size={15} />{t.newQ}</button>
            </div>

            <div className="ms-sol-question">
              <span className="ms-q-label">Q</span>
              <p>{solution.question}</p>
            </div>

            {solution.formula && (
              <div className="ms-formula-bar">
                <span className="ms-formula-label">{t.formula}</span>
                <code>{solution.formula}</code>
              </div>
            )}

            <div className="ms-steps-label">{t.steps}</div>
            <div className="ms-steps">
              {solution.steps.map((step, i) => (
                <div className="ms-step" key={i}>
                  <div className="ms-step-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="ms-step-body">
                    <h3>{step.title}</h3>
                    {step.explanation && <p>{step.explanation}</p>}
                    {step.math && <div className="ms-math">{step.math}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="ms-answer-block">
              <div className="ms-answer-label">{t.answer}</div>
              <div className="ms-answer-value">{solution.answer}</div>
              <div className={`ms-verified ${solution.verified ? 'ok' : 'warn'}`}>
                <Check size={13} />
                <span>{solution.verificationLabel}</span>
              </div>
            </div>

            {solution.verification && (
              <div className="ms-verification">
                <div className="ms-ver-label"><Check size={13} />{t.check}</div>
                <p>{solution.verification}</p>
              </div>
            )}
          </section>
        )}

        {/* Examples + Recent */}
        {!solution && !loading && (
          <div className="ms-bottom-grid">
            <div className="ms-examples-panel">
              <div className="ms-panel-title"><BookOpen size={13} />{t.examples}</div>
              <div className="ms-example-list">
                {EXAMPLES[language].map((ex) => (
                  <button key={ex} className="ms-example-btn" onClick={() => useExample(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="ms-side-panel">
              <div className="ms-topics-panel">
                <div className="ms-panel-title">{t.topics}</div>
                <div className="ms-topic-list">
                  {TOPICS[language].map((tp) => (
                    <button key={tp} className="ms-topic-chip" onClick={() => useExample(tp + ': ')}>{tp}</button>
                  ))}
                </div>
              </div>

              {recent.length > 0 && (
                <div className="ms-recent-panel">
                  <div className="ms-panel-title">{t.recent}</div>
                  {recent.map((q) => (
                    <button key={q} className="ms-recent-btn" onClick={() => useExample(q)}>
                      <span>{q}</span><ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="ms-footer">
        <span>MathSolve · AI-Powered · {language === 'si' ? 'ඕනෑම ගණිත ප්රශ්නයක් විසඳන්න' : 'Solve any math problem'}</span>
      </footer>
    </div>
  )
}
