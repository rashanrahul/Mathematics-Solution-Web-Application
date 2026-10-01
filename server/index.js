import express from 'express'
import { all, create, parse } from 'mathjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 3001
const math = create(all, { number: 'number', precision: 14 })
const clientDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const allowedOperators = new Set(['+', '-', '*', '/', '^', '%'])
const allowedConstants = new Set(['pi', 'e'])

app.use(express.json({ limit: '16kb' }))

function safeParse(expression) {
  if (!expression || expression.length > 240) {
    throw new Error('Enter a math expression under 240 characters.')
  }

  const node = parse(expression)
  node.traverse((child) => {
    if (child.isOperatorNode && !allowedOperators.has(child.op)) {
      throw new Error('This operator is not supported yet.')
    }
    if (child.isFunctionNode || child.isAssignmentNode || child.isAccessorNode) {
      throw new Error('Functions and assignments are not supported in this expression.')
    }
    if (child.isSymbolNode && !allowedConstants.has(child.name) && child.name !== 'x') {
      throw new Error(`The symbol “${child.name}” is not supported here.`)
    }
  })
  return node
}

function linearForm(node) {
  if (node.isParenthesisNode) return linearForm(node.content)
  if (node.isConstantNode) return { coefficient: 0, constant: Number(node.value) }
  if (node.isSymbolNode) {
    if (node.name === 'x') return { coefficient: 1, constant: 0 }
    return { coefficient: 0, constant: math.evaluate(node.name) }
  }
  if (!node.isOperatorNode) throw new Error('Use a linear equation with one variable, such as 2x + 5 = 15.')

  const args = node.args.map(linearForm)
  if (node.fn === 'unaryMinus') return { coefficient: -args[0].coefficient, constant: -args[0].constant }
  if (node.fn === 'unaryPlus') return args[0]

  const [left, right] = args
  if (node.op === '+') return { coefficient: left.coefficient + right.coefficient, constant: left.constant + right.constant }
  if (node.op === '-') return { coefficient: left.coefficient - right.coefficient, constant: left.constant - right.constant }
  if (node.op === '*' && (left.coefficient === 0 || right.coefficient === 0)) {
    return {
      coefficient: left.coefficient * right.constant + right.coefficient * left.constant,
      constant: left.constant * right.constant,
    }
  }
  if (node.op === '/' && right.coefficient === 0 && right.constant !== 0) {
    return { coefficient: left.coefficient / right.constant, constant: left.constant / right.constant }
  }
  throw new Error('This equation is not linear. Try a one-variable linear equation.')
}

function displayNumber(value) {
  if (Math.abs(value) < 1e-10) return '0'
  return Number(value.toPrecision(10)).toString()
}

function displayTerm(coefficient) {
  if (coefficient === 1) return 'x'
  if (coefficient === -1) return '-x'
  return `${displayNumber(coefficient)}x`
}

