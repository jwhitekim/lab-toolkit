# veloo 디자인 시스템

앱 전체에 적용되는 디자인 토큰과 규칙. 토큰 정의는 `frontend/src/shared/styles/index.css`.

## 브랜드 정체성

- 워드마크: 소문자 `veloo`, `Space Grotesk` 700 사용 (`Shell.css` `.shell-brand-text`)
- 아이콘 마크: `favicon.svg` — 곡선 없이 각진 직선 획으로만 구성된 "V"
- **포인트 컬러 없음.** 흑백+그레이 모노톤이 원칙. 새 기능 추가 시 임의의 브랜드 컬러(파랑, 초록 등)를 넣지 말 것 — Todo 앱에 청록색이 섞여 있던 걸 흑백으로 통일한 전례 있음(2026-08-12 커밋 `25f7248`).
- 워드마크(`Space Grotesk`)는 각진 아이콘 마크와 어울리게 고른 선택. 본문 폰트로 확장하지 말 것 — 헤더 로고 전용.

## 색상 토큰

```css
--bg-base:            #ffffff;  /* 기본 배경 */
--bg-additive:         #f2f2f2;  /* 살짝 얹는 배경 — 카드, 웰(well) */
--bg-additive-hover:   #e5e5e5;  /* hover/active 배경 */
--text-primary:        #0f0f0f;
--text-secondary:      #606060;
--text-disabled:       #909090;
--selected-bg:          #0f0f0f;  /* 채워진 버튼/체크박스/뱃지 */
--selected-text:        #ffffff;
--border-subtle:       #e5e5e5;
--c-error:             #c0392b;  /* 삭제/에러 전용 — 유일하게 허용된 유채색 */
--c-error-dim:         rgba(192, 57, 43, 0.08);
```

**규칙**
- 새 UI에 색을 추가할 때는 항상 위 토큰에서 골라 쓴다. 새 hex 값을 직접 박아넣지 않는다.
- 빨강(`--c-error`)은 삭제·에러 등 파괴적/경고 동작에만 쓴다. 강조·브랜드 목적으로 쓰지 않는다.
- `--bg-additive`는 "패널 전체"가 아니라 "작은 웰(필터 탭 트랙 등)"에만 쓴다 — Todo 리스트 패널 전체를 회색으로 칠했다가 흰색으로 되돌린 전례 있음(`465bb06` 이전 작업, `frontend/src/features/todos/TodoList.tsx`).
- 레거시 별칭(`--c-card`, `--c-sidebar`, `--c-accent` 등)이 `index.css`에 남아있음 — Todo/Login 하위호환용. 새 코드에서는 위 1차 토큰만 쓸 것.

## 타이포그래피

```css
--font-sans: "Roboto", "Apple SD Gothic Neo", "Pretendard", "Malgun Gothic", sans-serif;
--fs-meta:    12px;
--fs-body:    14px;
--fs-title:   16px;
--fs-section: 20px;
--fw-regular:  400;
--fw-medium:   500;
--fw-semibold: 600;
--fw-bold:     700;
```

**규칙**
- 헤더 워드마크만 예외로 `Space Grotesk` 사용. 그 외 모든 텍스트는 `--font-sans`.
- **모바일 입력창(input/textarea/select)은 무조건 `font-size: 16px` 이상.** 16px 미만이면 iOS Safari가 포커스 시 자동 확대(줌인)한다 — 실제 버그였고 앱 전체(Todo/Login/Paper Analyzer)에 퍼져 있던 걸 일괄 수정함(`6d3674c`). 새 입력 필드 추가 시 반드시 16px 이상으로 시작할 것.

## 간격 · 모서리

```css
--space-xs:  4px;  --space-sm:  8px;  --space-md: 12px;
--space-lg: 16px;  --space-xl: 24px;  --space-2xl: 40px;

--radius-sm:   8px;
--radius-md:  10px;
--radius-lg:  12px;
--radius-pill: 9999px;
```

## 아이콘

- [lucide-react](https://lucide.dev) 사용. `strokeWidth={2.1}`이 기본값 (기본 2보다 살짝 두껍게 — 각진 브랜드 마크와 톤 맞춤).
- 데스크톱 탭 아이콘: 16px. 모바일 하단 독 아이콘: 20px.

## 컴포넌트 패턴

### 히스토리 드롭다운
- `frontend/src/shared/components/HistoryDropdown.tsx` — Translator/Contextor/Paper Analyzer가 공유.
- 규칙: 최근 기록을 페이지 본문에 상시 노출하지 않는다. 헤더의 아이콘 버튼(시계 아이콘) 클릭 시에만 드롭다운으로 펼친다. 항목이 0개면 버튼 자체를 숨긴다.
- 배경 클릭 시 자동으로 닫힘.

### 우선순위 배지 (Todo)
- `frontend/src/features/todos/priority.ts`에 `priorityStyle`/`priorityLabel`로 단일화.
- `urgent` = `--selected-bg` 채움, `mid` = `--bg-additive` 채움, `normal` = 투명+테두리. **컬러풀한 배지(빨강/주황/초록) 금지** — 전체 모노톤 규칙을 따른다.
- `TodoItem.tsx`와 `FocusPanel.tsx`가 서로 다른 색을 쓰던 버그가 있었음 — 반드시 이 공유 모듈을 import해서 쓸 것, 컴포넌트마다 새로 정의하지 말 것.

### 터치 대상 (모바일)
- `:hover`로만 나타나는 요소(예: `opacity-0 group-hover:opacity-100`)를 클릭 가능한 요소 위에 두지 않는다. iOS Safari에서 첫 탭이 호버 진입으로 소비되고 두 번째 탭에서야 클릭이 발생하는 버그를 유발한다(`TodoItem.tsx` 연필 아이콘, `6d3674c`에서 수정). 꼭 필요하면 `@media (hover: hover)`로 감싸서 터치 기기에서는 상시 노출한다.

## 다크 모드

**구현되어 있지 않다.** `tailwind.config.js`에 `darkMode: 'class'`가 설정돼 있고 일부 컴포넌트에 `dark:` 클래스가 남아있었지만, `.dark` 클래스를 토글하는 코드가 프로젝트 어디에도 없어 절대 발동하지 않는 죽은 코드였음 — Todo 쪽은 정리함(`25f7248`). 다크 모드를 실제로 지원하려면 토글 메커니즘부터 새로 설계해야 한다.

## 알려진 부채

- `python bump.py`가 `README.md`/`.claude/CLAUDE.md`에 문서화돼 있지만 저장소에 `bump.py` 파일 자체가 없음. 버전 범프 스크립트를 새로 만들거나 문서에서 지울 것.
- Chrome 익스텐션(`extensions/paper`, `extensions/contextor`)은 안 쓰여서 삭제됨(`84e28b5`) — 관련 배포 워크플로우도 함께 삭제.
