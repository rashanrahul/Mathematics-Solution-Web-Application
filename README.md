# MathSolve

MathSolve is a bilingual mathematics learning app focused on showing a solution, its formula, and a check rather than only returning an answer.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:5173. The Vite development server proxies `/api` requests to the Express API on port 3001.

For a production-style local run, use `npm start`; this builds the frontend and serves the app and API together on port 3001.

## Current MVP

- Text input, topic selection, and Simple, Standard, and Detailed explanation modes.
- English and Sinhala interface and step explanations.
- Step-by-step solutions for one-variable linear equations, arithmetic expressions, circle area, and polynomial differentiation.
- Substitution checks for equations, formula checks for circle area, and numerical spot checks for derivatives.
- Responsive desktop and mobile layout, examples, and session-only recent questions.

The solver intentionally rejects unsupported expressions rather than presenting an unverified result. This MVP does not yet include image OCR, an equation editor, accounts, persistent history, quizzes, graphs, or admin tools; those belong in the later phases described in `requirement.txt`.