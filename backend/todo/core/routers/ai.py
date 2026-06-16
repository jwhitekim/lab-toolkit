import json
import logging
import os
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from supabase import Client
import anthropic
from backend.database import get_supabase
import schemas

router = APIRouter(prefix="/api/ai", tags=["ai"])

# ── Context Layer 1 + 2: Role & Rules
_STEPS_SYSTEM = """\
<role>
AI/ML 연구실 업무를 세부 작업 단위로 분해하는 연구 보조자.
</role>

<task>
입력된 TODO를 실제 연구 작업 흐름 기준으로
집중 가능한 단위의 step으로 분해한다.
</task>

<constraints>
- step 수: 3~5개
- 단순 작업은 3개 수준 유지
- 각 step은 30~90분 내 완료 가능해야 함
- "동사 + 구체 목적어" 형태로 작성
- 논리적 선후 관계 기준으로 정렬
- 병렬 가능한 작업은 묶을 수 있음
- 불필요한 준비 단계 금지
</constraints>

<style>
- 한국어
- concise
- actionable
- 추상 표현 금지
</style>

<output_contract>
JSON만 출력:
{"steps": ["...", "..."]}
</output_contract>
"""

_STRATEGY_SYSTEM = """\
<role>
AI/ML 연구실 일정 우선순위를 조언하는 연구 스케줄 보조자.
</role>

<task>
현재 TODO의 priority와 deadline을 고려하여,
언제 시작하면 좋은지 한 문장으로 조언한다.
</task>

<constraints>
- 한 문장만 출력
- 다른 작업과의 우선순위 관계 언급
- 시작 시점 또는 시간대 제안 포함
- 추상 조언 금지
- 현실적인 일정 감각 유지
</constraints>

<style>
- 한국어
- friendly
- concise
- concrete
</style>

<output_contract>
한 문장 텍스트만 출력.
</output_contract>
"""

# ── Context Layer 3: Few-shot
_STEPS_EXAMPLES = """\
EXAMPLE_1:
  input:  TODO="Transformer 논문 리뷰" / PRIORITY=mid / DEADLINE=2일
  output: {"steps": [
    "논문의 레퍼런스 및 관련 작업 조사",
    "논문 전체 읽기 및 주요 아이디어 요약",
    "세부 내용 분석 및 이해",
    "논문과 기존 연구 비교 및 비판적 평가",
    "리뷰 작성 및 피드백 수집"
  ]}

EXAMPLE_2:
  input:  TODO="실험 코드 디버깅" / PRIORITY=urgent / DEADLINE=오늘
  output: {"steps": [
    "에러 로그 분석하여 문제 원인 파악",
    "문제가 발생하는 코드 부분 식별",
    "해당 코드 부분 수정 및 테스트",
    "수정한 코드로 전체 실험 실행하여 문제 해결 확인"
  ]}"""



def get_anthropic():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")
    return anthropic.Anthropic(api_key=api_key)


@router.post("/generate-steps")
def generate_steps(req: schemas.GenerateStepsRequest):
    client = get_anthropic()
    message = client.messages.create(
        model=os.getenv("CLAUDE_MODEL_FAST", "claude-haiku-4-5-20251001"),
        max_tokens=512,
        system=f"{_STEPS_SYSTEM}\n\n{_STEPS_EXAMPLES}",
        messages=[{"role": "user", "content": (
            f"TODO: {req.todo_name}\n"
            f"MEMO: {req.memo or '없음'}\n"
            f"PRIORITY: {req.priority}\n"
            f"DEADLINE: {req.deadline or '미정'}"
        )}],
    )
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {raw}")


def _write_steps_to_db(todo_id: int, steps: list[str], sb: Client) -> None:
    for i, step in enumerate(steps):
        sb.table("steps").insert({
            "todo_id": todo_id,
            "text":    step,
            "order_index": i,
            "done":    False,
        }).execute()


def _run_generate_steps(req: schemas.GenerateStepsRequest) -> None:
    sb = get_supabase()
    try:
        client = get_anthropic()
        message = client.messages.create(
            model=os.getenv("CLAUDE_MODEL_FAST", "claude-haiku-4-5-20251001"),
            max_tokens=512,
            system=f"{_STEPS_SYSTEM}\n\n{_STEPS_EXAMPLES}",
            messages=[{"role": "user", "content": (
                f"TODO: {req.todo_name}\n"
                f"MEMO: {req.memo or '없음'}\n"
                f"PRIORITY: {req.priority}\n"
                f"DEADLINE: {req.deadline or '미정'}"
            )}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        steps = json.loads(raw).get("steps", [])
        _write_steps_to_db(req.todo_id, steps, sb)
    except Exception:
        logging.exception("Background step generation failed for todo_id=%s", req.todo_id)


@router.post("/generate-steps-async")
def generate_steps_async(
    req: schemas.GenerateStepsRequest,
    background_tasks: BackgroundTasks,
):
    if req.todo_id is None:
        raise HTTPException(status_code=422, detail="todo_id required for async generation")
    background_tasks.add_task(_run_generate_steps, req)
    return {"status": "generating"}


@router.post("/generate-strategy")
def generate_strategy(req: schemas.GenerateStrategyRequest, sb: Client = Depends(get_supabase)):
    client = get_anthropic()

    res = sb.table("todos").select("name").eq("id", req.todo_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Todo not found")
    target_name = res.data["name"]

    # 클라이언트 제공 데이터 대신 DB에서 직접 조회
    all_todos = sb.table("todos").select("name, priority, deadline, done").eq("done", False).execute()
    todos_text = "\n".join(
        f"- [{t['priority']}] {t['name']} (마감: {t.get('deadline') or '미정'})"
        for t in (all_todos.data or [])
    )

    message = client.messages.create(
        model=os.getenv("CLAUDE_MODEL_FAST", "claude-haiku-4-5-20251001"),
        max_tokens=256,
        system=_STRATEGY_SYSTEM,
        messages=[{"role": "user", "content": (
            f"ALL_TODOS:\n{todos_text}\n\n"
            f"TARGET: {target_name}"
        )}],
    )
    strategy = message.content[0].text.strip()

    sb.table("todos").update({"ai_strategy": strategy}).eq("id", req.todo_id).execute()

    updated = sb.table("todos").select("*, steps(*)").eq("id", req.todo_id).single().execute()
    todo = updated.data
    todo["steps"] = sorted(todo.get("steps") or [], key=lambda s: s["order_index"])
    return todo
