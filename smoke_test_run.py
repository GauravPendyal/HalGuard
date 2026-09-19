import asyncio
import os
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

verifier_dir = ROOT_DIR / "agents" / "verifier_agent"
if str(verifier_dir) not in sys.path:
    sys.path.insert(0, str(verifier_dir))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from orchestration.graph import run_verification
from test_direct import format_breakdown

async def main():
    user_query = "Who created Python?"
    draft_answer = "Python was created by Elon Musk in 1999."
    
    print("=" * 80)
    print("RUNNING LIVE END-TO-END SMOKE TEST")
    print(f"User Query:    {user_query}")
    print(f"Draft Answer:  {draft_answer}")
    print("=" * 80)

    t0 = time.time()
    result = await run_verification(
        user_query=user_query,
        llm_response=draft_answer,
        domain="general",
    )
    total_time = time.time() - t0
    format_breakdown(user_query, result, total_time)

    # Validate state keys
    print("\n[SMOKE TEST ASSERTIONS]")
    print(f"Extracted claims:      {result.get('extracted_claims')}")
    print(f"Answer status:         {result.get('answer_status')}")
    print(f"Correction req:        {result.get('correction_required')}")
    print(f"Draft Verif stat:      {result.get('draft_verification_status')}")
    print(f"Correction stat:       {result.get('correction_status')}")
    print(f"Pipeline Verif stat:   {result.get('verification_status')}")
    print(f"Persisted fact IDs:    {result.get('persisted_fact_ids') or result.get('memory', {}).get('persisted_fact_ids')}")
    print(f"Final response:        {result.get('final_response')}")

if __name__ == "__main__":
    asyncio.run(main())
