from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

import asyncio
from orchestration.graph import run_verification
from test_direct import format_breakdown

async def main():
    user_query = "Tell me about the creation and early history of Python."

    draft_answer = (
        "Python was created by Guido van Rossum. "
        "Python was first released in 1991. "
        "Elon Musk created Java."
    )

    result = await run_verification(
        user_query=user_query,
        llm_response=draft_answer,
        domain="general",
    )

    format_breakdown(user_query, result, 0)

    print("\n[SCENARIO E ASSERTIONS]")
    print("Extracted claims:", result.get("extracted_claims"))
    print("Answer status:", result.get("answer_status"))
    print("Correction required:", result.get("correction_required"))
    print("Correction status:", result.get("correction_status"))
    print("Draft verification:", result.get("draft_verification_status"))
    print("Reverification status:", result.get("reverification_status"))
    print("Final response:", result.get("final_response"))

if __name__ == "__main__":
    asyncio.run(main())
