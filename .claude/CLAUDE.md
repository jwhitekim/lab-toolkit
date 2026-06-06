# veloo — CLAUDE.md

## 프로젝트 개요
가천대 PRML Lab 연구실 도구 허브.
FastAPI 루트(main.py)가 4개 서브앱을 마운트하는 SPA 구조.
배포: veloo.page (Docker + Cloudflare Tunnel, GitHub Actions 자동 배포)

## 아키텍처
```
[React Frontend (TypeScript)] → frontend/dist/ (정적 서빙)
[FastAPI Root — main.py]
    ├── /paper        → backend/paper_analyzer/
    ├── /translate    → backend/translator/
    ├── /model-review → backend/arch_trainer/
    └── /todo         → backend/todo/
```

## 기술 스택
- Backend: Python 3.11, FastAPI, Uvicorn, Pydantic v2
- Frontend: React 18 + TypeScript + Vite → frontend/dist/
- AI: Anthropic SDK (claude-haiku-4-5 / claude-sonnet-4-6)
- DB: Supabase (전 모듈 히스토리 + 인증)
- 배포: Docker + GitHub Actions SSH → nginx → Cloudflare Tunnel

## 환경변수
| 변수명                | 사용 모듈      |
|----------------------|---------------|
| ANTHROPIC_API_KEY    | 전 모듈        |
| SUPABASE_URL         | 전 모듈        |
| SUPABASE_KEY         | 전 모듈        |
| SUPABASE_SERVICE_KEY | 전 모듈        |
| S2_API_KEY           | paper_analyzer |
| SECURE_COOKIE        | main.py        |

## 브랜치 전략
- main         : 프로덕션. 직접 커밋 금지. dev/staging PR 머지로만 업데이트.
- dev/backend  : 백엔드 개발 전용
- dev/frontend : 프론트엔드 개발 전용
- dev/staging  : 통합 검증. backend + frontend 머지 후 로컬 확인 후 main PR.

## 작업 흐름
1. 기능 개발: dev/backend 또는 dev/frontend에서 작업 후 /push
2. 통합 검증: dev/staging에 양쪽 머지 → 로컬 실행으로 확인
3. 배포: dev/staging → main PR 머지 → GitHub Actions 자동 배포

## 프론트엔드 규칙
- 백엔드 호출은 상대경로 사용 (/paper, /translate, /arch-trainer, /todo)
- 별도 baseURL 환경변수 불필요 (동일 origin 서빙)
- 수정 후 npm run build 실행하여 dist/ 갱신
- dist/ 직접 수정 금지

## 공통 코드 규칙
- 환경변수 하드코딩 절대 금지
- 각 서브앱은 FastAPI() 인스턴스로 독립 선언 후 main.py에서 mount
- Pydantic v2 문법 사용
- 임시 파일은 /tmp에 저장, 요청 종료 시 삭제

## 버전 관리
- 버전 범프: python bump.py [major|minor|patch]
- 앱(frontend/package.json)과 익스텐션(extension/manifest.json) 동시 업데이트
- 버전 범프는 dev/staging 브랜치에서만 실행

## 스키마
- 단일 스키마 파일: backend/schema.sql
- Supabase 마이그레이션은 대시보드에서 직접 실행

## 서브에이전트 위임 규칙
- paper_analyzer 작업 → backend/paper_analyzer/CLAUDE.md 먼저 읽을 것
- translator 작업     → backend/translator/CLAUDE.md 먼저 읽을 것
- arch_trainer 작업   → backend/arch_trainer/CLAUDE.md 먼저 읽을 것
- todo 작업           → backend/todo/CLAUDE.md 먼저 읽을 것

## 브랜치 전략
- main : 프로덕션. 직접 커밋 금지. dev → main PR로만 업데이트.
- dev  : 개발 전용. 백엔드/프론트엔드 구분 없이 모든 작업.

## 작업 흐름
1. dev에서 작업 후 /push
2. dev → main PR 머지 → GitHub Actions 자동 배포

## 자기 갱신 규칙
- 새 모듈/파일 추가 시 이 파일 갱신
- 환경변수 추가 시 위 목록에 추가
- API 엔드포인트 변경 시 관련 CLAUDE.md에 반영
