# paper_analyzer

논문 검색·분석. PDF 업로드 또는 제목/URL 검색 → Semantic Scholar로 메타데이터·저자 조회 → Claude로 요약 → SJR 저널 품질 조회.

## 구조
- `app.py` — FastAPI 앱, 엔드포인트 정의
- `core/semantic_scholar.py` — Semantic Scholar API 연동 (검색, 저자 enrich)
- `core/claude_analyzer.py` — Claude 기반 논문 요약
- `core/journal_quality.py` — `data/scimagojr 2025.csv` 기반 SJR 저널 품질 조회
- `core/pdf_extractor.py` — 업로드 PDF에서 제목/초록/DOI/arXiv ID/그림 추출
- `data/venue_aliases.json` — 저널명 별칭 매핑

## 엔드포인트
- `GET /history` — 최근 분석 히스토리 (Supabase `paper_history`)
- `POST /search` — 제목/URL 검색 → 후보 목록
- `POST /analyze` — paper_id 또는 url로 분석 실행 (캐시 확인 후 없으면 신규 분석)
- `POST /analyze-pdf` — PDF 업로드 분석 (최대 50MB)

## 참고
- `__init__.py`에서 `core/`를 flat import 하도록 `sys.path`에 추가함 — `core.xxx`로 임포트
- `S2_API_KEY` 환경변수로 Semantic Scholar 레이트리밋 완화
- Supabase 미설정 시 히스토리/캐시는 조용히 비활성화됨 (에러 대신 빈 결과)
