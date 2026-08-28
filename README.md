# Veloo

**Languages:** English | [한국어](README_KO.md)

**Live demo:** <https://veloo.page/> — private beta; sign-up requests are
approved manually, so access isn't instant. It's a personal deployment run on
the maintainer's own API keys and Supabase project — not a shared lab tool.

Doing research usually means bouncing between a PDF reader, a translator, a
notes app, a to-do list, and a calendar — each one forgetting what you were
doing in the last one. Veloo puts the parts that actually matter for reading
and producing research into one workspace, under one login, sharing one
history: read a paper, translate the parts that don't parse, look up a term
you keep half-understanding, quiz yourself on an architecture diagram, and
turn what you learned into a scheduled task — without leaving the tab.

## What's inside

- **Paper Analyzer** — Upload a PDF or search by title/URL. Semantic Scholar
  fills in metadata and author info, Claude summarizes the problem, method,
  and conclusion, and a bundled SJR dataset scores the venue's journal
  quality — so you can tell a strong result from a weak venue before you
  invest an hour reading it.
- **Translator** — Streaming English → Korean translation tuned for
  ML/DL/CV/NLP writing: it knows to leave formulas and proper nouns alone and
  keep field-specific terms in English where a literal translation would
  just be confusing.
- **Contextor** — Paste an English word or short phrase and get back how it's
  actually used across different ML/DL contexts, structured instead of a
  single flattened definition — for the terms that mean five different
  things depending on which paper you're in.
- **Model Review** — Upload an architecture diagram, get an AI-generated
  reference explanation of how the pieces connect, then write your own
  explanation and have it graded and corrected. A self-quiz loop for
  actually understanding a diagram instead of skimming past it.
- **Plan (Todo + Calendar)** — Research tasks with sub-steps, priorities, and
  AI-suggested breakdowns and strategy, plus a drag-and-drop weekly
  time-blocking calendar and review — so what you just read or learned turns
  into something scheduled, not just another open tab.

## One workspace, not six tabs

Every approved account gets a personal workspace at `/:username` with all
five tools one click apart, sharing the same login and history — the point
isn't any single tool, it's not having to re-explain your context every time
you switch between them.

## Getting started

**Prerequisites:** Python 3.11, Node.js, and API keys for
[Anthropic Claude](https://console.anthropic.com/) (or
[Gemini](https://ai.google.dev/) as an alternate provider) and
[Supabase](https://supabase.com/) (auth + per-tool history).

```bash
# create .env with ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY, ... (see CLAUDE.md)

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m backend.main          # http://localhost:9000

cd frontend && npm install && npm run dev    # http://localhost:5173
```

Production build check:

```bash
cd frontend && npm run build && cd ..
python -m backend.main
```

```bash
# Docker
docker build -t veloo .
docker run --env-file .env -p 9000:9000 veloo
```

Supabase schema lives in `backend/schema.sql` — run it once in the Supabase
SQL Editor. Full environment variable list is in `CLAUDE.md`.

## Tech stack

- **Backend** — FastAPI, Python 3.11, Uvicorn
- **Frontend** — React 18, TypeScript, Vite
- **AI** — Anthropic Claude, with Gemini as a swappable provider
- **DB** — Supabase (auth + per-tool history)
- **Deploy** — Docker, Cloudflare Tunnel, GitHub Actions
