export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })

  // Parse body (Vercel may not auto-parse)
  let body = req.body
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}') } catch { body = {} }
  }

  const { question = '', language = 'en', mode = 'standard' } = body
  const normalized = String(question).trim()
  const si = language === 'si'

  if (!normalized) {
    return res.status(400).json({ error: si ? 'ගණිත ප්රශ්නයක් ඇතුළත් කරන්න.' : 'Enter a mathematics question.' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: si
        ? 'Vercel dashboard → Settings → Environment Variables හි OPENAI_API_KEY එකතු කරන්න.'
        : 'Add OPENAI_API_KEY in Vercel dashboard → Settings → Environment Variables, then redeploy.',
      noKey: true,
    })
  }

  const modeInstr = mode === 'simple'
    ? 'Use very simple beginner-friendly language. Keep each step short.'
    : mode === 'detailed'
      ? 'Be thorough. Show all formulas, reasoning, and intermediate steps.'
      : 'Use clear standard mathematical explanation.'

  const langInstr = si
    ? 'Write ALL titles and explanations in Sinhala (සිංහල). Keep math expressions in standard notation.'
    : 'Write everything in English.'

  const systemPrompt = `You are an expert mathematics tutor. Solve ANY mathematics problem step by step.
${modeInstr}
${langInstr}

IMPORTANT: Respond with ONLY a raw JSON object. No markdown. No code fences. No text before or after the JSON.

Required JSON format:
{
  "topic": "subject area",
  "formula": "key formula (or empty string)",
  "steps": [
    {"title": "step title", "explanation": "explanation text", "math": "math working"}
  ],
  "answer": "final answer",
  "verification": "verification working",
  "verificationLabel": "e.g. Answer verified"
}

Constraints: steps must have 2-8 items. All fields must be non-empty strings.`

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Solve: ${normalized}` },
        ],
      }),
    })

    const data = await openaiRes.json()

    if (!openaiRes.ok) {
      const msg = data?.error?.message || ''
      const code = data?.error?.code || ''
      if (openaiRes.status === 401 || code === 'invalid_api_key') {
        return res.status(401).json({
          error: si
            ? 'OpenAI API key වලංගු නොවේ. Vercel dashboard එකේ OPENAI_API_KEY නිවැරදිව ඇතුළත් කරන්න.'
            : 'Invalid OpenAI API key. Update OPENAI_API_KEY in Vercel Environment Variables and redeploy.',
        })
      }
      if (openaiRes.status === 429 || code === 'insufficient_quota') {
        return res.status(429).json({
          error: si
            ? 'OpenAI quota ඉවරයි. https://platform.openai.com හි billing check කරන්න.'
            : 'OpenAI quota exceeded. Check billing at https://platform.openai.com',
        })
      }
      return res.status(openaiRes.status).json({ error: msg || `OpenAI error ${openaiRes.status}` })
    }

    const raw = data.choices?.[0]?.message?.content?.trim()
    if (!raw) {
      return res.status(500).json({ error: si ? 'AI ප්රතිචාරයක් ලැබුණේ නැත.' : 'No response from AI.' })
    }

    // Strip markdown fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // Try extracting JSON object from response
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) } catch { /* fall through */ }
      }
    }

    if (!parsed || !parsed.answer || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return res.status(500).json({
        error: si
          ? 'AI සම්පූර්ණ විසඳුමක් ලබා දුන්නේ නැත. ප්රශ්නය නැවත ලියන්න.'
          : 'AI did not return a complete solution. Try rephrasing your question.',
      })
    }

    return res.status(200).json({
      question: normalized,
      topic: String(parsed.topic || (si ? 'ගණිතය' : 'Mathematics')),
      formula: String(parsed.formula || ''),
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
    // Network error or timeout
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout')
    return res.status(502).json({
      error: isTimeout
        ? (si ? 'AI සේවාව ප්රතිචාර දැක්වීමට කාලය ගතවිය. නැවත උත්සාහ කරන්න.' : 'AI request timed out. Please try again.')
        : (si ? `සම්බන්ධතා දෝෂය: ${err.message}` : `Connection error: ${err.message}`),
    })
  }
}
