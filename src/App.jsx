import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, Check, ChevronDown, CircleHelp, Clock3, Divide, Equal, FunctionSquare, Hash, ImagePlus, Languages, LoaderCircle, Percent, Plus, RectangleHorizontal, RotateCcw, Shapes, Sigma, Sparkles, Triangle, X } from 'lucide-react'

const topics = [
  { id: 'auto', label: 'Auto detect', labelSi: 'ස්වයංක්රීයව හඳුනාගන්න', icon: Sparkles },
  { id: 'algebra', label: 'Algebra', labelSi: 'වීජ ගණිතය', icon: FunctionSquare },
  { id: 'quadratic', label: 'Quadratic', labelSi: 'ද්විමූල සමීකරණ', icon: FunctionSquare },
  { id: 'circles', label: 'Circle area', labelSi: 'වෘත්ත වර්ගඵලය', icon: CircleHelp },
  { id: 'rectangles', label: 'Rectangle area', labelSi: 'සෘජුකෝණාස්ර වර්ගඵලය', icon: RectangleHorizontal },
  { id: 'triangles', label: 'Triangle area', labelSi: 'ත්රිකෝණ වර්ගඵලය', icon: Triangle },
  { id: 'squares', label: 'Square area', labelSi: 'චතුරස්ර වර්ගඵලය', icon: Shapes },
  { id: 'volume', label: 'Volume', labelSi: 'පරිමාව', icon: Shapes },
  { id: 'percentages', label: 'Percentages', labelSi: 'ප්රතිශත', icon: Percent },
  { id: 'fractions', label: 'Fractions', labelSi: 'භාග', icon: Divide },
  { id: 'decimals', label: 'Decimals', labelSi: 'දශම', icon: Hash },
  { id: 'ratio', label: 'Ratio', labelSi: 'අනුපාත', icon: Divide },
  { id: 'average', label: 'Average', labelSi: 'සාමාන්යය', icon: Hash },
  { id: 'word', label: 'Word problems', labelSi: 'වචන ගැටලු', icon: Sparkles },
  { id: 'differentiation', label: 'Calculus', labelSi: 'කලනය', icon: Sigma },
  { id: 'arithmetic', label: 'Arithmetic', labelSi: 'ගණිත ක්රියා', icon: Divide },
]

const examples = [
  { text: '2x + 5 = 15', topic: 'algebra', icon: FunctionSquare, label: 'Linear equation', labelSi: 'සරල සමීකරණය' },
  { text: 'x^2 - 5x + 6 = 0', topic: 'quadratic', icon: FunctionSquare, label: 'Quadratic equation', labelSi: 'ද්විමූල සමීකරණය' },
  { text: 'Find the area of a circle with radius 7 cm', topic: 'circles', icon: CircleHelp, label: 'Circle area', labelSi: 'වෘත්ත වර්ගඵලය' },
  { text: 'What is 15% of 200?', topic: 'percentages', icon: Percent, label: 'Find a percentage', labelSi: 'ප්රතිශතයක් සොයන්න' },
  { text: 'Increase 500 by 20%', topic: 'percentages', icon: Percent, label: 'Percentage increase', labelSi: 'ප්රතිශත වැඩිවීම' },
  { text: '1/2 + 1/4', topic: 'fractions', icon: Divide, label: 'Add fractions', labelSi: 'භාග එකතු කරන්න' },
  { text: 'average of 4, 8, 15, 16, 23', topic: 'average', icon: Hash, label: 'Find the average', labelSi: 'සාමාන්යය සොයන්න' },
  { text: 'simplify ratio 12:8', topic: 'ratio', icon: Divide, label: 'Simplify ratio', labelSi: 'අනුපාතය සරල කරන්න' },
  { text: 'John has 24 apples. He gave away 9. How many are left?', topic: 'word', icon: Sparkles, label: 'Word problem', labelSi: 'වචන ගැටලුව' },
  { text: 'LCM of 12 and 18', topic: 'arithmetic', icon: Hash, label: 'LCM', labelSi: 'සා.ගු.ගු' },
  { text: 'Find the area of a triangle with base 10 cm and height 6 cm', topic: 'triangles', icon: Triangle, label: 'Triangle area', labelSi: 'ත්රිකෝණ වර්ගඵලය' },
  { text: 'Differentiate x^2 + 3x + 2', topic: 'differentiation', icon: Sigma, label: 'Differentiate', labelSi: 'අවකලනය' },
]

