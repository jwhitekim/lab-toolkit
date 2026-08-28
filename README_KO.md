# Veloo

**언어:** [English](README.md) | 한국어

**라이브 데모:** <https://veloo.page/> — 프라이빗 베타라 가입 신청 후 관리자
승인을 받아야 접속할 수 있습니다. 랩 공용 도구가 아니라 관리자 본인의 API
키와 Supabase 프로젝트로 운영되는 개인용 배포입니다.

연구를 하다 보면 PDF 리더, 번역기, 메모 앱, 할 일 목록, 캘린더를 계속
옮겨 다니게 되고, 옮길 때마다 방금 하던 맥락을 다시 설명해야 합니다.
Veloo는 논문을 읽고 연구 결과물을 만드는 데 실제로 필요한 부분들을 하나의
작업 공간, 하나의 로그인, 하나의 히스토리 아래로 모읍니다 — 논문을 읽고,
막히는 부분을 번역하고, 헷갈리는 용어를 찾아보고, 아키텍처 그림을 보고
스스로 설명해본 뒤, 배운 걸 일정으로 만드는 과정을 탭을 옮기지 않고
끝냅니다.

## 담긴 도구들

- **Paper Analyzer** — PDF를 업로드하거나 제목/URL로 검색합니다. Semantic
  Scholar가 메타데이터와 저자 정보를 채워주고, Claude가 문제·방법·결론을
  요약하고, 내장된 SJR 데이터로 저널 품질을 매깁니다 — 한 시간을 들여
  읽기 전에 결과가 탄탄한 논문인지 약한 학회/저널인지 먼저 가늠할 수
  있습니다.
- **Translator** — ML/DL/CV/NLP 논문에 맞춘 영→한 스트리밍 번역입니다.
  수식과 고유명사는 건드리지 않고, 직역하면 오히려 헷갈리는 분야
  전문 용어는 영어 그대로 남겨둡니다.
- **Contextor** — 영어 단어나 짧은 구를 입력하면, 논문마다 다르게 쓰이는
  ML/DL 맥락별 의미를 하나로 뭉뚱그리지 않고 구조화해서 보여줍니다 —
  어느 논문이냐에 따라 뜻이 다섯 가지로 갈리는 단어들을 위한 기능입니다.
- **Model Review** — 아키텍처 그림을 업로드하면 AI가 구성요소가 어떻게
  연결되는지 기준 설명을 만들어주고, 이어서 직접 설명을 써보면 채점하고
  교정해줍니다. 그림을 훑고 넘어가는 대신 실제로 이해했는지 스스로
  확인하는 루프입니다.
- **Plan (할 일 + 캘린더)** — 하위 단계·우선순위가 있는 연구 할 일과 AI가
  제안하는 단계 분해·전략, 그리고 드래그 앤 드롭으로 옮기는 주간
  타임블로킹 캘린더와 리뷰를 제공합니다 — 방금 읽거나 배운 것이 또 하나의
  열린 탭이 아니라 실제 일정으로 이어지게 합니다.

## 탭 여섯 개가 아니라 작업 공간 하나

승인된 계정마다 다섯 가지 도구를 클릭 한 번으로 오갈 수 있는 개인
작업 공간(`/:username`)이 주어지고, 로그인과 히스토리를 함께 씁니다 —
중요한 건 도구 하나하나가 아니라, 도구를 옮길 때마다 맥락을 다시
설명하지 않아도 된다는 점입니다.

## 시작하기

**준비물:** Python 3.11, Node.js, 그리고
[Anthropic Claude](https://console.anthropic.com/) API 키(또는 대체
프로바이더로 [Gemini](https://ai.google.dev/)), [Supabase](https://supabase.com/)
(인증 + 도구별 히스토리).

```bash
# .env에 ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY 등 입력 (CLAUDE.md 참고)

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m backend.main          # http://localhost:9000

cd frontend && npm install && npm run dev    # http://localhost:5173
```

운영 빌드 확인:

```bash
cd frontend && npm run build && cd ..
python -m backend.main
```

```bash
# Docker
docker build -t veloo .
docker run --env-file .env -p 9000:9000 veloo
```

Supabase 스키마는 `backend/schema.sql`에 있고, Supabase SQL Editor에서 한 번
실행하면 됩니다. 전체 환경변수 목록은 `CLAUDE.md`를 참고하세요.

## 기술 스택

- **Backend** — FastAPI, Python 3.11, Uvicorn
- **Frontend** — React 18, TypeScript, Vite
- **AI** — Anthropic Claude, 교체 가능한 프로바이더로 Gemini
- **DB** — Supabase (인증 + 도구별 히스토리)
- **Deploy** — Docker, Cloudflare Tunnel, GitHub Actions
