# todo

연구 할 일 관리: 할 일/단계(step)/우선순위, AI 기반 단계 분해·전략 제안, 주간 리뷰, 마감일 리마인드 이메일.

## 구조
- `app.py` — FastAPI 앱, 라우터 include만 담당
- `core/routers/todos.py` — 할 일 CRUD, 캘린더용 목록 (`prefix=/api/todos`)
- `core/routers/steps.py` — 할 일 하위 단계 CRUD (`prefix=/api/steps`)
- `core/routers/ai.py` — Claude 기반 단계 자동 생성·전략 제안 (`prefix=/api/ai`)
- `core/routers/reviews.py` — 주간 리뷰 (`prefix=/api/reviews`)
- `core/scheduler.py` — 마감일 리마인드 이메일 스케줄러 (`SMTP_USER` 설정 시에만 `main.py`에서 시작)
- `core/email_sender.py` — 이메일 발송
- `core/schemas.py` — Pydantic 스키마
- `core/research_todo.db` — 로컬 SQLite (gitignore 대상, 커밋 안 됨)

## 엔드포인트 (주요)
- `GET/POST/PATCH/DELETE /api/todos` — 할 일 CRUD, `GET /api/todos/calendar` — 캘린더용 목록
- `PATCH /api/todos/{id}/done`, `POST /api/todos/{id}/steps`
- `PATCH/DELETE /api/steps/{id}`, `PATCH /api/steps/{id}/done`
- `POST /api/ai/generate-steps`, `/generate-steps-async`, `/generate-strategy`
- `GET /api/reviews/weekly`
- `GET /health`

## 참고
- `__init__.py`에서 `core/`를 flat import 하도록 `sys.path`에 추가함 — `routers.xxx`, `database`, `schemas`로 임포트
- 마감일은 달력 UI로 지정 (텍스트 입력 아님) — 프론트엔드 `frontend/src/features/todos/` 참고
- `frontend/src/features/calendar/`(타임블로킹 캘린더·주간 리뷰 화면)는 현재 `Shell.tsx`에서 네비게이션이 주석 처리되어 임시 비활성 상태이나 라우팅 자체는 남아 있음
