import asyncio
from dotenv import load_dotenv

load_dotenv()

from services.openrouter_corrector import OpenRouterCorrectorGenerator


async def main():
    generator = OpenRouterCorrectorGenerator()

    print("Configured Corrector model:", generator.model)

    system_text = """You are a sentence-level factual correction agent.

Correct only the hallucinated claim using the supplied evidence.
Return ONLY the corrected sentence.
Do not explain your reasoning.
Do not add extra information."""

    prompt_text = """Original sentence:
Python was created by Elon Musk in 1999.

Evidence:
Wikipedia: Python was created by Guido van Rossum and first released in 1991.

Task:
Correct the original sentence using the evidence."""

    try:
        result = generator.generate(
            system_text=system_text,
            prompt_text=prompt_text,
        )

        print("\n=== RESULT ===")
        print(result)

    except Exception as exc:
        print("\n=== GENERATION FAILED ===")
        print(type(exc).__name__)
        print(str(exc))


if __name__ == "__main__":
    asyncio.run(main())