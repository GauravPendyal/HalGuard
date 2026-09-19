from __future__ import annotations

import logging
import urllib.parse
from typing import List
from bs4 import BeautifulSoup

from schemas.models import Passage, AdapterMetadata
from utils.http_client import get_client

logger = logging.getLogger(__name__)

class GeneralAdapter:
    def __init__(self) -> None:
        self.name = "general"

    @property
    def metadata(self) -> AdapterMetadata:
        return AdapterMetadata(
            name=self.name,
            version="1.0.0",
            supported_domains=["wikipedia"],
            supports_live_search=True,
            cacheable=True,
            priority=5,
            max_results=50,
            is_stub=False
        )

    def credibility_of(self, source_id: str) -> float:
        return 0.80

    def _clean_query(self, query: str) -> str:
        import re
        clean = re.sub(r'[*#_`]', '', query or '')
        clean = re.sub(r'[\r\n\t]+', ' ', clean).strip()
        words = clean.split()
        if len(words) > 25:
            clean = " ".join(words[:25])
        return clean[:200]

    async def _fetch_page_summary(self, client: object, title: str) -> str:
        """Fetch the clean lead extract from Wikipedia REST summary API."""
        try:
            title_url = urllib.parse.quote(title.replace(' ', '_'), safe='')
            res = await client.get(
                f"https://en.wikipedia.org/api/rest_v1/page/summary/{title_url}",
                adapter_name=self.name,
                headers={"User-Agent": "HalluciGuard/2.0 (compliance@halluciguard.ai)"},
            )
            data = res.json()
            extract = data.get("extract", "")
            if extract and len(extract.strip()) > 30:
                return extract.strip()
        except Exception:
            pass
        return ""

    async def _fetch_page_sections(self, client: object, title: str, claim: str) -> List[Tuple[str, str]]:
        """Fetch deep section text from Wikipedia Action API for entity/relation verification."""
        try:
            res = await client.get(
                "https://en.wikipedia.org/w/api.php",
                adapter_name=self.name,
                params={
                    "action": "query",
                    "prop": "extracts",
                    "explaintext": "1",
                    "titles": title,
                    "format": "json",
                    "redirects": "1",
                },
                headers={"User-Agent": "HalluciGuard/2.0 (compliance@halluciguard.ai)"},
            )
            data = res.json()
            pages = data.get("query", {}).get("pages", {})
            for _, pdata in pages.items():
                extract = pdata.get("extract", "")
                if not extract:
                    continue

                import re
                stopwords = {
                    "is", "the", "a", "an", "in", "of", "to", "and", "or", "for",
                    "with", "that", "this", "from", "was", "were", "been", "have",
                    "has", "had", "by", "on", "at", "as", "he", "she", "it", "his", "her"
                }
                claim_tokens = [
                    w.lower() for w in re.findall(r"[a-zA-Z0-9]+", claim)
                    if len(w) > 2 and w.lower() not in stopwords and not (w.isdigit() and len(w) == 4)
                ]

                sections: List[Tuple[str, str]] = []
                current_heading = "Overview"
                current_lines: List[str] = []

                for line in extract.split("\n"):
                    line = line.strip()
                    if not line:
                        continue
                    m = re.match(r"^={2,5}\s*(.+?)\s*={2,5}$", line)
                    if m:
                        if current_lines:
                            full_section_text = " ".join(current_lines)
                            overlap = sum(1 for t in claim_tokens if t in full_section_text.lower())
                            is_rel_section = any(
                                s in current_heading.lower()
                                for s in ("early life", "family", "personal life", "biography", "background", "career", "geography", "history", "founding", "creation", "parent", "origin", "development", "developer", "designer", "author")
                            )
                            if (overlap >= 1 or is_rel_section) and len(full_section_text) > 40:
                                sentences = re.split(r"(?<=[.!?])\s+", full_section_text)
                                chunk = ""
                                for sent in sentences:
                                    if len(chunk) + len(sent) < 600:
                                        chunk = f"{chunk} {sent}".strip()
                                    else:
                                        if chunk:
                                            sections.append((current_heading, chunk))
                                        chunk = sent
                                if chunk and len(chunk) > 30:
                                    sections.append((current_heading, chunk))
                            current_lines = []
                        current_heading = m.group(1).strip()
                    else:
                        current_lines.append(line)

                if current_lines:
                    full_section_text = " ".join(current_lines)
                    overlap = sum(1 for t in claim_tokens if t in full_section_text.lower())
                    is_rel_section = any(
                        s in current_heading.lower()
                        for s in ("early life", "family", "personal life", "biography", "background", "career", "geography", "history", "founding", "creation", "parent", "origin", "development", "developer", "designer", "author")
                    )
                    if (overlap >= 1 or is_rel_section) and len(full_section_text) > 40:
                        sentences = re.split(r"(?<=[.!?])\s+", full_section_text)
                        chunk = ""
                        for sent in sentences:
                            if len(chunk) + len(sent) < 600:
                                chunk = f"{chunk} {sent}".strip()
                            else:
                                if chunk:
                                    sections.append((current_heading, chunk))
                                chunk = sent
                        if chunk and len(chunk) > 30:
                            sections.append((current_heading, chunk))

                # Sort sections: high-overlap / history / creation / family / attribution first
                def _section_priority(sec: Tuple[str, str]) -> int:
                    h, c = sec
                    h_lower = h.lower()
                    c_lower = c.lower()
                    score = sum(1 for t in claim_tokens if t in c_lower) * 2
                    if any(k in h_lower for k in ("history", "creation", "origin", "founding", "development", "background", "early life", "family", "personal life", "parent", "developer", "designer", "author")):
                        score += 5
                    if any(term in c_lower for term in ("designed by", "created by", "developed by", "founded by", "invented by", "authored by", "initiated by", "started by", "written by")):
                        score += 5
                    return -score

                sections.sort(key=_section_priority)
                return sections
        except Exception as e:
            logger.warning(f"Wikipedia deep section extraction failed for '{title}': {e}")
        return []

    @staticmethod
    def _is_noisy_title(title: str, query: str, description: str = "") -> bool:
        """Filter out bibliographies/discographies/albums/songs/entertainment titles unless requested in the claim."""
        t_lower = title.lower()
        q_lower = query.lower()
        d_lower = (description or "").lower()

        entertainment_tags = (
            "bibliography", "discography", "filmography", "list of songs", "list of",
            "(album)", "(song)", "(film)", "(soundtrack)", "(tv series)", "(single)",
            "(band)", "(video game)", "(novel)", "(short story)", "(play)"
        )
        for noise in entertainment_tags:
            if noise in t_lower and noise not in q_lower:
                return True

        # Check description tag from Wikipedia search API
        if d_lower:
            for desc_noise in ("studio album", "song by", "film directed by", "television series", "single by", "band"):
                if desc_noise in d_lower and desc_noise not in q_lower:
                    return True

        return False

    async def search(self, query: str, k: int = 5, **kwargs) -> List[Passage]:
        passages: List[Passage] = []
        cleaned_q = self._clean_query(query)
        if not cleaned_q:
            return passages

        client = get_client()
        headers = {"User-Agent": "HalluciGuard/2.0 (compliance@halluciguard.ai)"}

        candidate_pages = []

        # Primary: Wikipedia REST search endpoint
        try:
            res = await client.get(
                "https://en.wikipedia.org/w/rest.php/v1/search/page",
                adapter_name=self.name,
                params={"q": cleaned_q, "limit": k},
                headers=headers,
            )
            candidate_pages = res.json().get("pages", [])
        except Exception as e:
            logger.warning(f"Wikipedia REST search failed for '{cleaned_q}': {e}. Trying Action API.")

        # Fallback: MediaWiki Action API
        if not candidate_pages:
            try:
                res = await client.get(
                    "https://en.wikipedia.org/w/api.php",
                    adapter_name=self.name,
                    params={
                        "action": "query",
                        "list": "search",
                        "srsearch": cleaned_q,
                        "format": "json",
                        "srlimit": max(k, 5),
                    },
                    headers=headers,
                )
                candidate_pages = res.json().get("query", {}).get("search", [])
            except Exception as e:
                logger.error(f"Failed general search fallback: {e}")
                return []

        import re
        stopwords = {
            "is", "the", "a", "an", "in", "of", "to", "and", "or", "for",
            "with", "that", "this", "from", "was", "were", "been", "have",
            "has", "had", "by", "on", "at", "as"
        }
        claim_terms = [
            w.lower() for w in re.findall(r"[a-zA-Z0-9]+", query)
            if len(w) > 2 and w.lower() not in stopwords and not (w.isdigit() and len(w) == 4)
        ]

        # Process candidates and fetch lead extracts
        for item in candidate_pages:
            title = item.get("title", "Wikipedia Article")
            description = item.get("description", "")
            if self._is_noisy_title(title, query, description):
                continue

            snippet_html = item.get("excerpt", "") or description or item.get("snippet", "")
            fallback_snippet = BeautifulSoup(snippet_html, "html.parser").get_text().strip()
            
            # Fetch authoritative lead paragraph
            summary_extract = await self._fetch_page_summary(client, title)
            final_snippet = summary_extract or fallback_snippet
            if not final_snippet or len(final_snippet.strip()) < 10:
                continue

            title_url = urllib.parse.quote(title.replace(' ', '_'), safe='')
            lead_passage = Passage(
                title=f"Wikipedia: {title}",
                source="wikipedia",
                url=f"https://en.wikipedia.org/wiki/{title_url}",
                publication_date="unknown",
                snippet=f"Article [{title}]: {final_snippet[:600]}",
                source_id=f"wiki_{title_url.lower()}",
                relevance_score=0.0,
                source_confidence_hint=0.85 if summary_extract else 0.70,
            )
            passages.append(lead_passage)

            # Check if lead summary misses key claim relation terms (e.g. father, parent, born, location, capital)
            lead_lower = final_snippet.lower()
            missing_terms = [t for t in claim_terms if t not in lead_lower]
            if missing_terms:
                # Deep retrieval: fetch relevant sections
                deep_sections = await self._fetch_page_sections(client, title, query)
                for section_name, section_text in deep_sections[:3]:
                    sec_passage = Passage(
                        title=f"Wikipedia: {title} ({section_name})",
                        source="wikipedia",
                        url=f"https://en.wikipedia.org/wiki/{title_url}#{urllib.parse.quote(section_name.replace(' ', '_'))}",
                        publication_date="unknown",
                        snippet=f"Section [{title} - {section_name}]: {section_text[:600]}",
                        source_id=f"wiki_{title_url.lower()}_{section_name.lower().replace(' ', '_')}",
                        relevance_score=0.0,
                        source_confidence_hint=0.80,
                    )
                    passages.append(sec_passage)

            if len(passages) >= k * 2:
                break

        return passages[:max(k, 8)]
