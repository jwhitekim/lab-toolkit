# 알약(캡슐) 독 디자인 스펙

앱 전환 탭의 "슬라이딩 캡슐 인디케이터" 컴포넌트 스펙. 데스크톱(상단)과 모바일(하단)에 각각 다른 형태로 구현되어 있고, 코드는 `frontend/src/app/Shell.tsx` + `frontend/src/app/Shell.css`.

디자인 근거·출처는 [`docs/liquid-glass-research.md`](./liquid-glass-research.md) 참고. 이 문서는 "왜"가 아니라 "지금 정확히 어떤 값인가"를 기록한다. **2026-08-16 기준 — 앱이 6개(Todo/Calendar/Paper/Translate/Model Review/Contextor)로 늘고 모바일에서 Todo+Calendar가 "Plan" 탭으로 합쳐진 구조를 반영.**

## 앱 구조

```
DESKTOP_APPS (상단 탭바, 6개 그대로 노출)
  todo · calendar · paper · translate · model-review · contextor

MOBILE_APPS (하단 독, 5개)
  plan(=todo/calendar 통합) · paper · translate · model-review · contextor
```

- 모바일에서는 "Plan" 탭 하나가 Todo/Calendar를 대신한다. 마지막으로 본 게 Todo였는지 Calendar였는지 `localStorage`(`veloo:last-plan-app`)에 저장해뒀다가 다음에 Plan 탭을 누르면 그걸 복원한다.
- Plan 탭이 활성 상태일 때만 본문 위쪽에 `.shell-plan-switcher`(Todo/Calendar 전환용 서브 탭 2개)가 나타난다. 다른 탭(Paper 등)에서는 안 보임.

## 공통 원칙

1. **인디케이터는 원이 아니라 세그먼트(탭 하나) 폭을 따르는 캡슐이다.** 탭 라벨 길이가 다르면 인디케이터 폭도 달라진다.
2. **인디케이터는 탭 자신이 아니라 별도 레이어다.** 탭 버튼 배경은 투명, `position: absolute`인 인디케이터 div가 뒤(`z-index: 0`)에서 위치/폭을 애니메이션. 탭은 `z-index: 1`.
3. **탭 전환 시 인디케이터는 즉시 이동하지 않고 슬라이드한다.** `transform`(위치) + `width`(폭)를 함께 트랜지션.
4. **모바일 드래그 중에는 트랜지션을 끈다** (`is-dragging` 상태) — 손가락을 실시간으로 따라가야 하므로. 손을 뗀 순간에만 스냅 애니메이션 복구.
5. 위치/폭 계산은 CSS가 아니라 JS(`getBoundingClientRect`/`offsetLeft`/`offsetWidth`)로 매 렌더 시 실측한다.

---

## 데스크톱 (상단 탭바)

`.shell-app-nav` (≥641px)

| 속성 | 값 |
|---|---|
| 탭 높이 | 38px |
| 탭 간격(gap) | 4px |
| 탭 내부 패딩 | `0 13px` |
| 탭 모서리 | 8px (`.shell-app-tab-indicator`도 동일) |
| 라벨 표시 | 항상 표시 (아이콘+텍스트, 비활성 탭도 숨기지 않음) |
| 아이콘 크기 | 15px, lucide 기본 `strokeWidth`(2) |

**인디케이터**
```css
background: var(--bg-base);
border: 1px solid rgba(0, 0, 0, 0.08);
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
            width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
```
- 유리(블러) 효과 없음 — 불투명 흰 배경 + 얇은 테두리 + 옅은 그림자.
- 0.5초 + 오버슈트 이징. **0.3초 이하로 줄이지 말 것** — 실제로 0.3초는 "바뀌는 느낌이 안 든다"는 피드백으로 0.5초로 늘렸었음.
- 동기화: `ResizeObserver`로 nav 컨테이너와 활성 버튼을 관찰.
- 제스처 없음 — 클릭으로만 전환.