function solveEquation(question, language, mode) {
  const sides = question.split('=')
  if (sides.length !== 2) throw new Error('Enter an equation with one equals sign, such as 2x + 5 = 15.')

  const left = linearForm(safeParse(sides[0].replaceAll('²', '^2').replaceAll('−', '-')))
  const right = linearForm(safeParse(sides[1].replaceAll('²', '^2').replaceAll('−', '-')))
  const coefficient = left.coefficient - right.coefficient
  const remainder = right.constant - left.constant
  if (Math.abs(coefficient) < 1e-10) {
    throw new Error(Math.abs(remainder) < 1e-10 ? 'Every value of x is a solution to this equation.' : 'This equation has no solution.')
  }

  const answer = remainder / coefficient
  const steps = []
  const languageIsSinhala = language === 'si'
  const original = `${sides[0].trim()} = ${sides[1].trim()}`
  const simplifiedLeft = `${displayTerm(left.coefficient)}${left.constant ? ` ${left.constant > 0 ? '+' : '-'} ${displayNumber(Math.abs(left.constant))}` : ''}`
  const simplifiedRight = `${displayTerm(right.coefficient)}${right.constant ? ` ${right.constant > 0 ? '+' : '-'} ${displayNumber(Math.abs(right.constant))}` : ''}`

  if (mode === 'detailed') {
    steps.push({
      title: languageIsSinhala ? 'සමාන පද එකතු කරන්න' : 'Collect like terms',
      explanation: languageIsSinhala ? 'විචල්‍ය පද එක පැත්තකටත් නියත පද අනෙක් පැත්තකටත් ගෙන යමු.' : 'Move variable terms to one side and constants to the other.',
      math: `${simplifiedLeft} = ${simplifiedRight}`,
    })
  }
  steps.push({
    title: mode === 'simple'
      ? (languageIsSinhala ? 'එකතු කළ සංඛ්‍යාව ඉවත් කරන්න' : 'Undo the addition')
      : (languageIsSinhala ? 'නියත පද ඉවත් කරන්න' : 'Isolate the variable term'),
    explanation: mode === 'simple'
      ? (languageIsSinhala ? 'දෙපසින්ම ප්‍රතිවිරුද්ධ ක්‍රියාව යොදා x අසල නියත පදය ඉවත් කරන්න.' : 'Use the opposite operation on both sides to remove the constant next to x.')
      : (languageIsSinhala ? 'ප්‍රතිවිරුද්ධ ක්‍රියා භාවිතයෙන් නියත පද විචල්‍යයෙන් වෙන් කරන්න.' : 'Use inverse operations to move constant terms away from the variable.'),
    math: `${displayTerm(coefficient)} = ${displayNumber(remainder)}`,
  })
  steps.push({
    title: mode === 'simple'
      ? (languageIsSinhala ? 'x සොයන්න' : 'Find x')
      : (languageIsSinhala ? 'x හි අගය සොයන්න' : 'Solve for x'),
    explanation: mode === 'simple'
      ? (languageIsSinhala ? 'x තනි කිරීමට දෙපසම එකම සංඛ්‍යාවෙන් බෙදන්න.' : `Divide both sides by ${displayNumber(coefficient)} so x is alone.`)
      : (languageIsSinhala ? 'දෙපසම x හි සංගුණකයෙන් බෙදන්න.' : `Divide both sides by ${displayNumber(coefficient)}.`),
    math: `x = ${displayNumber(remainder)} / ${displayNumber(coefficient)} = ${displayNumber(answer)}`,
  })

  const checked = math.evaluate(sides[0].replaceAll('²', '^2'), { x: answer })
  const expected = math.evaluate(sides[1].replaceAll('²', '^2'), { x: answer })
  return {
    question: original,
    topic: 'Algebra · Linear equations',
    formula: 'ax + b = c  →  x = (c − b) / a',
    steps,
    answer: `x = ${displayNumber(answer)}`,
    verification: `${displayNumber(checked)} = ${displayNumber(expected)}`,
    verified: Math.abs(checked - expected) < 1e-8,
    verificationLabel: languageIsSinhala ? 'පිළිතුර තහවුරුයි' : 'Answer verified',
  }
}

function solveCircle(question, language) {
  const radiusMatch = question.match(/(?:radius\s*(?:of)?\s*|r\s*=\s*)(-?\d+(?:\.\d+)?)/i) || question.match(/^\s*(-?\d+(?:\.\d+)?)\s*$/)
  if (!radiusMatch) throw new Error('Enter a circle radius, for example “Find the area of a circle with radius 7”.')
  const radius = Number(radiusMatch[1])
  if (radius < 0) throw new Error('A circle radius cannot be negative.')
  const unit = question.match(/\b(mm|cm|m|km)\b/i)?.[1] ?? ''
  const areaUnit = unit ? ` ${unit}²` : ''
  const area = Math.PI * radius ** 2
  return {
    question,
    topic: 'Geometry · Circles',
    formula: 'A = πr²',
    steps: [
      { title: language === 'si' ? 'අරය හඳුනාගන්න' : 'Identify the radius', explanation: language === 'si' ? 'දී ඇති අරය සූත්‍රයට යොදන්න.' : 'Substitute the given radius into the area formula.', math: `r = ${displayNumber(radius)}${unit ? ` ${unit}` : ''}` },
      { title: language === 'si' ? 'සූත්‍රයට අගය යොදන්න' : 'Substitute into the formula', explanation: language === 'si' ? 'A = πr² සූත්‍රය භාවිතා කරන්න.' : 'Square the radius and multiply by π.', math: `A = π × ${displayNumber(radius)}² = ${displayNumber(Math.PI * radius ** 2)}${areaUnit}` },
    ],
    answer: `${displayNumber(Math.PI * radius ** 2)}${areaUnit}`,
    verification: `π × ${displayNumber(radius)}² = ${displayNumber(area)}${areaUnit}`,
    verified: Number.isFinite(area),
    verificationLabel: language === 'si' ? 'සූත්‍රය පරීක්ෂා කළා' : 'Formula checked',
  }
}

