# MathSolve

MathSolve is a bilingual mathematics learning app focused on showing a solution, its formula, and a check rather than only returning an answer.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:5173. The Vite development server proxies `/api` requests to the Express API on port 3001.

For a production-style local run, use `npm start`; this builds the frontend and serves the app and API together on port 3001.

## Gemini setup

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey), copy `.env.example` to `.env`, set `GEMINI_API_KEY`, and restart the server. The key stays on the backend and is never sent to the browser. Set `GEMINI_MODEL` to override `gemini-3.8-flash`. Google states that free-tier content may be used to improve its products, so avoid entering personal or sensitive information.

The local Math.js solver remains authoritative for supported questions; Gemini can improve their explanations. For questions outside the deterministic solver's coverage, Gemini can return a solution marked as not independently verified. If no key is configured or Gemini quota is exhausted, the API falls back to local arithmetic, linear equations, percentages, circle area, and rectangle area; unsupported questions still require available Gemini quota. The Google AI Studio free tier has limited model access and rate limits that may change; check its pricing and limits before production use.

## Current MVP

- Text input, topic selection, and Simple, Standard, and Detailed explanation modes.
- Long-form prompts with embedded equations, plus screenshot upload with editable OCR text extraction.
- English and Sinhala interface and step explanations.
- Step-by-step solutions for linear equations, arithmetic, exact fractions, percentages, decimals, and rectangle, circle, triangle, and square area/perimeter questions.
- English and Sinhala arithmetic and geometry wording for the supported question patterns.
- Substitution checks for equations, formula checks for geometry and percentages, and numerical spot checks for derivatives.
- Optional Gemini explanations and fallback solving for unsupported formats when a Gemini API key is configured.
- Responsive desktop and mobile layout, examples, and session-only recent questions.

The solver intentionally rejects unsupported expressions rather than presenting an unverified result. Screenshot OCR is available for English text and math notation. It does not yet solve every arbitrary word problem or advanced topic such as systems of equations, general quadratic equations, trigonometry, integration, or statistics. Accounts, persistent history, quizzes, graphs, and admin tools remain future-phase work described in `requirement.txt`.