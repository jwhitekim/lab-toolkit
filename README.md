# veloo

가천대 PRML Lab 연구실 도구 허브.
FastAPI 백엔드와 React/TypeScript 프론트엔드를 SPA 구조로 통합 제공합니다.

---

## 도구

| 도구 | 경로 | 설명 |
|------|------|------|
| **Paper Analyzer** | `/paper` | PDF 업로드 또는 제목 검색 → Claude 논문 분석 (문제/방법/결론), Semantic Scholar 저자 프로필, 저널 품질 등급 |
| **Translator** | `/translate` | 영어 텍스트 자동 번역. 단어는 구조화된 정의 + 키워드, 드래그 선택 시 네이버 사전 인라인 표시 |
| **Architecture Trainer** | `/arch-trainer` | 논문 아키텍처 다이어그램 업로드 → Claude 설명 생성 → 직접 설명 작성 → AI 피드백. 딥러닝 논문 읽기 능력 훈련 |
| **Todo** | `/todo` | Supabase 기반 연구 할 일 관리. Claude가 작업을 단계로 분해하고 우선순위 전략을 생성 |

---

## 기술 스택

- **Backend** — FastAPI (서브앱 마운트: `/paper`, `/translate`, `/arch-trainer`, `/todo`), Python 3.11+
- **Frontend** — React 18 + TypeScript + Vite, CSS 커스텀 속성 기반 다크/라이트 테마
- **AI** — Anthropic Claude API (`claude-haiku-4-5` 빠른 작업, `claude-sonnet-4-6` 비전/추론)
- **DB** — Supabase (히스토리 + 인증), Semantic Scholar API (논문 메타데이터), 네이버 사전 API
- **배포** — Docker + GitHub Actions SSH 자동 배포 → nginx → Cloudflare Tunnel

---

## 인증

- username + password 로그인
- bcrypt 해싱, httpOnly 쿠키 세션, 30일 만료
- IP별 rate limiting (5회 실패 시 15분 차단)
- 회원가입 후 관리자 승인 필요

---

## 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션. 직접 커밋 금지. |
| `dev/backend` | 백엔드 개발 전용 |
| `dev/frontend` | 프론트엔드 개발 전용 |
| `dev/staging` | 통합 검증 후 main PR |

**작업 흐름:** `dev/backend` or `dev/frontend` → `dev/staging` (통합 검증) → `main` PR → 자동 배포

---

## 로컬 개발

### 환경변수 설정

`.env` 파일 생성:

| 변수명 | 설명 |
|--------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 키 |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `S2_API_KEY` | Semantic Scholar API 키 |
| `SECURE_COOKIE` | 프로덕션 `true`, 로컬 `false` |

### 실행

**백엔드**
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py  # http://localhost:9000
```

**프론트엔드**
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173 (API → :9000 프록시)
```

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production. Direct commits forbidden. |
| `dev`  | All development work. PR → main to deploy. |

**Workflow:** `dev` → PR → `main` → GitHub Actions auto-deploy

---

## Deployment
| Secret | 설명 |
|--------|------|
| `SERVER_HOST` | 서버 IP 또는 호스트명 |
| `SERVER_USER` | SSH 사용자명 |
| `SERVER_PASSWORD` | SSH 비밀번호 |

---

## 버전 관리

앱(`frontend/package.json`)과 익스텐션(`extension/manifest.json`)을 동시에 업데이트합니다:

```bash
python bump.py patch   # 1.0.0 → 1.0.1
python bump.py minor   # 1.0.0 → 1.1.0
python bump.py major   # 1.0.0 → 2.0.0
```