function solveDerivative(question, language) {
  const expression = question.replace(/^\s*(differentiate|derivative\s+of|d\/dx\s*)/i, '').trim()
  if (!expression) throw new Error('Enter an expression to differentiate, such as “Differentiate x^2 + 3x + 2”.')
  const tree = safeParse(expression.replaceAll('²', '^2').replaceAll('−', '-'))
  const result = math.derivative(tree, 'x').toString()
  const checked = [1, 2].every((x) => {
    const delta = 1e-5
    const numerical = (math.evaluate(expression, { x: x + delta }) - math.evaluate(expression, { x: x - delta })) / (2 * delta)
    const symbolic = math.evaluate(result, { x })
    return Number.isFinite(numerical) && Number.isFinite(symbolic) && Math.abs(numerical - symbolic) < 1e-4
  })
  return {
    question,
    topic: 'Calculus · Differentiation',
    formula: 'd/dx (xⁿ) = n·xⁿ⁻¹',
    steps: [{ title: language === 'si' ? 'අවකලනය කරන්න' : 'Differentiate each term', explanation: language === 'si' ? 'එක් එක් පදයට බල නියමය යොදන්න.' : 'Apply the power rule to each term and simplify.', math: `d/dx (${expression})` }],
    answer: `f′(x) = ${result}`,
    verification: checked ? 'Numerical derivative check passed at x = 1 and x = 2' : 'Numerical derivative check needs review',
    verified: checked,
    verificationLabel: language === 'si' ? (checked ? 'සංඛ්‍යාත්මකව පරීක්ෂා කළා' : 'නැවත පරීක්ෂා කරන්න') : (checked ? 'Numerical check passed' : 'Check needed'),
  }
}

function solveArithmetic(question) {
  const node = safeParse(question.replaceAll('²', '^2').replaceAll('−', '-'))
  if (node.filter((child) => child.isSymbolNode && !allowedConstants.has(child.name)).length) {
    throw new Error('For arithmetic, enter numbers and operators, such as “(12 + 8) / 4”.')
  }
  const answer = math.evaluate(node.toString())
  if (typeof answer !== 'number' || !Number.isFinite(answer)) throw new Error('This expression does not produce a finite number.')
  return {
    question,
    topic: 'Basic math · Arithmetic',
    formula: 'Order of operations (BODMAS)',
    steps: [{ title: 'Evaluate the expression', explanation: 'Follow the order of operations, then simplify.', math: `${question} = ${displayNumber(answer)}` }],
    answer: displayNumber(answer),
    verification: `Calculated by the mathematics engine: ${displayNumber(answer)}`,
    verified: true,
    verificationLabel: 'Calculated',
  }
}

app.post('/api/solve', (request, response) => {
  const { question = '', topic = 'auto', language = 'en', mode = 'standard' } = request.body ?? {}
  const normalized = question.trim()
  if (!normalized) return response.status(400).json({ error: 'Enter a mathematics question to get started.' })

  try {
    let solution
    const isDerivative = topic === 'differentiation' || /^(differentiate|derivative\s+of|d\/dx)/i.test(normalized)
    const isCircle = topic === 'circles' || /area.*circle|circle.*area|radius/i.test(normalized)
    if (isDerivative) solution = solveDerivative(normalized, language)
    else if (normalized.includes('=')) solution = solveEquation(normalized, language, mode)
    else if (isCircle) solution = solveCircle(normalized, language)
    else solution = solveArithmetic(normalized)
    response.json(solution)
  } catch (error) {
    response.status(400).json({ error: error.message || 'We could not solve that problem yet.' })
  }
})

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
app.use('/api', (_request, response) => response.status(404).json({ error: 'API endpoint not found.' }))
app.use(express.static(clientDirectory))
app.get(/.*/, (_request, response) => response.sendFile(path.join(clientDirectory, 'index.html')))

app.listen(port, () => console.log(`MathSolve API listening on http://localhost:${port}`))