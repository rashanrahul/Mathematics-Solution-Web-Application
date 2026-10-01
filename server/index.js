import express from 'express'
import { all, create, parse } from 'mathjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

// Load .env without extra dependency
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
} catch { /* .env is optional */ }

const app = express()
const port = process.env.PORT || 3001
const math = create(all, { number: 'number', precision: 14 })
const fractionMath = create(all, { number: 'Fraction' })
const clientDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const allowedOperators = new Set(['+', '-', '*', '/', '^', '%'])
const allowedConstants = new Set(['pi', 'e'])
const allowedFunctions = new Set(['sqrt', 'abs', 'log', 'log2', 'log10', 'sin', 'cos', 'tan', 'ceil', 'floor', 'round'])

app.use(express.json({ limit: '16kb' }))

function safeParse(expression) {
  if (!expression || expression.length > 240) throw new Error('Enter a math expression under 240 characters.')
  const node = parse(expression)
  node.traverse((child) => {
    if (child.isOperatorNode && !allowedOperators.has(child.op)) throw new Error('This operator is not supported yet.')
    if (child.isAssignmentNode || child.isAccessorNode) throw new Error('Assignments are not supported.')
    if (child.isFunctionNode && !allowedFunctions.has(child.name)) throw new Error(`Function "${child.name}" is not supported here.`)
    if (child.isSymbolNode && !allowedConstants.has(child.name) && child.name !== 'x' && child.name !== 'y') throw new Error(`The symbol "${child.name}" is not supported here.`)
  })
  return node
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

function extractEquation(question) {
  const match = question.match(/[0-9xX()+\-*/^.\s²]+=[ 0-9xX()+\-*/^.\s²]+/)
  if (!match) return question
  return match[0].trim().replace(/[.!?]+$/, '').trim()
}

function extractNumbers(text) {
  return [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))
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
    return { coefficient: left.coefficient * right.constant + right.coefficient * left.constant, constant: left.constant * right.constant }
  }
  if (node.op === '/' && right.coefficient === 0 && right.constant !== 0) {
    return { coefficient: left.coefficient / right.constant, constant: left.constant / right.constant }
  }
  throw new Error('This equation is not linear. Try a one-variable linear equation.')
}

function solveEquation(question, language, mode) {
  const sides = extractEquation(question).split('=')
  if (sides.length !== 2) throw new Error('Enter an equation with one equals sign, such as 2x + 5 = 15.')
  const left = linearForm(safeParse(sides[0].replaceAll('²', '^2').replaceAll('−', '-')))
  const right = linearForm(safeParse(sides[1].replaceAll('²', '^2').replaceAll('−', '-')))
  const coefficient = left.coefficient - right.coefficient
  const remainder = right.constant - left.constant
  if (Math.abs(coefficient) < 1e-10) throw new Error(Math.abs(remainder) < 1e-10 ? 'Every value of x is a solution.' : 'This equation has no solution.')
  const answer = remainder / coefficient
  const si = language === 'si'
  const steps = []
  const simplifiedLeft = `${displayTerm(left.coefficient)}${left.constant ? ` ${left.constant > 0 ? '+' : '-'} ${displayNumber(Math.abs(left.constant))}` : ''}`
  const simplifiedRight = `${displayTerm(right.coefficient)}${right.constant ? ` ${right.constant > 0 ? '+' : '-'} ${displayNumber(Math.abs(right.constant))}` : ''}`
  if (mode === 'detailed') steps.push({ title: si ? 'සමාන පද එකතු කරන්න' : 'Collect like terms', explanation: si ? 'විචල්ය පද එක පැත්තකටත් නියත පද අනෙක් පැත්තකටත් ගෙන යමු.' : 'Move variable terms to one side and constants to the other.', math: `${simplifiedLeft} = ${simplifiedRight}` })
  steps.push({ title: si ? 'නියත පද ඉවත් කරන්න' : 'Isolate the variable term', explanation: si ? 'ප්රතිවිරුද්ධ ක්රියා භාවිතයෙන් නියත පද විචල්යයෙන් වෙන් කරන්න.' : 'Use inverse operations to move constant terms away from the variable.', math: `${displayTerm(coefficient)} = ${displayNumber(remainder)}` })
  steps.push({ title: si ? 'x හි අගය සොයන්න' : 'Solve for x', explanation: si ? `දෙපසම ${displayNumber(coefficient)} න් බෙදන්න.` : `Divide both sides by ${displayNumber(coefficient)}.`, math: `x = ${displayNumber(remainder)} / ${displayNumber(coefficient)} = ${displayNumber(answer)}` })
  const checked = math.evaluate(sides[0].replaceAll('²', '^2'), { x: answer })
  const expected = math.evaluate(sides[1].replaceAll('²', '^2'), { x: answer })
  return { question: `${sides[0].trim()} = ${sides[1].trim()}`, topic: si ? 'වීජ ගණිතය · රේඛීය සමීකරණ' : 'Algebra · Linear equations', formula: 'ax + b = c  →  x = (c − b) / a', steps, answer: `x = ${displayNumber(answer)}`, verification: `${displayNumber(checked)} = ${displayNumber(expected)}`, verified: Math.abs(checked - expected) < 1e-8, verificationLabel: si ? 'පිළිතුර තහවුරුයි' : 'Answer verified' }
}

