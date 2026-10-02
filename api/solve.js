import { all, create, parse } from 'mathjs'

const math = create(all, { number: 'number', precision: 14 })
const allowedOperators = new Set(['+', '-', '*', '/', '^', '%'])
const allowedConstants = new Set(['pi', 'e'])

function displayNumber(value) {
  return Number.isFinite(value) ? Number(value.toPrecision(10)).toString() : String(value)
}

function safeExpression(expression) {
  const node = parse(expression)
  node.traverse((child) => {
    if (child.isOperatorNode && !allowedOperators.has(child.op)) throw new Error('Unsupported operation.')
    if (child.isFunctionNode || child.isAssignmentNode || child.isAccessorNode) throw new Error('Unsupported operation.')
    if (child.isSymbolNode && !allowedConstants.has(child.name) && !['x', 'y'].includes(child.name)) throw new Error('Unsupported symbol.')
  })
  return node
}

function linearForm(node) {
  if (node.isParenthesisNode) return linearForm(node.content)
  if (node.isConstantNode) return { x: 0, y: 0, constant: Number(node.value) }
  if (node.isSymbolNode) return { x: node.name === 'x' ? 1 : 0, y: node.name === 'y' ? 1 : 0, constant: 0 }
  if (!node.isOperatorNode) throw new Error('Not a linear expression.')

  const [left, right] = node.args.map(linearForm)
  if (node.fn === 'unaryMinus') return { x: -left.x, y: -left.y, constant: -left.constant }
  if (node.fn === 'unaryPlus') return left
  if (node.op === '+') return { x: left.x + right.x, y: left.y + right.y, constant: left.constant + right.constant }
  if (node.op === '-') return { x: left.x - right.x, y: left.y - right.y, constant: left.constant - right.constant }
  if (node.op === '*' && left.x === 0 && left.y === 0) return { x: right.x * left.constant, y: right.y * left.constant, constant: right.constant * left.constant }
  if (node.op === '*' && right.x === 0 && right.y === 0) return { x: left.x * right.constant, y: left.y * right.constant, constant: left.constant * right.constant }
  if (node.op === '/' && right.x === 0 && right.y === 0 && right.constant !== 0) return { x: left.x / right.constant, y: left.y / right.constant, constant: left.constant / right.constant }
  throw new Error('Not a linear expression.')
}

function makeLocalSolution(question, language, topic, formula, steps, answer, verification) {
  return {
    question,
    topic,
    formula,
    steps,
    answer,
    verification,
    verified: true,
    solvedByAI: false,
    localFallback: true,
    verificationLabel: language === 'si' ? 'දේශීය ගණිත යන්ත්‍රයෙන් තහවුරු කළා' : 'Verified by local math engine',
  }
}

