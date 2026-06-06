---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git push:*), Bash(git branch:*), Bash(python bump.py:*)
description: 버전 범프 후 변경사항 커밋 및 푸시
---

## 현재 상태
- 브랜치: !`git branch --show-current`
- git status: !`git status`
- git diff: !`git diff HEAD`

## 실행 순서
1. 위 변경사항을 분석하여 버전 범프 수준 판단
   - feat (새 기능) → minor
   - fix / refactor / style / docs / chore → patch
   - 하위 호환 불가 변경 → major
2. dev 브랜치인 경우에만 `python bump.py <major|minor|patch>` 실행
3. Conventional Commit 형식으로 메시지 생성 (한국어)
4. `git add -A`
5. `git commit -m "<생성된 메시지>"`
6. `git push origin <현재 브랜치>`
7. 각 단계 성공/실패 여부 보고

## 주의사항
- 변경사항이 없으면 커밋하지 말고 알려줄 것
- push 실패 시 원인 분석 후 보고할 것
- .env 파일이 staged 되어 있으면 즉시 중단하고 경고할 것
- 현재 브랜치가 main이면 즉시 중단하고 경고할 것:
  "main 브랜치에서는 직접 푸시하지 않습니다. dev → main은 PR로 머지해주세요."
- 버전 범프(bump.py)는 dev 브랜치에서만 실행할 것