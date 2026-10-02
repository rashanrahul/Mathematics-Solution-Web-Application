# MathSolve

MathSolve is a bilingual mathematics learning app focused on showing a solution, its formula, and a check rather than only returning an answer.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:5173. The Vite development server proxies `/api` requests to the Express API on port 3001.

For a production-style local run, use `npm start`; this builds the frontend and serves the app and API together on port 3001.

## OpenAI setup

Copy `.env.example` to `.env`, add your OpenAI API key to `OPENAI_API_KEY`, and restart the server. The key stays on the backend and is never sent to the browser. Set `OPENAI_MODEL` to override the default `gpt-5-mini` model.

The local Math.js solver remains authoritative for supported questions; OpenAI can improve their explanations. For questions outside the deterministic solver's coverage, OpenAI can return a solution marked as not independently verified. If no key is configured or OpenAI quota is exhausted, the API falls back to local arithmetic, linear equations, percentages, circle area, and rectangle area; unsupported questions still require an available OpenAI quota.

## Current MVP

- Text input, topic selection, and Simple, Standard, and Detailed explanation modes.
- Long-form prompts with embedded equations, plus screenshot upload with editable OCR text extraction.
- English and Sinhala interface and step explanations.
- Step-by-step solutions for linear equations, arithmetic, exact fractions, percentages, decimals, and rectangle, circle, triangle, and square area/perimeter questions.
- English and Sinhala arithmetic and geometry wording for the supported question patterns.
- Substitution checks for equations, formula checks for geometry and percentages, and numerical spot checks for derivatives.
- Optional OpenAI explanations and fallback solving for unsupported formats when an API key is configured.
- Responsive desktop and mobile layout, examples, and session-only recent questions.

The solver intentionally rejects unsupported expressions rather than presenting an unverified result. Screenshot OCR is available for English text and math notation. It does not yet solve every arbitrary word problem or advanced topic such as systems of equations, general quadratic equations, trigonometry, integration, or statistics. Accounts, persistent history, quizzes, graphs, and admin tools remain future-phase work described in `requirement.txt`.