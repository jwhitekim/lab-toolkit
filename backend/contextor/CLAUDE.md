# contextor

영어 단어/짧은 구를 입력하면 ML/DL 논문에서 쓰이는 맥락별 의미를 구조화된 JSON으로 펼쳐 설명. `extensions/contextor/` 크롬 익스텐션(Alt+C)에서도 호출됨.

## 구조
- `app.py` — FastAPI 앱, 프롬프트, 엔드포인트가 한 파일에 있음 (별도 core/ 없음)

## 엔드포인트
- `POST /api/lookup` — 단어 조회. Supabase `contextor_history`에 동일 query 캐시 있으면 즉시 반환, 없으면 Claude 호출 후 캐시 저장
- `GET /api/history` — 최근 조회 히스토리

## 참고
- 응답 스키마(`hasMlUsage`, `cases[]`, `note`)는 `_RULES`/`_EXAMPLES` 프롬프트에 few-shot으로 강제되어 있음 — `_extract_json`이 코드펜스 유무와 무관하게 JSON 블록만 추출
- 다른 서브앱과 달리 `CLAUDE_MODEL_FAST`(기본 `claude-haiku-4-5-20251001`)를 기본으로 사용 — 응답 속도 우선
- Supabase 클라이언트를 `backend.database.get_supabase()`가 아니라 `app.py` 내부에서 직접 생성함 (다른 서브앱과의 사소한 불일치, 동작에는 문제 없음)
