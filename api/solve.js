export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })

  const { question = '', language = 'en', mode = 'standard' } = req.body ?? {}
  const normalized = question.trim()
  const si = language === 'si'

  if (!normalized) return res.status(400).json({ error: si ? 'ගණිත ප්රශ්නයක් ඇතුළත් කරන්න.' : 'Enter a mathematics question.' })
  if (normalized.length > 2000) return res.status(400).json({ error: si ? 'ප්රශ්නය 2000 අකුරු ඇතුළත් කරන්න.' : 'Keep your question under 2,000 characters.' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: si
        ? 'AI සේවාව සක්රිය කිරීමට Vercel dashboard එකේ OPENAI_API_KEY environment variable එකතු කරන්න.'
        : 'Add OPENAI_API_KEY as an environment variable in your Vercel dashboard to enable AI solving.',
      noKey: true,
    })
  }

  const modeInstr = mode === 'simple'
    ? 'Use very simple language suitable for beginners. Keep steps short and easy to understand.'
    : mode === 'detailed'
      ? 'Be thorough. Include formulas, full reasoning, and all intermediate steps.'
      : 'Use clear standard mathematical explanation.'

  const langInstr = si
    ? 'Write ALL titles and explanations in Sinhala (සිංහල). Math expressions and numbers stay in standard notation.'
    : 'Write in English.'

  const system = `You are an expert mathematics tutor. Solve ANY mathematics problem step by step.
${modeInstr}
${langInstr}

Respond with ONLY a valid JSON object. No markdown, no code fences, no extra text.

JSON schema:
{
  "topic": "subject area string",
  "formula": "main formula used (empty string if none)",
  "steps": [
    {"title": "step title", "explanation": "explanation", "math": "math expression or calculation"}
  ],
  "answer": "final answer string",
  "verification": "how to verify the answer",
  "verificationLabel": "short label e.g. Answer verified"
}

Rules:
- steps: 2 to 8 items, every field a non-empty string
- math field: plain text notation (e.g. x = 5, A = π × 7² = 153.94 cm²)
- If problem is invalid, return JSON with answer field explaining why`

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Solve this mathematics problem:\n${normalized}` },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}))
      const msg = err.error?.message || ''
      if (openaiRes.status === 401) throw new Error(si ? 'OpenAI API key වලංගු නොවේ.' : 'Invalid OpenAI API key. Check Vercel environment variables.')
      if (openaiRes.status === 429) throw new Error(si ? 'AI සේවාව කාර්යබහුලයි. ටිකක් රැඳී නැවත උත්සාහ කරන්න.' : 'AI service is busy. Please wait and try again.')
      throw new Error(msg || `OpenAI error ${openaiRes.status}`)
    }

    const data = await openaiRes.json()
    const raw = data.choices?.[0]?.message?.content?.trim()
    if (!raw) throw new Error(si ? 'AI ප්රතිචාරයක් ලැබුණේ නැත.' : 'No response from AI.')

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) } catch { /* fall */ }
      }
      if (!parsed) throw new Error(si ? 'AI ප්රතිචාරය කියවිය නොහැකි විය. ප්රශ්නය නැවත ලියන්න.' : 'Could not read AI response. Try rephrasing.')
    }

    if (!parsed.answer || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      throw new Error(si ? 'AI සම්පූර්ණ විසඳුමක් ලබා දුන්නේ නැත.' : 'AI did not return a complete solution. Try rephrasing.')
    }

    return res.status(200).json({
      question: normalized,
      topic: parsed.topic || (si ? 'ගණිතය' : 'Mathematics'),
      formula: parsed.formula || '',
      steps: parsed.steps.slice(0, 8).map((s) => ({
        title: String(s.title || ''),
        explanation: String(s.explanation || ''),
        math: String(s.math || ''),
      })),
      answer: String(parsed.answer),
      verification: String(parsed.verification || ''),
      verified: true,
      verificationLabel: String(parsed.verificationLabel || (si ? 'AI විසඳුම' : 'AI solution')),
      solvedByAI: true,
    })
  } catch (err) {
    return res.status(400).json({ error: err.message || (si ? 'ගැටලුව විසඳිය නොහැකි විය.' : 'Could not solve this problem.') })
  }
}