**우측 영역(`shell-topbar-end`)**: 언어 전환 스위처(`LanguageSwitcher`)가 위치. 981px 미만에서는 숨김.

---

## 모바일 (하단 독)

`.shell-mobile-dock` (≤640px)

### 독 컨테이너 위치

| 속성 | 값 | 근거 |
|---|---|---|
| 좌우 여백 | `21px` | iOS 26 실제 탭바 값 (FabBar) |
| 하단 여백 | `env(safe-area-inset-bottom) + 21px` | 홈 인디케이터 위 21px 추가 여유 |
| z-index | 100 | 콘텐츠 위에 항상 떠 있음 |

### 캡슐 바 (`.shell-mobile-tabs`)

| 속성 | 값 |
|---|---|
| 높이 | 58px |
| 모서리 | `9999px` (완전한 캡슐) |
| 배경 | `linear-gradient(135deg, rgba(255,255,255,.56), rgba(242,242,247,.32))` |
| 블러 | `blur(24px) saturate(175%)` |
| 테두리 | `1px solid rgba(255,255,255,.5)` |
| 그림자 | `inset 0 1px 0 rgba(255,255,255,.72)`, `inset 0 -0.5px 0 rgba(0,0,0,.08)`, `0 5px 20px rgba(0,0,0,.13)` |
| `touch-action` | `pan-y` (좌우 드래그를 스크롤로 뺏기지 않게) |
| `backdrop-filter` 미지원 폴백 | `rgba(246,246,248,.94)` 불투명 배경 |

### 탭 아이템 (`.shell-mobile-tab`)

- **5개** 탭이 `flex: 1 1 20%`로 균등 분할 (탭 폭 = 독 내부 폭 ÷ 5).
- 아이콘(20px, `stroke-width 2.35`) 위 + 라벨(10px) 아래, 세로 배치.
- 라벨은 모바일 전용 축약형: `Plan · Paper · Trans · Models · Concepts`.
- 활성 색상은 `var(--accent)` (그린) — 비활성은 `var(--text-secondary)`.
- `:active` 시 `scale(0.92)`로 눌리는 피드백.

### 인디케이터 (`.shell-mobile-tab-indicator`)

**형태 — 2026-09-05, 두 번 뒤집힘**: 처음엔 "바 표면 위에 얹혀 위쪽으로만 튀어나온 볼록 렌즈"로
바꿨었다(`frame_0011.png` 등 App Store 레퍼런스 참고 — 아래쪽은 바 안쪽 경계에 맞춰지고 위쪽만
돌출). 하지만 5개 탭이 `flex:1 20%`로 폭이 전부 동일하게 좁은 실제 화면(세그먼트 폭 ~70px)에서는
튀어나온 높이(52~60px)가 폭 대비 너무 커서 알약이 아니라 원형으로 보였다(실기기 DOM 계산값으로
확인: `width:60px / height:52px` ≈ 1.15:1) — 그래서 **돌출 컨셉 자체를 접고, 바 안에 대칭으로
들어간(돌출 없음) 원래 방식으로 되돌리되 높이를 세그먼트 폭보다 확실히 낮춰서** 폭:높이 비율을
알약답게 만듦. 모서리 반경은 네 군데 다른 반경(스퀴클)도 시도했다가 캡슐 굴곡이 깨져 보인다는
피드백으로 기존 바와 동일한 완전한 pill(`9999px`, 네 모서리 동일)로 되돌림 — 항상 이 굴곡을
유지할 것.

**재질/색 — 2026-09-05 최종**: 실제 인스타그램 앱의 터치 피드백을 그대로 재현한다.
- **평소(정지)**: 진한 그레이, 테두리·블러 없음.
- **손가락이 닿아있는 동안(`is-pressed`, 탭이든 드래그든 `pointerdown`~`pointerup`)**: 연한
  그레이로 바뀌고, **바(`.shell-mobile-tabs`) 전체가 살짝 부푼다**(`transform: scale(1.03)`).
  인디케이터는 바의 자식이라 별도 계산 없이 부모 scale을 따라 같은 비율로 같이 커진다.

