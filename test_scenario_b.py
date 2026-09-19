import asyncio
from orchestration.graph import run_verification
from test_direct import format_breakdown

async def main():
    user_query = "Who created Python?"
    draft_answer = "Python was created by Guido van Rossum."

    result = await run_verification(
        user_query=user_query,
        llm_response=draft_answer,
        domain="general",
    )

    format_breakdown(user_query, result, 0)

    print("\n[SCENARIO B ASSERTIONS]")
    print("Answer status:", result.get("answer_status"))
    print("Correction required:", result.get("correction_required"))
    print("Correction status:", result.get("correction_status"))
    print("Draft verification:", result.get("draft_verification_status"))
    print("Reverification status:", result.get("reverification_status"))
    print("Final response:", result.get("final_response"))

if __name__ == "__main__":
    asyncio.run(main())
