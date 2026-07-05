# arch_trainer

논문 아키텍처 그림을 보고 스스로 설명하는 연습 → Claude가 기준 설명을 생성하고, 사용자 설명을 채점/교정. main.py에는 `/model-review`로 마운트됨 (내부 이름은 arch_trainer).

## 구조
- `app.py` — FastAPI 앱, 프롬프트, 엔드포인트가 한 파일에 있음 (별도 core/ 없음)

## 엔드포인트
- `POST /api/explain` — 아키텍처 이미지 업로드 (jpeg/png/gif/webp, 최대 10MB) → Claude가 JSON 스키마(overview/modules/data_flow/contribution/uncertain_parts)로 설명 생성, Supabase `arch_history`에 저장
- `POST /api/feedback` — 사용자 설명과 기준 설명(`ai_explanation`)을 비교해 correct/missing/incorrect/suggestion 반환, `history_id` 있으면 해당 레코드에 피드백 업데이트
- `GET /api/history` — 최근 히스토리

## 참고
- Claude 응답은 반드시 JSON만 나오도록 프롬프트에 강제하고 있고, `_parse_json`이 코드펜스를 벗겨냄 — 프롬프트 스키마 변경 시 파싱 로직도 같이 확인할 것
- `CLAUDE_MODEL_SMART` 환경변수로 모델 오버라이드
