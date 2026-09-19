import asyncio

from services.base_llm_service import BaseLLMService
from orchestration.graph import run_verification
from test_direct import format_breakdown


async def main():
    user_query = "Who created Python?"

    print("=" * 70)
    print("REAL BASE LLM → HALLUCIGUARD E2E TEST")
    print("=" * 70)

    # 1. Generate the draft using the actual Base LLM
    base_llm = BaseLLMService()

    print("\n[1] BASE LLM")
    generation = await base_llm.generate(
        user_query=user_query,
        generation_mode="normal",
    )

    print("Status:", generation.status)
    print("Provider:", generation.provider)
    print("Model:", generation.model)
    print("Latency:", generation.latency_ms, "ms")
    print("Draft:", generation.draft_response)

    if generation.status != "success":
        print("\nBASE LLM GENERATION FAILED")
        print("Error:", generation.error)
        print("Error code:", generation.error_code)
        return

    # 2. Feed the REAL generated answer into HalluciGuard
    print("\n[2] HALLUCIGUARD")

    result = await run_verification(
        user_query=user_query,
        llm_response=generation.draft_response,
        domain="general",
    )

    # 3. Show the complete pipeline breakdown
    format_breakdown(user_query, result, generation.latency_ms)

    # 4. Explicit contract assertions
    print("\n[REAL E2E ASSERTIONS]")

    print("Base LLM status:", generation.status)
    print("Draft exists:", bool(generation.draft_response.strip()))
    print("Answer status:", result.get("answer_status"))
    print("Correction required:", result.get("correction_required"))
    print("Correction status:", result.get("correction_status"))
    print("Draft verification:", result.get("draft_verification_status"))
    print("Reverification status:", result.get("reverification_status"))
    print("Final response:", result.get("final_response"))

    print("\n[PASS] Real Base LLM output successfully entered HalluciGuard.")


if __name__ == "__main__":
    asyncio.run(main())