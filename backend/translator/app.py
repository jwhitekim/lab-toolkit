"""Translation Studio — FastAPI + Claude API"""
import asyncio
import logging
import os

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import StreamingResponse, JSONResponse
from pathlib import Path
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent.parent / ".env")

app = FastAPI(title="Translation Studio")

CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL_SMART", "claude-sonnet-4-6")
_client = anthropic.AsyncAnthropic()

_supabase_url = os.environ.get("SUPABASE_URL")
_supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
_supabase = None
if _supabase_url and _supabase_key:
    from supabase import create_client
    _supabase = create_client(_supabase_url, _supabase_key)

# Context Layer 1: Role & Domain
_SYSTEM_PROMPT = """\
당신은 머신러닝 분야 박사과정 연구자이자 학술 번역가입니다.
영어 ML/DL/CV/NLP 논문을 한국어로 번역하며, 독자는 같은 분야의
한국인 대학원생입니다. 그들이 원문 없이도 자연스럽게 읽을 수 있는
한국어 학술 문체로 번역합니다."""

# Context Layer 2: Constraint Rules
_RULES = """\
원문 보존 (절대 번역하지 말 것):
  - 수식·변수·기호: ∇L, θ, x_i, R^d 등
  - 고유명사: 모델명, 데이터셋명, 인용 키 (BERT, ImageNet, [12] 등)
  - 코드 식별자: 함수명, 클래스명

병기 또는 영어 유지:
  - 정착 용어는 한국어(영어) 병기: 어텐션(attention), 임베딩(embedding)
  - 영어 그대로 유지: fine-tuning, transformer, encoder, decoder,
    token, layer, weight, bias, gradient, loss, batch, epoch,
    inference, prompt, dropout, downstream

문체:
  - 자연스러운 한국어 흐름 우선, 직역체·번역체 금지
  - 명사형 종결 선호 (~함, ~됨, ~임)
  - 원문의 문단·줄바꿈 구조 유지
  - 원문에 없는 내용 추가 금지, 빠뜨리지 말 것

피해야 할 것 (BAD):
  - "우리는 ~를 제안한다" 식의 어색한 직역
    → "본 논문에서는 ~를 제안한다"
  - 용어를 음역만 하고 의미 없이 두는 것
    → 정착 번역어가 있으면 그것을 사용

출력: 번역문만. 설명·접두어·따옴표 없이."""

# Context Layer 3: Few-shot examples
_EXAMPLES = """\
EXAMPLE_1 (단정문 + 용어 병기):
  input:  "We propose a novel attention mechanism that captures long-range dependencies."
  output: "본 논문에서는 장거리 의존성을 포착하는 새로운 어텐션(attention) 메커니즘을 제안한다."

EXAMPLE_2 (영어 유지 + 고유명사 보존):
  input:  "The model is fine-tuned on downstream tasks using LoRA, following BERT."
  output: "해당 모델은 BERT를 따라 LoRA를 활용하여 downstream 태스크에 fine-tuning된다."

EXAMPLE_3 (수식 보존):
  input:  "Let x ∈ R^d be the input embedding and θ denote the parameters."
  output: "x ∈ R^d를 입력 임베딩(input embedding), θ를 파라미터라 하자."

EXAMPLE_4 (긴 복문 + 명사형 종결):
  input:  "While prior work focuses on accuracy, we argue that efficiency is equally critical, and we demonstrate this through extensive experiments on three benchmarks."
  output: "기존 연구가 정확도에 초점을 맞추는 반면, 본 논문에서는 효율성 또한 동등하게 중요함을 주장하며, 세 가지 벤치마크에 대한 광범위한 실험을 통해 이를 입증한다."

EXAMPLE_5 (수동태 → 자연스러운 능동 흐름):
  input:  "It has been shown that dropout reduces overfitting."
  output: "dropout이 과적합을 줄인다는 점은 기존 연구에서 입증된 바 있다." """

class TranslateRequest(BaseModel):
    text: str


@app.post("/api/translate")
async def translate(req: TranslateRequest):
    text = req.text.strip()
    if not text:
        return JSONResponse({"error": "텍스트가 비어 있습니다."}, status_code=400)

    # Cache check
    if _supabase:
        try:
            cached_res = await asyncio.to_thread(
                lambda: _supabase.table("translation_history")
                    .select("translated_text")
                    .eq("source_text", text)
                    .limit(1)
                    .execute()
            )
            if cached_res.data:
                cached_text = cached_res.data[0]["translated_text"]

                async def cached_stream():
                    yield cached_text

                return StreamingResponse(
                    cached_stream(),
                    media_type="text/plain; charset=utf-8",
                    headers={"X-Cache": "HIT"},
                )
        except Exception:
            pass

    collected: list[str] = []

    async def stream():
        try:
            async with _client.messages.stream(
                model=CLAUDE_MODEL,
                max_tokens=4096,
                system=f"{_SYSTEM_PROMPT}\n\n{_RULES}",
                messages=[{"role": "user", "content": f"{_EXAMPLES}\n\nINPUT:\n{text}"}],
            ) as s:
                async for chunk in s.text_stream:
                    collected.append(chunk)
                    yield chunk
        except asyncio.CancelledError:
            raise
        except Exception:
            logging.exception("translate stream error")
            if not collected:
                yield "번역 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
            return

        if _supabase:
            try:
                full_text = "".join(collected)
                await asyncio.to_thread(
                    lambda: _supabase.table("translation_history").insert({
                        "source_text": text,
                        "translated_text": full_text,
                        "type": "sentence",
                    }).execute()
                )
            except Exception:
                pass

    return StreamingResponse(stream(), media_type="text/plain; charset=utf-8")


@app.get("/api/history")
async def get_translation_history(count: bool = False):
    if not _supabase:
        return JSONResponse({"count": 0} if count else {"items": []})
    try:
        if count:
            res = await asyncio.to_thread(
                lambda: _supabase.table("translation_history").select("id", count="exact").execute()
            )
            return JSONResponse({"count": res.count or 0})
        res = await asyncio.to_thread(
            lambda: _supabase.table("translation_history")
                .select("id,source_text,translated_text,type,created_at")
                .order("created_at", desc=True)
                .limit(10)
                .execute()
        )
        return JSONResponse({"items": res.data})
    except Exception:
        return JSONResponse({"count": 0} if count else {"items": []})


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
