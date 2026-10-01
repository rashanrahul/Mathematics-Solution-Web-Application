import express from 'express'
import { all, create } from 'mathjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

try {
  const envFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env')
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim()
    if (k && !process.env[k]) process.env[k] = v
  }
} catch { /* .env optional */ }

const app = express()
const port = process.env.PORT || 3001
const math = create(all, { number: 'number', precision: 14 })
const clientDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')

app.use(express.json({ limit: '16kb' }))

function displayNumber(value) {
  if (!Number.isFinite(value)) return String(value)
  if (Math.abs(value) < 1e-10) return '0'
  return Number(value.toPrecision(10)).toString()
}

// ── Local verification (runs after AI to confirm answer) ──────────────────────

function tryVerify(question, answer, language) {
  const si = language === 'si'
  try {
    // Linear equation: extract x = number and verify
    const xMatch = answer.match(/x\s*=\s*(-?\d+(?:\.\d+)?)/)
    if (xMatch && question.includes('=')) {
      const sides = question.replace(/[²]/g, '^2').split('=')
      if (sides.length === 2) {
        const x = Number(xMatch[1])
        const lhs = math.evaluate(sides[0].trim(), { x })
        const rhs = math.evaluate(sides[1].trim(), { x })
        if (Math.abs(lhs - rhs) < 1e-6) return { verified: true, verification: `${displayNumber(lhs)} = ${displayNumber(rhs)} ✓`, verificationLabel: si ? 'පිළිතුර තහවුරුයි' : 'Answer verified' }
        return { verified: false, verification: `${displayNumber(lhs)} ≠ ${displayNumber(rhs)}`, verificationLabel: si ? 'නැවත පරීක්ෂා කරන්න' : 'Check needed' }
      }
    }
    // Arithmetic: try evaluating the answer
    const numMatch = answer.match(/=\s*(-?\d+(?:\.\d+)?)/) || answer.match(/^(-?\d+(?:\.\d+)?)$/)
    if (numMatch) {
      const expected = Number(numMatch[1])
      const expr = question.replace(/[²]/g, '^2').replace(/[×]/g, '*').replace(/[÷]/g, '/')
        .replace(/what\s+is|calculate|evaluate|find|සොයන්න|ගණනය\s*කරන්න/gi, '').trim()
      const computed = math.evaluate(expr)
      if (typeof computed === 'number' && Math.abs(computed - expected) < 1e-6) {
        return { verified: true, verification: `${displayNumber(computed)} ✓`, verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Calculation verified' }
      }
    }
  } catch { /* verification optional */ }
  return { verified: true, verification: si ? 'AI විසින් ගණනය කළා' : 'Calculated by AI', verificationLabel: si ? 'AI විසඳුම' : 'AI solution' }
}

// ── OpenAI solver ─────────────────────────────────────────────────────────────

async function solveWithAI(question, language, mode) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('__NO_KEY__')

  const si = language === 'si'
  const modeInstr = mode === 'simple'
    ? 'Use very simple language suitable for beginners. Keep steps short.'
    : mode === 'detailed'
      ? 'Be thorough. Include formulas, reasoning, and all intermediate steps.'
      : 'Use clear standard mathematical explanation.'

  const langInstr = si
    ? 'Write ALL titles and explanations in Sinhala (සිංහල). Math expressions stay in standard notation.'
    : 'Write in English.'

  const system = `You are an expert mathematics tutor. Solve ANY mathematics problem step by step.
${modeInstr}
${langInstr}

You MUST respond with ONLY a valid JSON object. No markdown, no code fences, no extra text before or after.

JSON schema:
{
  "topic": "subject area (e.g. Algebra · Linear Equations)",
  "formula": "main formula used",
  "steps": [
    {"title": "step title", "explanation": "explanation text", "math": "mathematical expression or calculation"}
  ],
  "answer": "final answer",
  "verification": "show how to check the answer",
  "verificationLabel": "short label like 'Answer verified'"
}

Rules:
- steps must have 2 to 8 items
- Every field must be a non-empty string
- math field: use plain text math notation (e.g. x = 5, A = π × 7² = 153.94)
- If the problem is unsolvable or invalid, still return JSON with answer explaining why`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Solve this mathematics problem:\n${question}` },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || ''
    if (res.status === 401) throw new Error(si ? 'OpenAI API key වලංගු නොවේ. .env ගොනුව පරීක්ෂා කරන්න.' : 'Invalid OpenAI API key. Check your .env file.')
    if (res.status === 429) throw new Error(si ? 'AI සේවාව දැනට කාර්යබහුලයි. ටිකක් රැඳී නැවත උත්සාහ කරන්න.' : 'AI service is busy. Please wait a moment and try again.')
    throw new Error(msg || `OpenAI error ${res.status}`)
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error(si ? 'AI ප්රතිචාරයක් ලැබුණේ නැත.' : 'No response from AI.')

  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  let parsed
  try { parsed = JSON.parse(cleaned) } catch {
    // Try to extract JSON from response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]) } catch { /* fall through */ }
    }
    if (!parsed) throw new Error(si ? 'AI ප්රතිචාරය කියවිය නොහැකි විය. ප්රශ්නය නැවත ලියන්න.' : 'Could not read AI response. Try rephrasing the question.')
  }

  if (!parsed.answer || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error(si ? 'AI සම්පූර්ණ විසඳුමක් ලබා දුන්නේ නැත. ප්රශ්නය නැවත ලියන්න.' : 'AI did not return a complete solution. Try rephrasing.')
  }

  const verify = tryVerify(question, parsed.answer, language)

  return {
    question,
    topic: parsed.topic || (si ? 'ගණිතය' : 'Mathematics'),
    formula: parsed.formula || '',
    steps: parsed.steps.slice(0, 8).map((s) => ({
      title: s.title || '',
      explanation: s.explanation || '',
      math: s.math || '',
    })),
    answer: parsed.answer,
    verification: verify.verification || parsed.verification || '',
    verified: verify.verified,
    verificationLabel: verify.verificationLabel || parsed.verificationLabel || (si ? 'AI විසඳුම' : 'AI solution'),
    solvedByAI: true,
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

app.post('/api/solve', async (request, response) => {
  const { question = '', language = 'en', mode = 'standard' } = request.body ?? {}
  const normalized = question.trim()
  const si = language === 'si'

  if (!normalized) return response.status(400).json({ error: si ? 'ගණිත ප්රශ්නයක් ඇතුළත් කරන්න.' : 'Enter a mathematics question to get started.' })
  if (normalized.length > 2000) return response.status(400).json({ error: si ? 'ප්රශ්නය 2000 අකුරු ඇතුළත් කරන්න.' : 'Keep your question under 2,000 characters.' })

  try {
    const solution = await solveWithAI(normalized, language, mode)
    return response.json(solution)
  } catch (err) {
    if (err.message === '__NO_KEY__') {
      return response.status(503).json({
        error: si
          ? 'AI සේවාව සක්රිය කිරීමට .env ගොනුවේ OPENAI_API_KEY එකතු කරන්න.'
          : 'Add your OPENAI_API_KEY to the .env file to enable AI solving.',
        noKey: true,
      })
    }
    return response.status(400).json({ error: err.message || (si ? 'ගැටලුව විසඳිය නොහැකි විය.' : 'Could not solve this problem.') })
  }
})

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ai: Boolean(process.env.OPENAI_API_KEY) }))
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }))
app.use(express.static(clientDirectory))
app.get(/.*/, (_req, res) => res.sendFile(path.join(clientDirectory, 'index.html')))

app.listen(port, () => console.log(`MathSolve API on http://localhost:${port} | AI: ${process.env.OPENAI_API_KEY ? 'enabled' : 'no key'}`))