const copy = {
  en: {
    eyebrow: 'YOUR MATH STUDY DESK',
    title: 'Understand the\nway to the answer.',
    subtitle: 'One clear step at a time. Enter a problem and work through the reasoning, not just the result.',
    question: 'YOUR QUESTION',
    placeholder: 'Try "2x + 5 = 15", "average of 4,8,12", or describe a problem…',
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
    promptSub: 'Try an equation, fraction, percentage, ratio, average, word problem, geometry, or derivative.',
    simple: 'Simple',
    standard: 'Standard',
    detailed: 'Detailed',
    tryThis: 'Try a question',
    topics: 'QUICK STARTS',
    recent: 'RECENT EXAMPLES',
    error: 'Something needs a second look',
    calculated: 'Calculated',
    checkNeeded: 'Check needed',
    uploadImage: 'Upload screenshot',
    readingImage: 'Reading image',
    reviewText: 'Review the extracted text, then solve.',
    imageTypeError: 'Choose a PNG, JPG, or WebP image under 10 MB.',
    imageReadError: 'Could not read text from this image. Type the question below instead.',
    aiChecking: 'Checking AI',
    aiReady: 'AI tutor ready',
    aiSetup: 'AI setup needed',
  },
  si: {
    eyebrow: 'ඔබේ ගණිත අධ්යයන මේසය',
    title: 'පිළිතුරට යන\nමඟ තේරුම් ගන්න.',
    subtitle: 'පැහැදිලි පියවර එකින් එක. ප්රශ්නය ඇතුළත් කර පිළිතුර පමණක් නොව හේතුවත් ඉගෙන ගන්න.',
    question: 'ඔබේ ප්රශ්නය',
    placeholder: '"2x + 5 = 15" හෝ ගණිත ගැටලුවක් ඇතුළත් කරන්න…',
    topic: 'මාතෘකාව',
    level: 'පැහැදිලි කිරීම',
    solve: 'ගැටලුව විසඳන්න',
    solving: 'විසඳමින්…',
    steps: 'විසඳුමේ පියවර',
    answer: 'අවසාන පිළිතුර',
    verified: 'පිළිතුර තහවුරුයි',
    formula: 'සූත්රය',
    check: 'පිළිතුර පරීක්ෂා කරන්න',
    prompt: 'ඔබේ පියවරෙන් පියවර විසඳුම මෙහි පෙන්වයි.',
    promptSub: 'සමීකරණයක්, භාගයක්, ප්රතිශතයක්, අනුපාතයක්, සාමාන්යයක්, වචන ගැටලුවක් හෝ ජ්යාමිතික ගැටලුවක් ඇතුළත් කරන්න.',
    simple: 'සරල',
    standard: 'සාමාන්ය',
    detailed: 'විස්තරාත්මක',
    tryThis: 'උදාහරණයක් බලන්න',
    topics: 'ඉක්මන් ආරම්භය',
    recent: 'මෑත උදාහරණ',
    error: 'නැවත පරීක්ෂා කළ යුතු දෙයක් ඇත',
    calculated: 'ගණනය කළා',
    checkNeeded: 'නැවත පරීක්ෂා කරන්න',
    uploadImage: 'තිර රුවක් එක් කරන්න',
    readingImage: 'රූපය කියවමින්',
    reviewText: 'හඳුනාගත් පෙළ පරීක්ෂා කර විසඳන්න.',
    imageTypeError: '10 MB ට අඩු PNG, JPG හෝ WebP රූපයක් තෝරන්න.',
    imageReadError: 'මෙම රූපයෙන් පෙළ කියවිය නොහැක. ප්රශ්නය පහතින් ටයිප් කරන්න.',
    aiChecking: 'AI තත්ත්වය පරීක්ෂා කරමින්',
    aiReady: 'AI උපකාරකය සූදානම්',
    aiSetup: 'AI සකසා නැත',
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
  const [imagePreview, setImagePreview] = useState('')
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [aiConfigured, setAiConfigured] = useState(null)
  const t = copy[language]

  function setQuestionText(value) {
    setQuestion(value)
    if (/[\u0D80-\u0DFF]/.test(value)) setLanguage('si')
    else if (/[A-Za-z]/.test(value)) setLanguage('en')
  }

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  useEffect(() => {
    let active = true
    fetch('/api/health')
      .then((response) => response.json())
      .then((data) => { if (active) setAiConfigured(Boolean(data.ai?.configured)) })
      .catch(() => { if (active) setAiConfigured(false) })
    return () => { active = false }
  }, [])

  async function readScreenshot(file) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError(t.imageTypeError)
      return
    }
    setError('')
    setImagePreview(URL.createObjectURL(file))
    setOcrStatus('reading')
    setOcrProgress(0)
    let worker
    try {
      const { createWorker } = await import('tesseract.js')
      worker = await createWorker('eng', 1, {
        logger: (message) => {
          if (message.status === 'recognizing text') setOcrProgress(Math.round(message.progress * 100))
        },
      })
      const { data: { text } } = await worker.recognize(file)
      const extracted = text.trim()
      if (!extracted) throw new Error(t.imageReadError)
      setQuestionText(question.trim() ? `${question.trim()}\n${extracted}` : extracted)
      setOcrStatus('ready')
    } catch {
      setOcrStatus('failed')
      setError(t.imageReadError)
    } finally {
      await worker?.terminate()
    }
  }

  function clearScreenshot() {
    setImagePreview('')
    setOcrStatus('')
    setOcrProgress(0)
  }

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
    setQuestionText(example.text)
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
          <span className={`ai-status ${aiConfigured ? 'ready' : ''}`} title={aiConfigured ? 'OpenAI Responses API is configured on the server.' : 'Add OPENAI_API_KEY to .env to enable OpenAI.'}>
            <Sparkles size={13} />{aiConfigured === null ? t.aiChecking : aiConfigured ? t.aiReady : t.aiSetup}
          </span>
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
            <textarea id="question-input" value={question} onChange={(event) => setQuestionText(event.target.value)} placeholder={t.placeholder} rows={5} maxLength={1000} />
            <div className="attachment-row">
              <label className="upload-button">
                <ImagePlus size={15} /><span>{t.uploadImage}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={(event) => readScreenshot(event.target.files?.[0])} />
              </label>
              {ocrStatus === 'reading' && <span className="ocr-status"><LoaderCircle size={13} className="spin" />{t.readingImage} {ocrProgress}%</span>}
              {ocrStatus === 'ready' && <span className="ocr-status"><Check size={13} />{t.reviewText}</span>}
              {imagePreview && <div className="image-preview"><img src={imagePreview} alt="Uploaded question screenshot" /><button type="button" className="remove-image" onClick={clearScreenshot} aria-label="Remove screenshot"><X size={13} /></button></div>}
            </div>
            <div className="input-footer">
              <span><span className="status-dot" />TEXT INPUT</span>
              <span>{question.length}/1000</span>
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
                <div><p className="micro-label">{t.steps}</p><h2>{solution.topic}{solution.solvedByAI && <span className="ai-badge">AI</span>}</h2></div>
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
            {recent.length ? <div className="recent-list">{recent.map((item) => <button type="button" key={item} onClick={() => { setQuestionText(item); setSolution(null) }}>{item}<ArrowRight size={14} /></button>)}</div> : <p className="recent-empty">Your solved examples will be kept here during this session.</p>}
          </div>
        </section>
      </main>
      <footer className="page-footer"><span>MathSolve <span className="footer-dot">·</span> Learn by solving</span><span>BUILT FOR CURIOUS MINDS</span></footer>
    </div>
  )
}
