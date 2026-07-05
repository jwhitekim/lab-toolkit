# translator

ML/DL/CV/NLP 논문 문장·구·용어를 자연스러운 한국어로 번역하는 스트리밍 API.

## 구조
- `app.py` — FastAPI 앱, 시스템 프롬프트, 엔드포인트가 한 파일에 있음 (별도 core/ 없음)

## 엔드포인트
- `POST /api/translate` — 텍스트 스트리밍 번역 (Claude `messages.stream`). Supabase `translation_history`에 동일 원문 캐시 있으면 스트리밍 없이 즉시 반환 (`X-Cache: HIT`)
- `GET /api/history` — 최근 번역 히스토리

## 참고
- 번역 규칙(수식·고유명사 보존, 특정 ML 용어 영어 유지 등)은 `app.py`의 `_SYSTEM` 프롬프트에 하드코딩되어 있음 — 번역 톤/규칙 수정 시 여기를 고칠 것
- `CLAUDE_MODEL_SMART` 환경변수로 모델 오버라이드 (기본 `claude-sonnet-4-6`)
- Supabase 미설정 시 캐시/히스토리는 조용히 비활성화됨