function solveQuadratic(question, language, mode) {
  const si = language === 'si'
  const sides = extractEquation(question).split('=')
  if (sides.length !== 2) throw new Error(si ? 'ax² + bx + c = 0 ආකාරයේ සමීකරණයක් ඇතුළත් කරන්න.' : 'Enter a quadratic equation like ax² + bx + c = 0.')
  const expr = `(${sides[0].trim().replaceAll('²', '^2').replaceAll('−', '-')}) - (${sides[1].trim().replaceAll('²', '^2').replaceAll('−', '-')})`
  let a, b, c
  try {
    c = math.evaluate(expr, { x: 0 })
    const f1 = math.evaluate(expr, { x: 1 }), fm1 = math.evaluate(expr, { x: -1 })
    a = (f1 + fm1 - 2 * c) / 2; b = f1 - a - c
  } catch { throw new Error(si ? 'සමීකරණය නිවැරදිව ඇතුළත් කරන්න.' : 'Could not read the equation. Check the format.') }
  if (Math.abs(a) < 1e-10) throw new Error(si ? 'x² පදය නොමැත.' : 'No x² term found. Use the linear equation solver.')
  const disc = b * b - 4 * a * c
  const steps = []
  if (mode !== 'simple') steps.push({ title: si ? 'සංගුණක හඳුනාගන්න' : 'Identify coefficients', explanation: si ? 'ax² + bx + c = 0 ආකාරයෙන් a, b, c සොයන්න.' : 'Read a, b, c from ax² + bx + c = 0.', math: `a = ${displayNumber(a)},  b = ${displayNumber(b)},  c = ${displayNumber(c)}` })
  steps.push({ title: si ? 'විභේදකය ගණනය කරන්න' : 'Calculate the discriminant', explanation: 'Δ = b² − 4ac', math: `Δ = ${displayNumber(b)}² − 4 × ${displayNumber(a)} × ${displayNumber(c)} = ${displayNumber(disc)}` })
  let answer, verification
  if (disc < 0) {
    answer = si ? 'සැබෑ මූල නොමැත (Δ < 0)' : 'No real roots (Δ < 0)'
    verification = si ? 'Δ < 0 නිසා සැබෑ විසඳුමක් නොමැත.' : 'Discriminant is negative — no real solutions.'
    steps.push({ title: si ? 'නිගමනය' : 'Conclusion', explanation: si ? 'Δ < 0 නිසා සැබෑ මූල නොමැත.' : 'No real roots since Δ < 0.', math: `Δ = ${displayNumber(disc)} < 0` })
  } else if (Math.abs(disc) < 1e-10) {
    const x1 = -b / (2 * a); answer = `x = ${displayNumber(x1)}`
    verification = `Substituting x = ${displayNumber(x1)} gives ≈ 0`
    steps.push({ title: si ? 'එකම මූලය' : 'Repeated root', explanation: si ? 'Δ = 0 නිසා එකම මූලයක් ඇත.' : 'Δ = 0 means one repeated root.', math: `x = −b / (2a) = ${displayNumber(x1)}` })
  } else {
    const sqrtD = Math.sqrt(disc), x1 = (-b + sqrtD) / (2 * a), x2 = (-b - sqrtD) / (2 * a)
    answer = `x₁ = ${displayNumber(x1)},  x₂ = ${displayNumber(x2)}`
    verification = `x₁: ${displayNumber(math.evaluate(expr, { x: x1 }))} ≈ 0,  x₂: ${displayNumber(math.evaluate(expr, { x: x2 }))} ≈ 0`
    steps.push({ title: si ? 'ද්විමූල සූත්රය' : 'Quadratic formula', explanation: 'x = (−b ± √Δ) / (2a)', math: `x = (−${displayNumber(b)} ± √${displayNumber(disc)}) / (2 × ${displayNumber(a)})` })
    steps.push({ title: si ? 'මූල දෙක' : 'Both roots', explanation: si ? 'ධන සහ ඍණ අගයන් දෙකම.' : 'Evaluate with + and − separately.', math: answer })
  }
  return { question, topic: si ? 'වීජ ගණිතය · ද්විමූල සමීකරණ' : 'Algebra · Quadratic equations', formula: 'x = (−b ± √(b²−4ac)) / 2a', steps, answer, verification, verified: disc >= 0, verificationLabel: si ? (disc >= 0 ? 'පිළිතුර තහවුරුයි' : 'සැබෑ මූල නොමැත') : (disc >= 0 ? 'Roots verified' : 'No real roots') }
}