```css
/* .shell-mobile-tab-indicator */
top: 7px;                  /* 돌출 없음 — 58px 바 안에 대칭으로 들어감((58-44)/2) */
height: 44px;
border-radius: 9999px;
background: rgba(150, 152, 162, 0.65);      /* 평소: 진한 그레이 */
box-shadow: 0 4px 12px rgba(0,0,0,.18);     /* 2026-09-06: accent 톤 링 글로우 제거, 중립 그림자만 */
transition: transform .3s cubic-bezier(.4,0,.2,1),
            width .3s cubic-bezier(.4,0,.2,1),
            background-color .15s ease-out;

/* .shell-mobile-tab-indicator.is-pressed */
background: rgba(205, 207, 216, 0.55);      /* 터치 중: 연한 그레이 */

/* .shell-mobile-tabs.is-pressed */
transform: scale(1.03);                     /* 바 전체가 살짝 부풂 — 인디케이터도 자식이라 같이 커짐 */
```
- **폭 = 탭 버튼 `offsetWidth`에서 좌우 각 3px씩 인셋**(`INDICATOR_INSET`,
  `MobileCapsuleNavigation.tsx`의 `indicatorRectFor()`) — 5개 탭 세그먼트 폭이 전부 동일하게
  좁은 화면(~70px)에서 인셋을 너무 크게 주면 폭이 다시 높이(44px)보다 좁아져 원형이 된다.
  처음엔 인셋 없이 `offsetWidth` 그대로, 그다음 5px 인셋을 시도했다가 둘 다 원형 문제가
  있었음(2026-09-05 실기기 DOM 계산값으로 확인).
- **드래그 중(`is-dragging`)에는 인디케이터의 `transform`/`width` transition을 끈다** — 손가락
  x좌표를 매 프레임 실시간 추적해야 하므로 0.3s 지연이 있으면 손끝을 못 따라간다. `is-pressed`
  (배경색)는 별개로 계속 살아있음.
- `isPressed`는 `isDragging`(5px 이상 움직여야 켜짐)과 별개로 `pointerdown` 즉시 켜진다 — 살짝
  눌렀다 떼는 단순 탭에도 부풀기/색 전환 피드백이 있어야 하므로.

**폐기된 시도들 (역사, 2026-09-05 하루 동안)**:
- ① 순백(`rgba(255,255,255,.96/.74)`) 배경 — 실사용에선 잘 보였지만, `frame_0001.png`/
  `frame_0011.png` 픽셀 샘플링 결과 실제 레퍼런스는 순백이 아니라 연한 그레이였음(RGB 대략
  190,190,205, 나머지 바 색과 큰 차이도 없음 — "선택됨"은 색이 아니라 모양이 표현).
- ② SVG "goo"(방울 합체) 필터로 드래그 중 인디케이터 두 개(즉시 추적 lead + 지연 추적 trail)가
  물방울처럼 이어 붙는 연출 — App Store 레퍼런스(`frame_0016.png`)의 "탄성 있게 늘어남" 느낌을
  내려던 시도. `feGaussianBlur`+`feColorMatrix`+`feComposite` 표준 gooey-effect 레시피는 **꽉 찬
  도형에서만 동작**하고, "움직일 때 투명+흰 테두리만" 요구사항(속이 빈 도형)에 적용하면 도형이
  사라지거나 엉뚱한 덩어리로 뭉개짐(격리 테스트로 확인) — 기술적으로 양립 불가능해서 폐기.
- ③ 결국 사용자가 실제 인스타그램 앱을 직접 조작해서 확인해준 진짜 동작(위 "재질/색" 항목)으로
  대체 — goo/이중 블롭 없이 색 전환 + 부모 scale만으로 훨씬 단순하게 구현됨.

