from __future__ import annotations
import pytest
from claims import ClaimDecomposer, ClaimNormalizer, ClaimMerger

def test_decompose_compound_claim():
    decomposer = ClaimDecomposer()
    sub_claims = decomposer.decompose("Vitamin C cures cancer and diabetes")
    assert len(sub_claims) >= 2

def test_decompose_atomic_claim():
    decomposer = ClaimDecomposer()
    sub_claims = decomposer.decompose("Vitamin C cures cancer")
    assert len(sub_claims) == 1

def test_decompose_semicolon():
    decomposer = ClaimDecomposer()
    sub_claims = decomposer.decompose("A is true; B is false")
    assert len(sub_claims) == 2

def test_normalize_claim():
    normalizer = ClaimNormalizer()
    text = "   This is a   claim.  "
    normalized = normalizer.normalize(text)
    assert normalized == "this is a claim."


def test_merger():
    merger = ClaimMerger()
    # Mock some sub-claim results to test the merge logic
    merged = merger.merge([{"verdict": "VERIFIED"}, {"verdict": "UNVERIFIABLE"}])
    assert merged is not None


# ---------------------------------------------------------------------------
# Focused claim-decomposition regression tests (fragment fix).
# ---------------------------------------------------------------------------
_FRAGMENTS = {
    "it is", "a major technological", "commercial hub in south india",
    "that's correct", "and commercial hub in south india", "it",
}


def _assert_no_fragments(claims):
    """Every claim must be a complete proposition, not a fragment."""
    for c in claims:
        norm = c.strip().lower().rstrip(".")
        assert norm not in _FRAGMENTS, f"fragment emitted: {c!r}"
        assert len(norm.split()) >= 3, f"too short to be a proposition: {c!r}"
        assert not norm.split()[0] in {"and", "but", "or", "also"}, f"leading conjunction: {c!r}"


def test_decompose_strips_conversational_prefix():
    """TEST 1 — conversational prefix removal."""
    decomposer = ClaimDecomposer()
    claims = decomposer.decompose("That's correct! Paris is the capital of France.")
    assert len(claims) == 1
    assert "paris is the capital of france" in claims[0].lower()
    joined = " ".join(claims).lower()
    assert "that's correct" not in joined and "correct!" not in joined
    _assert_no_fragments(claims)


def test_decompose_resolves_pronoun_subject():
    """TEST 2 — pronoun resolution; no bare 'It is' fragment."""
    decomposer = ClaimDecomposer()
    claims = decomposer.decompose(
        "Hyderabad is the capital of Telangana. It is also a major city."
    )
    assert len(claims) == 2
    _assert_no_fragments(claims)
    # 'It' resolved to the concrete subject from the prior sentence.
    assert any("hyderabad" in c.lower() and "major city" in c.lower() for c in claims)


def test_decompose_preserves_compound_predicate():
    """TEST 3 — compound predicate/modifier stays a single claim (no split on 'and')."""
    decomposer = ClaimDecomposer()
    claims = decomposer.decompose(
        "Hyderabad is a major technological and commercial hub in South India."
    )
    assert len(claims) == 1
    assert "technological and commercial hub" in claims[0].lower()
    _assert_no_fragments(claims)


def test_decompose_multiple_factual_sentences():
    """TEST 4 — multiple factual sentences become multiple complete claims."""
    decomposer = ClaimDecomposer()
    claims = decomposer.decompose(
        "Paris is the capital of France. The Eiffel Tower is located in Paris."
    )
    assert len(claims) == 2
    joined = " ".join(claims).lower()
    assert "paris is the capital of france" in joined
    assert "eiffel tower" in joined
    _assert_no_fragments(claims)


def test_decompose_rejects_fragments_on_live_input():
    """TEST 5 — the live Hyderabad response yields only complete propositions."""
    decomposer = ClaimDecomposer()
    claims = decomposer.decompose(
        "That's correct! Hyderabad is the capital city of Telangana. "
        "It is also a major technological and commercial hub in South India."
    )
    assert len(claims) == 2
    _assert_no_fragments(claims)
    # The compound predicate is preserved intact within its claim.
    assert any("technological and commercial hub" in c.lower() for c in claims)


def test_decompose_preserves_trailing_dates_and_numbers():
    """Regression test: verify trailing dates and numbers are not treated as numbered list markers."""
    decomposer = ClaimDecomposer()
    claims = decomposer.decompose(
        "Python was created by Guido van Rossum. Python was first released in 1991. Elon Musk created Java."
    )
    assert len(claims) == 3
    assert any("1991" in c for c in claims)
    assert any("Python was first released in 1991" in c for c in claims)


def test_decompose_preserves_decimals_and_percentages():
    decomposer = ClaimDecomposer()
    claims_dec = decomposer.decompose("The value is 3.14.")
    assert len(claims_dec) == 1
    assert "3.14" in claims_dec[0]

    claims_pct = decomposer.decompose("The model achieved 92.45% accuracy.")
    assert len(claims_pct) == 1
    assert "92.45%" in claims_pct[0]
