# 알약(캡슐) 독 디자인 스펙

앱 전환 탭의 "슬라이딩 캡슐 인디케이터" 컴포넌트 스펙. 데스크톱(상단)과 모바일(하단)에 각각 다른 형태로 구현되어 있고, 코드는 `frontend/src/app/Shell.tsx` + `frontend/src/app/Shell.css`.

디자인 근거·출처는 [`docs/liquid-glass-research.md`](./liquid-glass-research.md) 참고. 이 문서는 "왜"가 아니라 "지금 정확히 어떤 값인가"를 기록한다.

## 공통 원칙

1. **인디케이터는 원이 아니라 세그먼트(탭 하나) 폭을 따르는 캡슐이다.** 고정 크기 원을 쓰지 않는다 — 탭 라벨 길이가 다르면 인디케이터 폭도 달라져야 한다.
2. **인디케이터는 탭 자신이 아니라 별도 레이어다.** 탭 버튼 자체는 배경이 투명하고, `position: absolute`인 인디케이터 div가 그 뒤(`z-index: 0`)에서 위치/폭을 애니메이션한다. 탭은 `z-index: 1`.
3. **활성 탭 전환 시 인디케이터는 즉시 이동하지 않고 슬라이드한다.** `transform`(위치)과 `width`(폭)를 함께 트랜지션.
4. **모바일 드래그 중에는 트랜지션을 끈다** (`is-dragging` 상태) — 손가락을 실시간으로 따라가야 하므로 애니메이션 지연이 있으면 안 됨. 손을 뗀 순간에만 스냅 애니메이션 복구.
5. 위치/폭 계산은 CSS가 아니라 JS(`getBoundingClientRect`/`offsetLeft`/`offsetWidth`)로 매 렌더 시 실측한다 — 라벨 텍스트 길이, 반응형 폭 변화에 맞춰 항상 정확해야 하기 때문.

---

## 데스크톱 (상단 탭바)

`.shell-app-nav` (≥641px)

| 속성 | 값 |
|---|---|
| 탭 높이 | 38px |
| 탭 간격(gap) | 4px |
| 탭 내부 패딩 | `0 13px` |
| 탭 모서리 | 8px (`.shell-app-tab-indicator`도 동일) |
| 라벨 표시 | **항상 표시** (아이콘+텍스트, 비활성 탭도 숨기지 않음) |
| 아이콘 크기 | 16px, `strokeWidth 2.1` |

**인디케이터**
```css
background: var(--bg-base);
border: 1px solid rgba(0, 0, 0, 0.08);
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
            width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
```
- 유리(블러) 효과 없음 — 불투명 흰 배경 + 얇은 테두리 + 옅은 그림자. 상단바 자체가 `rgba(255,255,255,0.96)`으로 이미 거의 불투명해서 별도 블러가 필요 없음.
- 트랜지션 0.5초 + 오버슈트(살짝 튕기는) 이징. **0.3초 이하로 줄이지 말 것** — 실제로 0.3초는 "바뀌는 느낌이 안 든다"는 피드백으로 0.5초로 늘림.
- 동기화: `ResizeObserver`로 nav 컨테이너와 활성 버튼을 관찰, 리사이즈/활성 변경 시 `syncDesktopIndicator()` 재계산.
- 제스처 없음 — 클릭으로만 전환, 드래그 추적 불필요.

---

## 모바일 (하단 독)

`.shell-mobile-dock` (≤640px)

### 독 컨테이너 위치

| 속성 | 값 | 근거 |
|---|---|---|
| 좌우 여백 | `21px` | iOS 26 실제 탭바 값 (FabBar) |
| 하단 여백 | `env(safe-area-inset-bottom) + 21px` | 홈 인디케이터 위 21px 추가 여유 |
| z-index | 100 | 콘텐츠 위에 항상 떠 있음 |

`.shell-content`(본문)의 `padding-bottom`도 `env(safe-area-inset-bottom) + 104px`로 맞춰서, 스크롤 콘텐츠가 독 아래 안 가리게 여유를 둔다.

### 캡슐 바 (`.shell-mobile-tabs`)

| 속성 | 값 |
|---|---|
| 높이 | 58px |
| 모서리 | `9999px` (완전한 캡슐) |
| 배경 | `linear-gradient(135deg, rgba(255,255,255,.56), rgba(242,242,247,.32))` |
| 블러 | `blur(24px) saturate(175%)` |
| 테두리 | `1px solid rgba(255,255,255,.5)` |
| 그림자 | `inset 0 1px 0 rgba(255,255,255,.72)`, `inset 0 -0.5px 0 rgba(0,0,0,.08)`, `0 5px 20px rgba(0,0,0,.13)` |
| `backdrop-filter` 미지원 폴백 | `rgba(246,246,248,.94)` 불투명 배경 |