**표면 반사광(스페큘러 하이라이트, `::before`+`::after`) — 2026-09-06 완전히 제거함.**
2026-09-04에 추가해서 그날만 세 번 방식을 바꿔가며(① mix-blend → ② 알파-블렌드 단색 흰색 →
③ 밝은 띠+그림자 띠 페어) 유지해왔는데, "블러나 미러링 없이 처음부터 끝까지 완전히 균일한 단색
그레이여야 한다"는 요구사항과 정면으로 상충해서 결국 완전히 걷어냄(레퍼런스: 실제 인스타그램
탭바는 반사 효과 없는 플랫 그레이). `--sheen-x` CSS 변수와 `sheenPercent()` 계산 함수도 같이
제거됨 — 지금 인디케이터는 순수하게 단색 배경(평소 진한 그레이 / `is-pressed` 연한 그레이)만
가진다. 아이콘 자체는 lucide 기본값(`stroke`만 그리고 `fill: none`)이라 도형 안 뚫린 부분(문
모양 등)이 이미 배경색 그대로 비쳐 보이므로 별도 처리 불필요.

### 제스처 — 드래그로 탭 이동

iOS `UISegmentedControl`의 네이티브 드래그 동작을 웹 포인터 이벤트로 재현.

1. `onPointerDown`: 포인터 캡처(`setPointerCapture`), 시작 좌표·최근접 탭 기록.
2. `onPointerMove`: 시작점에서 5px 이상 움직이면 "드래그 시작" 확정 — 5px 미만은 단순 탭으로 간주. 드래그 중엔 인디케이터가 포인터 x좌표를 실시간 추적, 양끝 탭 경계에서 클램프.
3. `onPointerUp`: 실제로 드래그했다면 가장 가까운 탭으로 전환(`selectMobileItem`). 클릭 이벤트 중복 방지를 위해 `suppressMobileClickRef`를 짧게 세워둠.
4. `onPointerCancel`: 브라우저가 제스처를 가로챌 때도 동일하게 마무리.

### Plan 스위처 (`.shell-plan-switcher`)

모바일에서 "Plan" 탭이 활성일 때만 본문 상단에 나타나는 2단 서브 탭 (Todo / Calendar).

| 속성 | 값 |
|---|---|
| 배치 | `grid-template-columns: repeat(2, 1fr)`, gap 4px |
| 높이 | 40px (버튼 자체는 30px) |
| 배경 | `color-mix(in srgb, var(--bg-base) 94%, var(--accent-soft))` — 은은한 그린 틴트 |
| 활성 버튼 | `background: var(--bg-base)`, `color: var(--accent)`, 옅은 그림자로 떠 보이게 |
| 아이콘 | 14px |

### 접근성 · 축소 모션

- `.shell-mobile-tab:focus-visible` — `outline: 2px solid rgba(0,0,0,.72)`.
- `.shell-plan-switcher button:focus-visible` — `outline: 2px solid var(--accent)`.
- `@media (prefers-reduced-motion: reduce)` — 인디케이터/캡슐 바 트랜지션을 `0.01ms`로 강제.

---

## 하지 않는 것 (역사적으로 시도했다가 되돌린 것)

- ❌ 화면 끝까지 붙는 전체 폭 바 (Instagram 구버전 스타일) — 오해로 한 번 만들었다가 "알약 형태로 떠 있어야 한다"는 피드백으로 되돌림.
- ❌ 인디케이터를 고정 크기 원(28px)으로 — 세그먼트 폭을 따르는 캡슐이 맞는 방향으로 확인되어 폐기.
- ❌ 데스크톱 탭 라벨을 활성 상태에서만 펼치기 — 비활성 탭이 아이콘만 남아 뭔지 알 수 없다는 문제로 항상 라벨 표시로 변경.
- ❌ 별도 검색 캡슐(듀얼 캡슐 구조) — 초기 버전엔 있었으나 이후 단일 캡슐 구조로 단순화됨.
- ❌ 모바일 하단 독에 Todo/Calendar를 각각 독립 탭으로 — 탭 수가 6개까지 늘면서 하단 독이 좁아져, 성격이 비슷한 Todo/Calendar를 "Plan" 하나로 묶고 내부 서브 스위처로 분리.
