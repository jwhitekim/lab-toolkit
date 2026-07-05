# veloo

FastAPI + React SPA로 논문 분석, 번역, 모델 리뷰, 할 일 관리를 제공합니다.

## 도구

| 도구 | API 마운트 | 설명 |
|------|------------|------|
| Paper Analyzer | `/paper` | PDF 업로드·제목/URL 검색, Claude 논문 요약, Semantic Scholar 저자 정보, SJR 저널 품질 |
| Translator | `/translate` | ML/DL 논문 문장·문단 번역 |
| Contextor | `/contextor` | 영어 단어·구를 ML/DL 맥락별 의미로 구조화 |
| Model Review | `/model-review` | 아키텍처 이미지 설명 생성 + AI 피드백 |
| Todo | `/todo` | 연구 할 일, 단계, 우선순위, AI 전략 |
| Calendar | `/todo` | 할 일 기반 타임블로킹 캘린더 + 주간 리뷰 |

모든 앱은 `veloo.page/:username` 단일 URL에서 사이드바 메뉴로 전환합니다.

## Chrome 익스텐션

| 폴더 | 단축키 | 기능 |
|------|--------|------|
| `extensions/paper/` | `Alt+P` | 어느 탭에서든 PDF 팝업 분석 |
| `extensions/contextor/` | `Alt+C` | 수업·논문 중 단어 즉시 맥락 검색 |

## 기술 스택

- **Backend** — FastAPI, Python 3.11, Uvicorn
- **Frontend** — React 18, TypeScript, Vite
- **AI** — Anthropic Claude API (`claude-haiku-4-5`, `claude-sonnet-4-6`)
- **DB** — Supabase (인증 + 히스토리), Semantic Scholar API
- **Deploy** — Docker, Cloudflare Tunnel, GitHub Actions

## 환경변수

루트에 `.env` 파일을 둡니다.

| 변수 | 필수 | 설명 |
|------|------|------|
| `ANTHROPIC_API_KEY` | ✓ | Claude API 키 |
| `SUPABASE_URL` | ✓ | Supabase 프로젝트 URL |
| `SUPABASE_KEY` | ✓ | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | 권장 | 서버 측 히스토리 저장용 service role key |
| `S2_API_KEY` | 선택 | Semantic Scholar API 키 |
| `CLAUDE_MODEL_FAST` | 선택 | 기본값 `claude-haiku-4-5-20251001` |
| `CLAUDE_MODEL_SMART` | 선택 | 기본값 `claude-sonnet-4-6` |
| `SECURE_COOKIE` | 선택 | 운영 `true`, 로컬 `false` |
| `PORT` | 선택 | 기본값 `9000` |

## 로컬 개발

```bash
# 백엔드
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py          # http://localhost:9000

# 프론트엔드
cd frontend
npm install
npm run dev             # http://localhost:5173
```

운영 빌드 확인:

```bash
cd frontend && npm run build && cd ..
python main.py
```

## Docker

```bash
docker build -t veloo .
docker run --env-file .env -p 9000:9000 veloo
```

## 인증

- `/register` 가입 후 관리자가 Supabase에서 `is_approved = true` 승인 필요
- 로그인 성공 시 30일 만료 httpOnly 쿠키 발급
- IP 기준 5회 실패 시 15분 차단
- 스키마: `backend/schema.sql`을 Supabase SQL Editor에서 실행

## 버전 관리

```bash
python bump.py patch   # 또는 minor / major
```

`frontend/package.json`과 `extensions/paper/manifest.json` 버전을 동시에 올립니다.

## 브랜치 전략

- `main` — 프로덕션. PR 머지로만 업데이트
- `dev` — 개발. 작업 후 `main` PR → GitHub Actions 자동 배포
