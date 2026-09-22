from __future__ import annotations
import logging
from typing import List, Tuple, Optional
import numpy as np

from schemas.models import Passage
from models.model_manager import get_model_manager

class DenseRetriever:
    """Dense retriever using sentence-transformers and FAISS."""

    def __init__(self, model_name: str = 'BAAI/bge-m3') -> None:
        self.model_name = model_name
        self.model = None
        self.index = None
        self.passages: List[Passage] = []
        self._is_available = True
        self._index_built = False
        
    def _load_model(self) -> None:
        if self.model is not None or not self._is_available:
            return
            
        try:
            self.model = get_model_manager().load_embedding_model(self.model_name)
        except ImportError:
            logging.warning("sentence_transformers not installed. DenseRetriever falling back.")
            self._is_available = False
        except Exception as e:
            # The most common cause of the cryptic "'NoneType' object has no attribute
            # 'endswith'" here is that the embedding model is not present in the local
            # HuggingFace cache while ALLOW_MODEL_DOWNLOADS is false: sentence-transformers'
            # snapshot resolution returns None for the model path, then calls .endswith on it.
            # This is a RECALL degradation (dense/semantic retrieval is skipped; sparse BM25
            # + lexical + cross-encoder reranking still run), not a correctness corruption.
            is_none_path = isinstance(e, AttributeError) and "endswith" in str(e)
            if is_none_path:
                logging.warning(
                    "Dense model '%s' could not be resolved locally (likely not cached and "
                    "ALLOW_MODEL_DOWNLOADS is false). Falling back to sparse+rerank retrieval "
                    "(reduced semantic recall). Set ALLOW_MODEL_DOWNLOADS=true or pre-cache the "
                    "model to restore dense retrieval. Underlying error: %s",
                    self.model_name,
                    e,
                )
            else:
                logging.warning(f"Error loading dense model {self.model_name}: {e}. Falling back.")
            self._is_available = False

    def build_index(self, passages: List[Passage]) -> None:
        """
        Encode snippets and build FAISS IndexFlatIP.
        
        Args:
            passages: List of Passage objects to index.
        """
        self._load_model()
        self.passages = passages
        
        if not self._is_available or not self.passages:
            return
            
        try:
            import faiss
            
            texts = [p.snippet for p in passages]
            embeddings = self.model.encode(
                texts,
                batch_size=32,
                convert_to_numpy=True,
                normalize_embeddings=True,
            )
            
            dim = embeddings.shape[1]
            self.index = faiss.IndexFlatIP(dim)
            self.index.add(embeddings)
            self._index_built = True
            logging.info("Built FAISS index with %d passages, dim=%d", len(passages), dim)
            
        except ImportError:
            logging.warning("FAISS not available. Dense retrieval disabled for this request.")
            self._is_available = False

    def retrieve(self, query: str, k: int) -> List[Tuple[Passage, float]]:
        """
        Encode query and search FAISS for top k passages.
        
        Args:
            query: The search query.
            k: Number of passages to retrieve.
            
        Returns:
            List of tuples containing (Passage, score).
        """
        self._load_model()
        if not self._is_available or self.index is None or not self.passages:
            if self.index is None:
                logging.debug("Dense retrieval skipped: no index available")
            return []
            
        query_embedding = self.model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
        
        scores, indices = self.index.search(query_embedding, min(k, len(self.passages)))
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1:
                results.append((self.passages[idx], float(scores[0][i])))
                
        return results