function solveLocally(question, language, mode) {
  const si = language === 'si'
  const equationMatch = question.match(/[0-9xyXY()+\-*/^.,\s²]+=[ 0-9xyXY()+\-*/^.,\s²]+/)
  if (equationMatch) {
    const [leftText, rightText] = equationMatch[0].split('=').map((part) => part.trim().replaceAll('²', '^2').replaceAll('−', '-'))
    const left = linearForm(safeExpression(leftText))
    const right = linearForm(safeExpression(rightText))
    const coefficientX = left.x - right.x
    const coefficientY = left.y - right.y
    const constant = right.constant - left.constant
    if (Math.abs(coefficientY) < 1e-10 && Math.abs(coefficientX) > 1e-10) {
      const answer = constant / coefficientX
      const checkedLeft = math.evaluate(leftText, { x: answer })
      const checkedRight = math.evaluate(rightText, { x: answer })
      const steps = [
        { title: si ? 'විචල්‍යය තනි කරන්න' : 'Isolate the variable', explanation: si ? 'ප්‍රතිවිරුද්ධ ක්‍රියා භාවිතයෙන් x පදය තනි කරන්න.' : 'Use inverse operations to isolate the x term.', math: `${displayNumber(coefficientX)}x = ${displayNumber(constant)}` },
        { title: si ? 'x සොයන්න' : 'Solve for x', explanation: si ? 'දෙපසම x හි සංගුණකයෙන් බෙදන්න.' : `Divide both sides by ${displayNumber(coefficientX)}.`, math: `x = ${displayNumber(constant)} / ${displayNumber(coefficientX)} = ${displayNumber(answer)}` },
      ]
      if (mode === 'detailed') steps.unshift({ title: si ? 'සමීකරණය සකස් කරන්න' : 'Rearrange the equation', explanation: si ? 'x පද එක් පැත්තකටත් නියත පද අනෙක් පැත්තකටත් ගෙන යන්න.' : 'Collect variable terms on one side and constants on the other.', math: `${leftText} = ${rightText}` })
      return makeLocalSolution(question, language, si ? 'වීජ ගණිතය · රේඛීය සමීකරණ' : 'Algebra · Linear equations', 'ax + b = c', steps, `x = ${displayNumber(answer)}`, `${displayNumber(checkedLeft)} = ${displayNumber(checkedRight)}`)
    }
  }

  const percentageMatch = question.match(/(-?\d+(?:\.\d+)?)\s*%\s*(?:of\s*)?(-?\d+(?:\.\d+)?)/i)
    || question.match(/(-?\d+(?:\.\d+)?)\s*(?:percent|per\s*cent)\s*of\s*(-?\d+(?:\.\d+)?)/i)
    || question.match(/(-?\d+(?:\.\d+)?)\s*න්\s*(-?\d+(?:\.\d+)?)\s*%/u)
  if (percentageMatch) {
    const percent = Number(percentageMatch[1]), amount = Number(percentageMatch[2])
    const answer = amount * percent / 100
    return makeLocalSolution(question, language, si ? 'ප්‍රතිශත' : 'Percentages', 'p% of n = (p ÷ 100) × n', [
      { title: si ? 'ප්‍රතිශතය දශමයක් කරන්න' : 'Convert percent to decimal', explanation: si ? 'ප්‍රතිශතය 100න් බෙදන්න.' : 'Divide the percentage by 100.', math: `${percent} ÷ 100 = ${displayNumber(percent / 100)}` },
      { title: si ? 'ප්‍රමාණයෙන් ගුණ කරන්න' : 'Multiply by the amount', explanation: si ? 'දශමය මුල් ප්‍රමාණයෙන් ගුණ කරන්න.' : 'Multiply the decimal by the original amount.', math: `${amount} × ${displayNumber(percent / 100)} = ${displayNumber(answer)}` },
    ], displayNumber(answer), `${percent}% of ${amount} = ${displayNumber(answer)}`)
  }

  const circle = question.match(/(?:radius\s*(?:of)?\s*|අරය\s*)(-?\d+(?:\.\d+)?)/iu)
  if (circle && /circle|වෘත්ත|area|වර්ගඵල/i.test(question)) {
    const radius = Number(circle[1])
    if (radius < 0) return null
    const area = Math.PI * radius ** 2
    const unit = question.match(/\b(mm|cm|m|km)\b/i)?.[1] ?? ''
    const squareUnit = unit ? ` ${unit}²` : ''
    return makeLocalSolution(question, language, si ? 'ජ්‍යාමිතිය · වෘත්ත' : 'Geometry · Circles', 'A = πr²', [
      { title: si ? 'අරය හඳුනාගන්න' : 'Identify the radius', explanation: si ? 'දී ඇති අරය සූත්‍රයට යොදන්න.' : 'Substitute the radius into the area formula.', math: `r = ${radius}${unit ? ` ${unit}` : ''}` },
      { title: si ? 'වර්ගඵලය සොයන්න' : 'Calculate the area', explanation: si ? 'A = πr² සූත්‍රය භාවිතා කරන්න.' : 'Square the radius and multiply by π.', math: `A = π × ${radius}² = ${displayNumber(area)}${squareUnit}` },
    ], `${displayNumber(area)}${squareUnit}`, `π × ${radius}² = ${displayNumber(area)}${squareUnit}`)
  }

  const rectangle = /(?:length|දිග)\s*(-?\d+(?:\.\d+)?)\s*(mm|cm|m|km)?[\s\S]*?(?:width|breadth|පළල)\s*(-?\d+(?:\.\d+)?)\s*(mm|cm|m|km)?/iu.exec(question)
  if (rectangle && /rectangle|සෘජුකෝණාස්‍ර|area|වර්ගඵල/i.test(question)) {
    const length = Number(rectangle[1]), width = Number(rectangle[3])
    const lengthUnit = rectangle[2]?.toLowerCase() ?? '', widthUnit = rectangle[4]?.toLowerCase() ?? ''
    if (length < 0 || width < 0 || (lengthUnit && widthUnit && lengthUnit !== widthUnit)) return null
    const unit = lengthUnit || widthUnit
    const squareUnit = unit ? ` ${unit}²` : ''
    const area = length * width
    return makeLocalSolution(question, language, si ? 'ජ්‍යාමිතිය · සෘජුකෝණාස්‍ර' : 'Geometry · Rectangles', 'A = l × w', [
      { title: si ? 'දිග සහ පළල හඳුනාගන්න' : 'Identify the dimensions', explanation: si ? 'ප්‍රශ්නයෙන් දිග සහ පළල ගන්න.' : 'Read the length and width from the question.', math: `l = ${length}, w = ${width}` },
      { title: si ? 'වර්ගඵලය ගණනය කරන්න' : 'Calculate the area', explanation: si ? 'දිග පළලෙන් ගුණ කරන්න.' : 'Multiply the length by the width.', math: `${length} × ${width} = ${displayNumber(area)}${squareUnit}` },
    ], `${displayNumber(area)}${squareUnit}`, `${length} × ${width} = ${displayNumber(area)}${squareUnit}`)
  }

  let expression = question
    .replace(/^\s*(?:calculate|evaluate|what\s+is)\s*:?\s*/i, '')
    .replace(/\bplus\b/gi, '+').replace(/\bminus\b/gi, '-')
    .replace(/\b(?:times|multiplied\s+by)\b/gi, '*').replace(/\b(?:divided\s+by|over)\b/gi, '/')
    .replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-')
    .trim()
  if (expression.length > 0 && expression.length <= 240) {
    try {
      const node = safeExpression(expression)
      if (!node.filter((child) => child.isSymbolNode && !allowedConstants.has(child.name)).length) {
        const answer = math.evaluate(node.toString())
        if (typeof answer === 'number' && Number.isFinite(answer)) {
          return makeLocalSolution(question, language, si ? 'මූලික ගණිතය' : 'Basic mathematics', 'Order of operations', [
            { title: si ? 'ප්‍රකාශනය ගණනය කරන්න' : 'Evaluate the expression', explanation: si ? 'ක්‍රියා අනුපිළිවෙළ අනුව ගණනය කරන්න.' : 'Evaluate using the order of operations.', math: `${expression} = ${displayNumber(answer)}` },
          ], displayNumber(answer), `${expression} = ${displayNumber(answer)}`)
        }
      }
    } catch { /* Use the AI quota message for unsupported local expressions. */ }
  }
  return null
}

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
    const localSolution = solveLocally(normalized, language, mode)
    if (localSolution) return res.status(200).json(localSolution)
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
        const localSolution = solveLocally(normalized, language, mode)
        if (localSolution) return res.status(200).json(localSolution)
        return res.status(429).json({
          error: si
            ? 'OpenAI quota ඉවරයි. සහාය නොදක්වන ගැටලු සඳහා https://platform.openai.com හි billing පරීක්ෂා කරන්න.'
            : 'OpenAI quota exceeded. This question needs AI solving; check billing at https://platform.openai.com.',
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