function solvePercentage(question, language, mode) {
  const si = language === 'si'
  const increaseMatch = question.match(/increase\s*(-?\d+(?:\.\d+)?)\s*by\s*(-?\d+(?:\.\d+)?)\s*%/i) || question.match(/(-?\d+(?:\.\d+)?)\s*(?:වැඩි)\s*(-?\d+(?:\.\d+)?)\s*%/iu)
  const decreaseMatch = question.match(/decrease\s*(-?\d+(?:\.\d+)?)\s*by\s*(-?\d+(?:\.\d+)?)\s*%/i) || question.match(/(-?\d+(?:\.\d+)?)\s*(?:අඩු)\s*(-?\d+(?:\.\d+)?)\s*%/iu)
  if (increaseMatch) {
    const base = Number(increaseMatch[1]), pct = Number(increaseMatch[2]), change = base * pct / 100, result = base + change
    return { question, topic: si ? 'ප්රතිශත · වැඩිවීම' : 'Percentages · Increase', formula: 'New = original × (1 + p/100)', steps: [{ title: si ? 'වැඩිවීම ගණනය කරන්න' : 'Calculate the increase', explanation: si ? 'මුල් අගය × ප්රතිශතය ÷ 100' : 'Multiply original by percentage / 100.', math: `${base} × ${pct} / 100 = ${displayNumber(change)}` }, { title: si ? 'නව අගය' : 'New value', explanation: si ? 'මුල් අගයට වැඩිවීම එකතු කරන්න.' : 'Add the increase to the original.', math: `${base} + ${displayNumber(change)} = ${displayNumber(result)}` }], answer: displayNumber(result), verification: `${base} + ${pct}% = ${displayNumber(result)}`, verified: true, verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Verified' }
  }
  if (decreaseMatch) {
    const base = Number(decreaseMatch[1]), pct = Number(decreaseMatch[2]), change = base * pct / 100, result = base - change
    return { question, topic: si ? 'ප්රතිශත · අඩුවීම' : 'Percentages · Decrease', formula: 'New = original × (1 − p/100)', steps: [{ title: si ? 'අඩුවීම ගණනය කරන්න' : 'Calculate the decrease', explanation: si ? 'මුල් අගය × ප්රතිශතය ÷ 100' : 'Multiply original by percentage / 100.', math: `${base} × ${pct} / 100 = ${displayNumber(change)}` }, { title: si ? 'නව අගය' : 'New value', explanation: si ? 'මුල් අගයෙන් අඩුවීම අඩු කරන්න.' : 'Subtract the decrease from the original.', math: `${base} - ${displayNumber(change)} = ${displayNumber(result)}` }], answer: displayNumber(result), verification: `${base} - ${pct}% = ${displayNumber(result)}`, verified: true, verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Verified' }
  }
  const percentOf = question.match(/(-?\d+(?:\.\d+)?)\s*%\s*(?:of\s*)?(-?\d+(?:\.\d+)?)/i) || question.match(/(-?\d+(?:\.\d+)?)\s*(?:percent|per\s*cent)\s*of\s*(-?\d+(?:\.\d+)?)/i) || question.match(/සියයට\s*(-?\d+(?:\.\d+)?)\s*(?:ක\s*)?(-?\d+(?:\.\d+)?)/u)
  const amountFirst = question.match(/(-?\d+(?:\.\d+)?)\s*(?:න්|හි)\s*(-?\d+(?:\.\d+)?)\s*%/u)
  const enRate = question.match(/what\s+(?:percentage|percent)\s+of\s*(-?\d+(?:\.\d+)?)\s+is\s*(-?\d+(?:\.\d+)?)/i)
  const siRate = question.match(/(-?\d+(?:\.\d+)?)\s*යනු\s*(-?\d+(?:\.\d+)?)\s*න්\s*සියයට\s*කීයද/u)
  let percent, amount, result, isFindingRate = false
  if (enRate || siRate) {
    const m = enRate || siRate; amount = Number(enRate ? m[1] : m[2]); result = Number(enRate ? m[2] : m[1])
    if (amount === 0) throw new Error(si ? 'මුල් සංඛ්යාව 0 විය නොහැක.' : 'The reference amount cannot be zero.')
    percent = result / amount * 100; isFindingRate = true
  } else if (amountFirst) { amount = Number(amountFirst[1]); percent = Number(amountFirst[2]); result = amount * percent / 100 }
  else if (percentOf) { percent = Number(percentOf[1]); amount = Number(percentOf[2]); result = amount * percent / 100 }
  else throw new Error(si ? 'ප්රතිශතය සහ මුල් සංඛ්යාව සඳහන් කරන්න. උදා: 200න් 15% කීයද?' : 'Include a percentage and an amount, e.g. "What is 15% of 200?".')
  const steps = []
  if (mode === 'detailed') steps.push({ title: si ? 'ප්රතිශතය භාගයක් ලෙස' : 'Percentage as fraction', explanation: si ? 'ප්රතිශතය 100න් බෙදන්න.' : 'A percent means "out of 100".', math: `${displayNumber(percent)}% = ${displayNumber(percent)} / 100` })
  if (isFindingRate) steps.push({ title: si ? 'ප්රතිශතය සොයන්න' : 'Find the percentage', explanation: si ? 'කොටස ÷ මුළු × 100' : 'Divide the part by the whole and multiply by 100.', math: `${displayNumber(result)} ÷ ${displayNumber(amount)} × 100 = ${displayNumber(percent)}%` })
  else { steps.push({ title: si ? 'දශමයට හරවන්න' : 'Convert to decimal', explanation: si ? 'ප්රතිශතය 100න් බෙදන්න.' : 'Divide the percentage by 100.', math: `${displayNumber(percent)} ÷ 100 = ${displayNumber(percent / 100)}` }); steps.push({ title: si ? 'ගුණ කරන්න' : 'Multiply', explanation: si ? 'දශමය × මුල් සංඛ්යාව' : 'Multiply the decimal by the original amount.', math: `${displayNumber(amount)} × ${displayNumber(percent / 100)} = ${displayNumber(result)}` }) }
  return { question, topic: si ? 'ප්රතිශත' : 'Percentages', formula: isFindingRate ? 'Percentage = (part ÷ whole) × 100' : 'p% of n = (p ÷ 100) × n', steps, answer: isFindingRate ? `${displayNumber(percent)}%` : displayNumber(result), verification: `${displayNumber(percent)}% of ${displayNumber(amount)} = ${displayNumber(result)}`, verified: Number.isFinite(result) && Number.isFinite(percent), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Calculation verified' }
}

function solveCircle(question, language) {
  const si = language === 'si'
  const rM = question.match(/(?:radius\s*(?:of)?\s*|r\s*=\s*|අරය\s*(?:වන්නේ\s*)?|වෘත්ත(?:යක)?\s*අරය\s*)(-?\d+(?:\.\d+)?)/i) || question.match(/^\s*(-?\d+(?:\.\d+)?)\s*$/)
  if (!rM) throw new Error('Enter a circle radius, e.g. "Find the area of a circle with radius 7".')
  const radius = Number(rM[1]); if (radius < 0) throw new Error('A circle radius cannot be negative.')
  const unit = question.match(/\b(mm|cm|m|km)\b/i)?.[1] ?? '', au = unit ? ` ${unit}²` : ''
  const isC = /circumference|perimeter|වටපරිධිය|පරිධිය/u.test(question)
  const result = isC ? 2 * Math.PI * radius : Math.PI * radius ** 2, formula = isC ? 'C = 2πr' : 'A = πr²'
  return { question, topic: si ? 'ජ්යාමිතිය · වෘත්ත' : 'Geometry · Circles', formula, steps: [{ title: si ? 'අරය හඳුනාගන්න' : 'Identify the radius', explanation: si ? 'දී ඇති අරය සූත්රයට යොදන්න.' : 'Substitute the given radius.', math: `r = ${displayNumber(radius)}${unit ? ` ${unit}` : ''}` }, { title: si ? 'සූත්රයට යොදන්න' : 'Substitute into formula', explanation: si ? (isC ? 'C = 2πr' : 'A = πr²') : (isC ? 'Multiply radius by 2π.' : 'Square radius and multiply by π.'), math: isC ? `C = 2 × π × ${displayNumber(radius)} = ${displayNumber(result)}${unit ? ` ${unit}` : ''}` : `A = π × ${displayNumber(radius)}² = ${displayNumber(result)}${au}` }], answer: `${displayNumber(result)}${isC && unit ? ` ${unit}` : au}`, verification: isC ? `2 × π × ${displayNumber(radius)} = ${displayNumber(result)}` : `π × ${displayNumber(radius)}² = ${displayNumber(result)}${au}`, verified: Number.isFinite(result), verificationLabel: si ? 'සූත්රය පරීක්ෂා කළා' : 'Formula checked' }
}

function solveRectangle(question, language, mode) {
  const si = language === 'si'
  const lM = question.match(/(?:length|දිග)\s*(?:is\s*)?(-?\d+(?:\.\d+)?)\s*(mm|cm|m|km)?/i)
  const wM = question.match(/(?:width|breadth|පළල)\s*(?:is\s*)?(-?\d+(?:\.\d+)?)\s*(mm|cm|m|km)?/i)
  if (!lM || !wM) throw new Error(si ? 'දිග සහ පළල සඳහන් කරන්න.' : 'Include both length and width.')
  const length = Number(lM[1]), width = Number(wM[1])
  if (length < 0 || width < 0) throw new Error(si ? 'ඍණ විය නොහැක.' : 'Length and width cannot be negative.')
  const lu = lM[2]?.toLowerCase() ?? '', wu = wM[2]?.toLowerCase() ?? ''
  if (lu && wu && lu !== wu) throw new Error(si ? 'එකම ඒකකය භාවිතා කරන්න.' : 'Use the same unit.')
  const unit = lu || wu, isP = /perimeter|පරිමිතිය/u.test(question)
  const result = isP ? 2 * (length + width) : length * width, ru = unit ? ` ${unit}${isP ? '' : '²'}` : ''
  const formula = isP ? 'P = 2(l + w)' : 'A = l × w'
  const steps = [{ title: si ? 'මිනුම් හඳුනාගන්න' : 'Identify dimensions', explanation: si ? 'දිග සහ පළල සටහන් කරගන්න.' : 'Read length and width.', math: `l = ${displayNumber(length)}${unit ? ` ${unit}` : ''},  w = ${displayNumber(width)}${unit ? ` ${unit}` : ''}` }]
  if (mode === 'detailed') steps.push({ title: si ? 'සූත්රය' : 'Formula', explanation: formula, math: formula })
  steps.push({ title: si ? (isP ? 'පරිමිතිය' : 'වර්ගඵලය') : (isP ? 'Perimeter' : 'Area'), explanation: si ? (isP ? '2 × (l + w)' : 'l × w') : (isP ? 'Add and multiply by 2.' : 'Multiply length by width.'), math: isP ? `2 × (${displayNumber(length)} + ${displayNumber(width)}) = ${displayNumber(result)}${ru}` : `${displayNumber(length)} × ${displayNumber(width)} = ${displayNumber(result)}${ru}` })
  return { question, topic: si ? 'ජ්යාමිතිය · සෘජුකෝණාස්ර' : 'Geometry · Rectangles', formula, steps, answer: `${displayNumber(result)}${ru}`, verification: `${displayNumber(length)} × ${displayNumber(width)} = ${displayNumber(result)}${ru}`, verified: Number.isFinite(result), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Calculation verified' }
}

function solveTriangle(question, language, mode) {
  const si = language === 'si'
  const bM = question.match(/(?:base|පාදය)\s*(?:is\s*)?(-?\d+(?:\.\d+)?)\s*(mm|cm|m|km)?/iu)
  const hM = question.match(/(?:height|උස)\s*(?:is\s*)?(-?\d+(?:\.\d+)?)\s*(mm|cm|m|km)?/iu)
  if (!bM || !hM) throw new Error(si ? 'ත්රිකෝණයේ පාදය සහ උස සඳහන් කරන්න.' : 'Include the triangle base and height.')
  const base = Number(bM[1]), height = Number(hM[1])
  if (base < 0 || height < 0) throw new Error(si ? 'ඍණ විය නොහැක.' : 'Base and height cannot be negative.')
  const unit = bM[2]?.toLowerCase() || hM[2]?.toLowerCase() || '', area = base * height / 2, au = unit ? ` ${unit}²` : ''
  const steps = [{ title: si ? 'පාදය සහ උස' : 'Base and height', explanation: si ? 'A = ½bh' : 'A = ½ × base × height', math: `b = ${displayNumber(base)}${unit ? ` ${unit}` : ''}, h = ${displayNumber(height)}${unit ? ` ${unit}` : ''}` }]
  if (mode === 'detailed') steps.push({ title: si ? 'සූත්රය' : 'Formula', explanation: 'A = ½ × b × h', math: 'A = ½ × b × h' })
  steps.push({ title: si ? 'වර්ගඵලය' : 'Area', explanation: si ? 'b × h ÷ 2' : 'base × height ÷ 2', math: `${displayNumber(base)} × ${displayNumber(height)} ÷ 2 = ${displayNumber(area)}${au}` })
  return { question, topic: si ? 'ජ්යාමිතිය · ත්රිකෝණ' : 'Geometry · Triangles', formula: 'A = ½bh', steps, answer: `${displayNumber(area)}${au}`, verification: `${displayNumber(base)} × ${displayNumber(height)} ÷ 2 = ${displayNumber(area)}${au}`, verified: Number.isFinite(area), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Calculation verified' }
}

function solveSquare(question, language, mode) {
  const si = language === 'si'
  const sM = question.match(/(?:side|පැත්ත)\s*(?:is\s*)?(-?\d+(?:\.\d+)?)\s*(mm|cm|m|km)?/iu)
  if (!sM) throw new Error(si ? 'චතුරස්රයේ පැත්ත සඳහන් කරන්න.' : 'Include the square side length.')
  const side = Number(sM[1]); if (side < 0) throw new Error(si ? 'ඍණ විය නොහැක.' : 'Side cannot be negative.')
  const unit = sM[2]?.toLowerCase() ?? '', isP = /perimeter|පරිමිතිය/u.test(question)
  const result = isP ? side * 4 : side ** 2, ru = unit ? ` ${unit}${isP ? '' : '²'}` : '', formula = isP ? 'P = 4s' : 'A = s²'
  const action = isP ? (si ? 'පරිමිතිය' : 'perimeter') : (si ? 'වර්ගඵලය' : 'area')
  const steps = [{ title: si ? 'පැත්ත' : 'Side', explanation: si ? 'දී ඇති පැත්ත සූත්රයට යොදන්න.' : 'Substitute the side length.', math: `s = ${displayNumber(side)}${unit ? ` ${unit}` : ''}` }]
  if (mode === 'detailed') steps.push({ title: si ? 'සූත්රය' : 'Formula', explanation: `${action}: ${formula}`, math: formula })
  steps.push({ title: si ? `${action} ගණනය කරන්න` : `Calculate ${action}`, explanation: si ? (isP ? '4 × s' : 's × s') : (isP ? 'Multiply by 4.' : 'Multiply by itself.'), math: isP ? `${displayNumber(side)} × 4 = ${displayNumber(result)}${ru}` : `${displayNumber(side)}² = ${displayNumber(result)}${ru}` })
  return { question, topic: si ? 'ජ්යාමිතිය · චතුරස්ර' : 'Geometry · Squares', formula, steps, answer: `${displayNumber(result)}${ru}`, verification: `${formula}: ${displayNumber(result)}${ru}`, verified: Number.isFinite(result), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Calculation verified' }
}

function solveVolume(question, language, mode) {
  const si = language === 'si'
  const unit = question.match(/\b(mm|cm|m|km)\b/i)?.[1] ?? '', vu = unit ? ` ${unit}³` : ''
  if (/cylinder|සිලින්ඩරය/iu.test(question)) {
    const rM = question.match(/(?:radius|අරය)\s*(?:is\s*)?(-?\d+(?:\.\d+)?)/iu)
    const hM = question.match(/(?:height|උස)\s*(?:is\s*)?(-?\d+(?:\.\d+)?)/iu)
    if (!rM || !hM) throw new Error(si ? 'අරය සහ උස සඳහන් කරන්න.' : 'Include radius and height.')
    const r = Number(rM[1]), h = Number(hM[1]), vol = Math.PI * r * r * h
    return { question, topic: si ? 'ජ්යාමිතිය · සිලින්ඩර' : 'Geometry · Cylinders', formula: 'V = πr²h', steps: [{ title: si ? 'අරය සහ උස' : 'Radius and height', explanation: 'V = πr²h', math: `r = ${r}, h = ${h}` }, { title: si ? 'පරිමාව' : 'Volume', explanation: 'V = πr²h', math: `V = π × ${r}² × ${h} = ${displayNumber(vol)}${vu}` }], answer: `${displayNumber(vol)}${vu}`, verification: `π × ${r}² × ${h} = ${displayNumber(vol)}${vu}`, verified: Number.isFinite(vol), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Verified' }
  }
  if (/\bcube\b|ඝනකය/iu.test(question)) {
    const sM = question.match(/(?:side|edge|පැත්ත)\s*(?:is\s*)?(-?\d+(?:\.\d+)?)/iu)
    if (!sM) throw new Error(si ? 'පැත්ත සඳහන් කරන්න.' : 'Include the cube side.')
    const s = Number(sM[1]), vol = s ** 3
    return { question, topic: si ? 'ජ්යාමිතිය · ඝනකය' : 'Geometry · Cubes', formula: 'V = s³', steps: [{ title: si ? 'පැත්ත' : 'Side', explanation: 'V = s³', math: `s = ${s}` }, { title: si ? 'පරිමාව' : 'Volume', explanation: 'V = s³', math: `V = ${s}³ = ${displayNumber(vol)}${vu}` }], answer: `${displayNumber(vol)}${vu}`, verification: `${s}³ = ${displayNumber(vol)}${vu}`, verified: Number.isFinite(vol), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Verified' }
  }
  const lM = question.match(/(?:length|දිග)\s*(?:is\s*)?(-?\d+(?:\.\d+)?)/iu)
  const wM = question.match(/(?:width|breadth|පළල)\s*(?:is\s*)?(-?\d+(?:\.\d+)?)/iu)
  const hM = question.match(/(?:height|උස)\s*(?:is\s*)?(-?\d+(?:\.\d+)?)/iu)
  if (!lM || !wM || !hM) throw new Error(si ? 'දිග, පළල සහ උස සඳහන් කරන්න.' : 'Include length, width, and height.')
  const l = Number(lM[1]), w = Number(wM[1]), h = Number(hM[1]), vol = l * w * h
  return { question, topic: si ? 'ජ්යාමිතිය · ඝනකාකාරය' : 'Geometry · Cuboids', formula: 'V = l × w × h', steps: [{ title: si ? 'මිනුම්' : 'Dimensions', explanation: 'V = l × w × h', math: `l = ${l}, w = ${w}, h = ${h}` }, { title: si ? 'පරිමාව' : 'Volume', explanation: si ? 'l × w × h' : 'Multiply all three.', math: `V = ${l} × ${w} × ${h} = ${displayNumber(vol)}${vu}` }], answer: `${displayNumber(vol)}${vu}`, verification: `${l} × ${w} × ${h} = ${displayNumber(vol)}${vu}`, verified: Number.isFinite(vol), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Verified' }
}

function solveTrianglePerimeter(question, language) {
  const si = language === 'si'
  const unit = question.match(/\b(mm|cm|m|km)\b/i)?.[1] ?? '', ru = unit ? ` ${unit}` : ''
  const nums = extractNumbers(question)
  if (nums.length < 3) throw new Error(si ? 'පාද තුනේ දිග සඳහන් කරන්න.' : 'Provide all three side lengths.')
  const [a, b, c] = nums.slice(0, 3), p = a + b + c
  return { question, topic: si ? 'ජ්යාමිතිය · ත්රිකෝණ' : 'Geometry · Triangles', formula: 'P = a + b + c', steps: [{ title: si ? 'පාද' : 'Sides', explanation: si ? 'පාද තුන සටහන් කරන්න.' : 'Note all three sides.', math: `a = ${a}${ru}, b = ${b}${ru}, c = ${c}${ru}` }, { title: si ? 'පරිමිතිය' : 'Perimeter', explanation: si ? 'පාද තුන එකතු කරන්න.' : 'Add all three sides.', math: `P = ${a} + ${b} + ${c} = ${displayNumber(p)}${ru}` }], answer: `${displayNumber(p)}${ru}`, verification: `${a} + ${b} + ${c} = ${displayNumber(p)}${ru}`, verified: Number.isFinite(p), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Verified' }
}

function solveRatio(question, language, mode) {
  const si = language === 'si'
  const rM = question.match(/(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)(?:\s*:\s*(\d+(?:\.\d+)?))?/)
  if (!rM) throw new Error(si ? 'අනුපාතය සඳහන් කරන්න. උදා: 12:8' : 'Enter a ratio, e.g. 12:8')
  const parts = [Number(rM[1]), Number(rM[2])]; if (rM[3]) parts.push(Number(rM[3]))
  const gcdVal = parts.reduce((acc, n) => math.gcd(acc, n))
  const simplified = parts.map((p) => displayNumber(p / gcdVal)).join(' : ')
  const divM = question.match(/(\d+(?:\.\d+)?)\s*(?:in\s*(?:the\s*)?ratio|අනුපාතයෙන්)/iu)
  if (divM) {
    const total = Number(divM[1]), sum = parts.reduce((a, b) => a + b, 0)
    const shares = parts.map((p) => displayNumber(total * p / sum)).join(', ')
    return { question, topic: si ? 'අනුපාත · බෙදීම' : 'Ratio · Division', formula: 'Share = (part / sum) × total', steps: [{ title: si ? 'අනුපාතය' : 'Ratio', explanation: si ? 'මුළු ප්රමාණය සහ අනුපාතය.' : 'Total and ratio.', math: `Total = ${total}, Ratio = ${parts.join(' : ')}, Sum = ${sum}` }, { title: si ? 'කොටස්' : 'Shares', explanation: si ? 'කොටස් ගණනය කරන්න.' : 'Calculate each share.', math: shares }], answer: shares, verification: `Sum of parts = ${sum}`, verified: true, verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Verified' }
  }
  return { question, topic: si ? 'අනුපාත' : 'Ratios', formula: 'Simplified = each part ÷ GCD', steps: [{ title: si ? 'GCD සොයන්න' : 'Find the GCD', explanation: si ? 'පොදු සාධකය සොයන්න.' : 'Find the greatest common divisor.', math: `GCD(${parts.join(', ')}) = ${gcdVal}` }, { title: si ? 'සරල කරන්න' : 'Simplify', explanation: si ? 'GCD වලින් බෙදන්න.' : 'Divide each part by the GCD.', math: `${parts.join(' : ')} ÷ ${gcdVal} = ${simplified}` }], answer: simplified, verification: `GCD = ${gcdVal}`, verified: true, verificationLabel: si ? 'සරල කළා' : 'Simplified' }
}

function solveAverage(question, language, mode) {
  const si = language === 'si'
  const numbers = extractNumbers(question)
  if (numbers.length < 2) throw new Error(si ? 'සංඛ්යා දෙකක් හෝ වැඩි ගණනක් ඇතුළත් කරන්න.' : 'Enter at least two numbers.')
  const sum = numbers.reduce((a, b) => a + b, 0), avg = sum / numbers.length
  const sorted = [...numbers].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  const steps = []
  if (mode !== 'simple') steps.push({ title: si ? 'සංඛ්යා' : 'Numbers', explanation: si ? 'දී ඇති සංඛ්යා.' : 'The given numbers.', math: numbers.join(', ') })
  steps.push({ title: si ? 'එකතුව' : 'Sum', explanation: si ? 'සියලු සංඛ්යා එකතු කරන්න.' : 'Add all numbers.', math: `${numbers.join(' + ')} = ${displayNumber(sum)}` })
  steps.push({ title: si ? 'සාමාන්යය' : 'Mean', explanation: si ? 'එකතුව ÷ ගණන' : 'Sum ÷ count', math: `${displayNumber(sum)} ÷ ${numbers.length} = ${displayNumber(avg)}` })
  if (mode === 'detailed') steps.push({ title: si ? 'මධ්යස්ථය' : 'Median', explanation: si ? 'අනුපිළිවෙළ කර මැද අගය.' : 'Sort and find the middle value.', math: `Sorted: ${sorted.join(', ')} → Median = ${displayNumber(median)}` })
  return { question, topic: si ? 'සංඛ්යාන · සාමාන්යය' : 'Statistics · Average', formula: 'Mean = sum ÷ count', steps, answer: `Mean = ${displayNumber(avg)}${mode === 'detailed' ? `,  Median = ${displayNumber(median)}` : ''}`, verification: `${displayNumber(sum)} ÷ ${numbers.length} = ${displayNumber(avg)}`, verified: Number.isFinite(avg), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Calculation verified' }
}

function sqrtOrPower(question, language, mode) {
  const si = language === 'si'
  const sqrtM = question.match(/(?:sqrt|square\s*root\s*of|√|වර්ගමූලය)\s*(?:of\s*)?(\d+(?:\.\d+)?)/iu)
  if (sqrtM) {
    const n = Number(sqrtM[1]), result = Math.sqrt(n), isPerfect = Number.isInteger(result)
    const steps = [{ title: si ? 'වර්ගමූලය' : 'Square root', explanation: si ? `√${n} ගණනය කරන්න.` : `Find √${n}.`, math: `√${n} = ${displayNumber(result)}` }]
    if (mode === 'detailed' && isPerfect) steps.unshift({ title: si ? 'පරිපූර්ණ වර්ගය' : 'Perfect square', explanation: `${result} × ${result} = ${n}`, math: `${result}² = ${n}` })
    return { question, topic: si ? 'සංඛ්යා · වර්ගමූල' : 'Numbers · Square roots', formula: '√n', steps, answer: displayNumber(result), verification: `${displayNumber(result)}² = ${displayNumber(result * result)}`, verified: Number.isFinite(result), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Verified' }
  }
  const powM = question.match(/(\d+(?:\.\d+)?)\s*(?:\^|to\s*the\s*power\s*of|වර්ගය|ඝනය)\s*(\d+(?:\.\d+)?)/iu)
  if (powM) {
    const base = Number(powM[1]), exp = Number(powM[2]), result = Math.pow(base, exp)
    const steps = [{ title: si ? 'ඝාතය' : 'Power', explanation: si ? `${base}^${exp}` : `${base} to the power of ${exp}`, math: `${base}^${exp} = ${displayNumber(result)}` }]
    if (mode === 'detailed') steps.unshift({ title: si ? 'ඝාතය තේරුම' : 'What is a power?', explanation: si ? `${base} × ${base} × ... (${exp} වාරයක්)` : `Multiply ${base} by itself ${exp} times.`, math: Array(Math.min(Number(exp), 5)).fill(base).join(' × ') + (exp > 5 ? ' × ...' : '') + ` = ${displayNumber(result)}` })
    return { question, topic: si ? 'සංඛ්යා · ඝාත' : 'Numbers · Powers', formula: 'aⁿ', steps, answer: displayNumber(result), verification: `${base}^${exp} = ${displayNumber(result)}`, verified: Number.isFinite(result), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Verified' }
  }
  throw new Error(si ? 'වර්ගමූලය හෝ ඝාතය සඳහන් කරන්න. උදා: √25 හෝ 2^8' : 'Specify a square root or power, e.g. √25 or 2^8')
}

function solveLcmGcd(question, language) {
  const si = language === 'si'
  const numbers = extractNumbers(question).filter((n) => Number.isInteger(n) && n > 0)
  if (numbers.length < 2) throw new Error(si ? 'ධන පූර්ණ සංඛ්යා දෙකක් ඇතුළත් කරන්න.' : 'Enter at least two positive integers.')
  const isLcm = /lcm|least\s*common\s*multiple/iu.test(question)
  const result = isLcm ? numbers.reduce((a, b) => math.lcm(a, b)) : numbers.reduce((a, b) => math.gcd(a, b))
  const label = isLcm ? (si ? 'සා.ගු.ගු (LCM)' : 'LCM') : (si ? 'මහ.පො.සා (GCD)' : 'GCD')
  return { question, topic: si ? `සංඛ්යා · ${label}` : `Numbers · ${label}`, formula: isLcm ? 'LCM(a,b) = a×b / GCD(a,b)' : 'GCD — Euclidean algorithm', steps: [{ title: si ? 'සංඛ්යා' : 'Numbers', explanation: si ? 'දී ඇති සංඛ්යා.' : 'The given numbers.', math: numbers.join(', ') }, { title: label, explanation: si ? `${label} ගණනය කරන්න.` : `Calculate the ${label}.`, math: `${label}(${numbers.join(', ')}) = ${result}` }], answer: String(result), verification: `${label}(${numbers.join(', ')}) = ${result}`, verified: true, verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Verified' }
}

function wordResult(question, a, b, result, op, si, mode, mathLine) {
  const opName = op === '+' ? (si ? 'එකතු කිරීම' : 'Addition') : op === '-' ? (si ? 'අඩු කිරීම' : 'Subtraction') : op === '*' ? (si ? 'ගුණ කිරීම' : 'Multiplication') : (si ? 'බෙදීම' : 'Division')
  const steps = []
  if (mode === 'detailed') steps.push({ title: si ? 'ගැටලුව කියවන්න' : 'Read the problem', explanation: si ? 'දී ඇති සංඛ්යා සහ ක්රියාව හඳුනාගන්න.' : 'Identify the numbers and operation.', math: `a = ${a},  b = ${b}` })
  steps.push({ title: si ? `${opName} යොදන්න` : `Apply ${opName}`, explanation: si ? `${opName} ක්රියාව භාවිතා කරන්න.` : `Use ${opName.toLowerCase()}.`, math: mathLine })
  return { question, topic: si ? `වචන ගැටලු · ${opName}` : `Word problems · ${opName}`, formula: op === '+' ? 'Total = a + b' : op === '-' ? 'Remainder = a − b' : op === '*' ? 'Total = a × b' : 'Share = total ÷ parts', steps, answer: displayNumber(result), verification: mathLine, verified: Number.isFinite(result), verificationLabel: si ? 'ගණනය තහවුරුයි' : 'Calculation verified' }
}

function solveWordProblem(question, language, mode) {
  const q = question, si = language === 'si'
  const siSub = q.match(/(\d+(?:\.\d+)?)\s*[කක්]*\s*(?:ඇත|තිබේ|සතු)[^.]*?(\d+(?:\.\d+)?)\s*[කක්]*\s*(?:දුන්|ගත්|ඉවත්|අඩු)[^.]*?(?:ඉතිරිය|ඉතිරි\s*(?:කීයද|සොයන්න))/u)
  if (siSub) { const [, t, g] = siSub; const r = Number(t) - Number(g); return wordResult(q, Number(t), Number(g), r, '-', si, mode, `${t} - ${g} = ${r}`) }
  const siAdd = q.match(/(\d+(?:\.\d+)?)\s*[කක්]*\s*(?:ඇත|තිබේ|සතු)[^.]*?(\d+(?:\.\d+)?)\s*[කක්]*\s*(?:ලැබුණ|ලැබී|එකතු|ගෙනාව)[^.]*?(?:දැන්|එකතුව|කීයද)/u)
  if (siAdd) { const [, s, a] = siAdd; const r = Number(s) + Number(a); return wordResult(q, Number(s), Number(a), r, '+', si, mode, `${s} + ${a} = ${r}`) }
  const enSub = q.match(/(\d+(?:\.\d+)?)[^.]*?(?:gave|spent|lost|used|sold|removed|taken)[^.]*?(\d+(?:\.\d+)?)[^.]*?(?:left|remain|how many|how much)/i)
  if (enSub) { const [, t, g] = enSub; const r = Number(t) - Number(g); return wordResult(q, Number(t), Number(g), r, '-', si, mode, `${t} - ${g} = ${r}`) }
  const enAdd = q.match(/(\d+(?:\.\d+)?)[^.]*?(?:received|bought|got|found|added|collected|earned)[^.]*?(\d+(?:\.\d+)?)[^.]*?(?:total|now|how many|how much|altogether)/i)
  if (enAdd) { const [, s, a] = enAdd; const r = Number(s) + Number(a); return wordResult(q, Number(s), Number(a), r, '+', si, mode, `${s} + ${a} = ${r}`) }
  const enDiv = q.match(/(\d+(?:\.\d+)?)[^.]*?(?:shared|divided|split|distributed)[^.]*?(?:among|between|into|by)\s*(\d+)/i)
  if (enDiv) { const [, t, p] = enDiv; if (Number(p) === 0) throw new Error('Cannot divide by zero.'); const r = Number(t) / Number(p); return wordResult(q, Number(t), Number(p), r, '/', si, mode, `${t} ÷ ${p} = ${displayNumber(r)}`) }
  const enMul = q.match(/(\d+(?:\.\d+)?)\s*(?:items?|groups?|boxes?|bags?|packs?|people|students?|rows?)[^.]*?(?:each|every|per)\s*(?:costs?|has|have|contain)?\s*(\d+(?:\.\d+)?)/i)
  if (enMul) { const [, cnt, each] = enMul; const r = Number(cnt) * Number(each); return wordResult(q, Number(cnt), Number(each), r, '*', si, mode, `${cnt} × ${each} = ${r}`) }
  const siDiv = q.match(/(\d+(?:\.\d+)?)[^.]*?(\d+(?:\.\d+)?)\s*(?:දෙනෙකු|කොටස්|කණ්ඩායම්)\s*(?:අතර|ලෙස)\s*(?:බෙදන්න|බෙදා)/u)
  if (siDiv) { const [, t, p] = siDiv; if (Number(p) === 0) throw new Error('ශූන්යයෙන් බෙදිය නොහැක.'); const r = Number(t) / Number(p); return wordResult(q, Number(t), Number(p), r, '/', si, mode, `${t} ÷ ${p} = ${displayNumber(r)}`) }
  throw new Error(si ? 'මෙම වචන ගැටලුව හඳුනා ගත නොහැකි විය. සංඛ්යා සහ ක්රියාව පැහැදිලිව සඳහන් කරන්න.' : 'Could not parse this word problem. Make sure numbers and the action (gave, received, shared) are clearly stated.')
}

function solveDerivative(question, language) {
  const si = language === 'si'
  const expression = question.replace(/^\s*(differentiate|derivative\s+of|d\/dx\s*|අවකලනය\s*(?:කරන්න|සොයන්න)?\s*)/i, '').replace(/\s*(?:හි\s*)?අවකලනය\s*(?:කරන්න|සොයන්න)?\s*[.!?]*$/u, '').replaceAll('²', '^2').replaceAll('−', '-').trim()
  if (!expression) throw new Error('Enter an expression to differentiate, such as "Differentiate x^2 + 3x + 2".')
  const tree = safeParse(expression)
  const result = math.derivative(tree, 'x').toString()
  const checked = [1, 2].every((x) => { const d = 1e-5, num = (math.evaluate(expression, { x: x + d }) - math.evaluate(expression, { x: x - d })) / (2 * d), sym = math.evaluate(result, { x }); return Number.isFinite(num) && Number.isFinite(sym) && Math.abs(num - sym) < 1e-4 })
  return { question, topic: si ? 'කලනය · අවකලනය' : 'Calculus · Differentiation', formula: 'd/dx (xⁿ) = n·xⁿ⁻¹', steps: [{ title: si ? 'අවකලනය කරන්න' : 'Differentiate each term', explanation: si ? 'බල නියමය යොදන්න.' : 'Apply the power rule to each term.', math: `d/dx (${expression})` }], answer: `f′(x) = ${result}`, verification: si ? (checked ? 'x = 1, 2 හි සංඛ්යාත්මක පරීක්ෂාව සාර්ථකයි' : 'නැවත පරීක්ෂා කරන්න') : (checked ? 'Numerical check passed at x = 1 and x = 2' : 'Check needed'), verified: checked, verificationLabel: si ? (checked ? 'සංඛ්යාත්මකව පරීක්ෂා කළා' : 'නැවත පරීක්ෂා කරන්න') : (checked ? 'Numerical check passed' : 'Check needed') }
}

function normalizeArithmetic(question) {
  const np = '(-?(?:\\d+\\s*\\/\\s*\\d+|\\d+(?:\\.\\d+)?))'
  const siAdd = question.match(new RegExp(`^\\s*${np}\\s*(?:සහ|හා)\\s*${np}\\s*(?:එකතුව|එකතු\\s*(?:කරන්න|කළ\\s*විට)?)(?:\\s*(?:කීයද|සොයන්න))?[?.!]*\\s*$`, 'u'))
  if (siAdd) return `${siAdd[1]} + ${siAdd[2]}`
  const siSub = question.match(new RegExp(`^\\s*${np}\\s*න්\\s*${np}\\s*ක්?\\s*අඩු\\s*කරන්න(?:\\s*(?:කීයද|සොයන්න))?[?.!]*\\s*$`, 'u'))
  if (siSub) return `${siSub[1]} - ${siSub[2]}`
  const siMul = question.match(new RegExp(`^\\s*${np}\\s*(?:සහ|හා|,)?\\s*${np}\\s*ගුණ(?:නය)?\\s*කරන්න[?.!]*\\s*$`, 'u'))
  if (siMul) return `${siMul[1]} * ${siMul[2]}`
  const siDiv = question.match(new RegExp(`^\\s*${np}\\s+${np}\\s*න්\\s*බෙදන්න[?.!]*\\s*$`, 'u'))
  if (siDiv) return `${siDiv[1]} / ${siDiv[2]}`
  return question
    .replace(/^\s*(?:please\s*)?(?:calculate|compute|evaluate|what\s+is|ගණනය\s*(?:කරන්න|කර)?|පිළිතුර\s*සොයන්න)\s*:?\s*/iu, '')
    .replace(/\s*(?:please\s*)?(?:calculate|evaluate|කීයද|ගණනය\s*කරන්න|පිළිතුර\s*සොයන්න)[?.!]*\s*$/iu, '')
    .replace(/\b(?:the\s+)?sum\s+of\s+/gi, '').replace(/\bplus\b/gi, '+').replace(/\bminus\b/gi, '-')
    .replace(/\b(?:times|multiplied\s+by)\b/gi, '*').replace(/\b(?:divided\s+by|over)\b/gi, '/')
    .replace(/\b(?:add|subtract|multiply|divide|sum|difference|product|quotient)\b/gi, '')
    .replaceAll('×', '*').replaceAll('÷', '/').trim()
}

function solveArithmetic(question, language, mode, topicId) {
  const si = language === 'si'
  const expression = normalizeArithmetic(question).replaceAll('²', '^2').replaceAll('−', '-')
  const node = safeParse(expression)
  if (node.filter((child) => child.isSymbolNode && !allowedConstants.has(child.name)).length) throw new Error('For arithmetic, enter numbers and operators, such as "(12 + 8) / 4".')
  const numericAnswer = math.evaluate(node.toString())
  const exactFraction = /\d\s*\/\s*\d/.test(question) ? fractionMath.evaluate(node.toString()).toFraction() : ''
  const answer = exactFraction.includes('/') ? `${exactFraction} (${displayNumber(Number(numericAnswer))})` : displayNumber(numericAnswer)
  if (typeof numericAnswer !== 'number' || !Number.isFinite(numericAnswer)) throw new Error('This expression does not produce a finite number.')
  const steps = []
  if (mode === 'detailed' && !exactFraction) steps.push({ title: si ? 'ගණිත ක්රියාව' : 'Set up', explanation: si ? 'ලකුණුවල අනුපිළිවෙළ.' : 'Write using standard notation.', math: expression })
  if (exactFraction) steps.push({ title: si ? 'භාගය සරල කරන්න' : 'Simplify the fraction', explanation: si ? 'පොදු සාධකයෙන් බෙදන්න.' : 'Reduce by the common factor.', math: `${expression} = ${exactFraction}` })
  if (steps.length === 0 || !exactFraction) steps.push({ title: si ? 'ගණනය කරන්න' : 'Evaluate', explanation: si ? 'BODMAS අනුව ගණනය කරන්න.' : 'Follow the order of operations.', math: `${expression} = ${displayNumber(numericAnswer)}` })
  return { question, topic: topicId === 'fractions' || /\d\s*\/\s*\d/.test(expression) ? (si ? 'භාග' : 'Fractions') : topicId === 'decimals' || /\d\.\d/.test(expression) ? (si ? 'දශම' : 'Decimals') : (si ? 'මූලික ගණිතය' : 'Basic math · Arithmetic'), formula: exactFraction ? (si ? 'භාග ගණිතය' : 'Fraction arithmetic') : (si ? 'BODMAS' : 'Order of operations (BODMAS)'), steps, answer, verification: si ? `ගණනය: ${displayNumber(numericAnswer)}` : `Calculated: ${displayNumber(numericAnswer)}`, verified: true, verificationLabel: si ? 'ගණනය කළා' : 'Calculated' }
}

// ── OpenAI fallback ───────────────────────────────────────────────────────────

async function solveWithAI(question, language, mode) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('No OpenAI API key configured.')
  const si = language === 'si'
  const modeDesc = mode === 'simple' ? 'simple, beginner-friendly' : mode === 'detailed' ? 'detailed with full reasoning' : 'standard'
  const langDesc = si ? 'Sinhala (සිංහල) — all titles and explanations must be in Sinhala' : 'English'

  const systemPrompt = `You are a mathematics tutor. Solve the given problem step by step.
Respond ONLY with a valid JSON object — no markdown, no code fences, no extra text.
Required JSON fields:
{
  "topic": "subject area string",
  "formula": "key formula string",
  "steps": [{"title": "string", "explanation": "string", "math": "string"}],
  "answer": "final answer string",
  "verification": "how to check string",
  "verified": true,
  "verificationLabel": "string"
}
Rules: explanation level = ${modeDesc}. Language = ${langDesc}. Math stays in standard notation. steps array must have 1–8 items.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `OpenAI error ${res.status}`)
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error('Empty response from AI.')
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  let parsed
  try { parsed = JSON.parse(cleaned) } catch { throw new Error(si ? 'AI ප්රතිචාරය කියවිය නොහැකි විය. ප්රශ්නය නැවත ලියන්න.' : 'AI returned an unreadable response. Try rephrasing the question.') }

  return {
    question,
    topic: parsed.topic || (si ? 'AI විසඳුම' : 'AI solution'),
    formula: parsed.formula || '',
    steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 8) : [],
    answer: parsed.answer || '',
    verification: parsed.verification || '',
    verified: parsed.verified !== false,
    verificationLabel: parsed.verificationLabel || (si ? 'AI විසින් විසඳන ලදී' : 'Solved by AI'),
    solvedByAI: true,
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

app.post('/api/solve', async (request, response) => {
  const { question = '', topic = 'auto', language = 'en', mode = 'standard' } = request.body ?? {}
  const normalized = question.trim()
  if (!normalized) return response.status(400).json({ error: 'Enter a mathematics question to get started.' })
  if (normalized.length > 1000) return response.status(400).json({ error: 'Keep your question under 1,000 characters.' })

  // Try local deterministic solver first
  let solution = null
  let localError = null
  try {
    const si = language === 'si'
    const isDerivative = topic === 'differentiation' || /^(differentiate|derivative\s+of|d\/dx|අවකලනය)/iu.test(normalized) || /අවකලනය/u.test(normalized)
    const isQuadratic = topic === 'quadratic' || (/x\s*[\^²]\s*2|x\^2/i.test(normalized) && normalized.includes('='))
    const isCircle = topic === 'circles' || /circle|radius|circumference|වෘත්ත|අරය|වටපරිධිය/u.test(normalized)
    const hasRectDims = /(?:length|දිග)\s*-?\d/i.test(normalized) && /(?:width|breadth|පළල)\s*-?\d/i.test(normalized)
    const isRectangle = topic === 'rectangles' || /rectangle|සෘජුකෝණාස්ර/i.test(normalized) || (hasRectDims && /area|වර්ගඵල|perimeter|පරිමිතිය/i.test(normalized))
    const isTriangle = topic === 'triangles' || /triangle|ත්රිකෝණ/i.test(normalized)
    const isSquare = topic === 'squares' || /\bsquare\b|චතුරස්ර/i.test(normalized)
    const isPercentage = topic === 'percentages' || /%|percent|per\s*cent|ප්රතිශත|සියයට/u.test(normalized)
    const isVolume = topic === 'volume' || /volume|පරිමාව|cylinder|cube|cuboid|සිලින්ඩරය|ඝනකය/iu.test(normalized)
    const isRatio = topic === 'ratio' || /ratio|proportion|අනුපාත/iu.test(normalized) || /\d+\s*:\s*\d+/.test(normalized)
    const isAverage = topic === 'average' || /average|mean|median|සාමාන්යය|මධ්යස්ථය/iu.test(normalized)
    const isSqrtPower = /sqrt|square\s*root|√|වර්ගමූලය|\bto\s*the\s*power\b/iu.test(normalized) || (/\^/.test(normalized) && !normalized.includes('=') && !isDerivative)
    const isLcmGcd = /\blcm\b|\bgcd\b|least\s*common\s*multiple|greatest\s*common/iu.test(normalized)
    const isTrianglePerimeter = isTriangle && /perimeter|පරිමිතිය/iu.test(normalized) && !(/base|height|පාදය|උස/iu.test(normalized))
    const isWordProblem = topic === 'word' || /(?:gave|spent|lost|received|bought|shared|divided|split)[^=]*(?:left|remain|how many|total|now|altogether)/i.test(normalized) || /(?:ඇත|සතු|තිබේ)[^=]*(?:දුන්|ලැබුණ|බෙදන්න|ඉතිරිය)/u.test(normalized)

    if (isDerivative) solution = solveDerivative(normalized, language)
    else if (isQuadratic) solution = solveQuadratic(normalized, language, mode)
    else if (normalized.includes('=')) solution = solveEquation(normalized, language, mode)
    else if (isPercentage) solution = solvePercentage(normalized, language, mode)
    else if (isVolume) solution = solveVolume(normalized, language, mode)
    else if (isTrianglePerimeter) solution = solveTrianglePerimeter(normalized, language)
    else if (isRectangle) solution = solveRectangle(normalized, language, mode)
    else if (isCircle) solution = solveCircle(normalized, language)
    else if (isTriangle) solution = solveTriangle(normalized, language, mode)
    else if (isSquare) solution = solveSquare(normalized, language, mode)
    else if (isRatio) solution = solveRatio(normalized, language, mode)
    else if (isAverage) solution = solveAverage(normalized, language, mode)
    else if (isLcmGcd) solution = solveLcmGcd(normalized, language)
    else if (isSqrtPower) solution = sqrtOrPower(normalized, language, mode)
    else if (isWordProblem) solution = solveWordProblem(normalized, language, mode)
    else solution = solveArithmetic(normalized, language, mode, topic)
  } catch (err) {
    localError = err
  }

  // If local solver succeeded, return it
  if (solution) return response.json(solution)

  // Local solver failed — try AI if key is configured
  if (!process.env.OPENAI_API_KEY) {
    return response.status(400).json({ error: localError?.message || 'We could not solve that problem yet.', aiAvailable: false })
  }

  try {
    const aiSolution = await solveWithAI(normalized, language, mode)
    return response.json(aiSolution)
  } catch (aiErr) {
    return response.status(400).json({ error: aiErr.message || 'The AI solver could not solve this problem.' })
  }
})

app.get('/api/health', (_request, response) => response.json({ status: 'ok', ai: Boolean(process.env.OPENAI_API_KEY) }))
app.use('/api', (_request, response) => response.status(404).json({ error: 'API endpoint not found.' }))
app.use(express.static(clientDirectory))
app.get(/.*/, (_request, response) => response.sendFile(path.join(clientDirectory, 'index.html')))

app.listen(port, () => console.log(`MathSolve API listening on http://localhost:${port}`))