### 탭 아이템 (`.shell-mobile-tab`)

- 4개 탭이 `flex: 1 1 25%`로 균등 분할 (탭 폭 = 독 내부 폭 ÷ 4).
- 아이콘(20px, `strokeWidth 2.35`) 위 + 라벨(10px) 아래, 세로 배치.
- 라벨은 모바일 전용 축약형 사용 (`NAV_ITEMS[].mobileLabel`) — 예: "Paper Analyzer" → "Paper", "Translator" → "Translate", "Contextor" → "Context".
- `:active` 시 `scale(0.92)`로 눌리는 피드백.

### 인디케이터 (`.shell-mobile-tab-indicator`)

```css
height: 50px;              /* 캡슐 바(58px) 안쪽, 위아래 4px 패딩 */
border-radius: 9999px;
border: 1px solid rgba(255, 255, 255, 0.48);
background: linear-gradient(135deg, rgba(255,255,255,.58), rgba(255,255,255,.24));
backdrop-filter: blur(8px) saturate(160%);
box-shadow: inset 0 1px 0 rgba(255,255,255,.72),
            inset 0 -1px 0 rgba(0,0,0,.08),
            0 2px 8px rgba(0,0,0,.14);
transition: transform 0.3s cubic-bezier(0.4,0,0.2,1),
            width 0.3s cubic-bezier(0.4,0,0.2,1);
```
- 폭 = 해당 탭 버튼의 `offsetWidth` 그대로 (세그먼트 폭 추종 원칙).
- **드래그 중(`is-dragging`)에는 `transition: none`** — 손가락과 1:1로 즉시 따라가야 함.

### 제스처 — 드래그로 탭 이동

iOS `UISegmentedControl`의 네이티브 드래그 동작을 웹 포인터 이벤트로 재현.

1. `onPointerDown`: 포인터 캡처(`setPointerCapture`) 시작, 시작 좌표·최근접 탭 기록.
2. `onPointerMove`: 시작점에서 5px 이상 움직이면 "드래그 시작"으로 확정(`moved = true`) — 5px 미만은 단순 탭으로 간주해 무시. 드래그 중엔 인디케이터가 포인터 x좌표를 실시간 추적, 첫 번째/마지막 탭의 경계를 넘지 않도록 클램프.
3. `onPointerUp`: 실제로 드래그했다면(`moved`) 가장 가까운 탭으로 `setActive`. 클릭 이벤트 중복 방지를 위해 `suppressClickRef`를 짧게 세워둠(같은 프레임에 `onClick`이 또 안 걸리게).
4. `onPointerCancel`: 브라우저가 제스처를 가로챌 때도 위와 동일하게 마무리.

**필수 CSS**: `.shell-mobile-tabs { touch-action: pan-y; }` — 없으면 브라우저가 좌우 드래그를 스크롤 시도로 오인해 `pointercancel`로 제스처를 끊어버린다 (실제로 겪은 버그).

### 접근성 · 축소 모션

- `.shell-mobile-tab:focus-visible` — `outline: 2px solid rgba(0,0,0,.72)`.
- `@media (prefers-reduced-motion: reduce)` — 인디케이터/캡슐 바 트랜지션을 `0.01ms`로 강제.

---

## 하지 않는 것 (역사적으로 시도했다가 되돌린 것)

- ❌ 화면 끝까지 붙는 전체 폭 바 (Instagram 구버전 스타일) — 오해로 한 번 만들었다가 "알약 형태로 떠 있어야 한다"는 피드백으로 되돌림.
- ❌ 인디케이터를 고정 크기 원(28px)으로 — 세그먼트 폭을 따르는 캡슐이 맞는 방향으로 확인되어 폐기.
- ❌ 데스크톱 탭 라벨을 활성 상태에서만 펼치기 — 비활성 탭이 아이콘만 남아 뭔지 알 수 없다는 문제로 항상 라벨 표시로 변경.
- ❌ 별도 검색 캡슐(듀얼 캡슐 구조) — DualCapsuleTabBar 참고 초기 버전엔 있었으나 이후 단일 캡슐 구조로 단순화됨.
