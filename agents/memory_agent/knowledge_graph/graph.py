from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import networkx as nx

from ..schemas.models import (
    Edge,
    EntityImportance,
    EntityType,
    EntityNode,
    GraphAnalytics,
    KnowledgeGraphStats,
    RelationType,
)

logger = logging.getLogger(__name__)


class KnowledgeGraph:
    """NetworkX-backed knowledge graph for storing verified facts."""

    def __init__(
        self,
        persistence_path: str = "data/knowledge_graph.json",
        max_nodes: int = 100_000,
        weight_decay: float = 0.95,
    ):
        self._graph = nx.MultiDiGraph()
        self._persistence_path = Path(persistence_path)
        self._max_nodes = max_nodes
        self._weight_decay = weight_decay
        self._entity_index: dict[str, EntityNode] = {}
        self._edge_index: dict[str, Edge] = {}
        self._load()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _load(self) -> None:
        if not self._persistence_path.exists():
            logger.info("No existing KG found at %s, starting fresh", self._persistence_path)
            return

        try:
            data = json.loads(self._persistence_path.read_text(encoding="utf-8"))
            for nd in data.get("nodes", []):
                node = EntityNode(**nd)
                self._add_node_internal(node)
            for ed in data.get("edges", []):
                edge = Edge(**ed)
                self._add_edge_internal(edge)
            logger.info(
                "Loaded KG: %d nodes, %d edges",
                self._graph.number_of_nodes(),
                self._graph.number_of_edges(),
            )
        except Exception:
            logger.exception("Failed to load KG from %s", self._persistence_path)

    def _save(self) -> None:
        self._persistence_path.parent.mkdir(parents=True, exist_ok=True)
        nodes = [nd.model_dump(mode="json") for nd in self._entity_index.values()]
        edges = [ed.model_dump(mode="json") for ed in self._edge_index.values()]
        payload = {"nodes": nodes, "edges": edges}
        self._persistence_path.write_text(
            json.dumps(payload, default=str, indent=2), encoding="utf-8"
        )
        logger.debug("Saved KG: %d nodes, %d edges", len(nodes), len(edges))

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _add_node_internal(self, node: EntityNode) -> None:
        self._entity_index[node.entity_id] = node
        self._graph.add_node(
            node.entity_id,
            entity_type=node.entity_type.value,
            name=node.name,
            canonical_name=node.canonical_name,
            confidence=node.confidence,
        )

    def _add_edge_internal(self, edge: Edge) -> None:
        key = f"{edge.source_id}:{edge.target_id}:{edge.relation.value}"
        self._edge_index[key] = edge
        self._graph.add_edge(
            edge.source_id,
            edge.target_id,
            key=edge.relation.value,
            relation=edge.relation.value,
            weight=edge.weight,
            evidence_count=edge.evidence_count,
        )

    def _evict_if_needed(self) -> None:
        if self._graph.number_of_nodes() <= self._max_nodes:
            return
        nodes_by_access = sorted(
            self._entity_index.values(), key=lambda n: (n.access_count, n.updated_at)
        )
        excess = self._graph.number_of_nodes() - self._max_nodes
        for node in nodes_by_access[:excess]:
            self.remove_entity(node.entity_id)
        logger.info("Evicted %d low-access nodes from KG", excess)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add_entity(
        self,
        name: str,
        entity_type: EntityType,
        properties: Optional[dict[str, Any]] = None,
        confidence: float = 1.0,
    ) -> EntityNode:
        canonical = name.strip().lower()
        for existing in self._entity_index.values():
            if existing.canonical_name == canonical and existing.entity_type == entity_type:
                existing.access_count += 1
                existing.updated_at = datetime.utcnow()
                if properties:
                    existing.properties.update(properties)
                return existing

        node = EntityNode(
            entity_id=str(uuid.uuid4()),
            entity_type=entity_type,
            name=name,
            canonical_name=canonical,
            properties=properties or {},
            confidence=confidence,
        )
        self._add_node_internal(node)
        self._evict_if_needed()
        return node

    def add_edge(
        self,
        source_id: str,
        target_id: str,
        relation: RelationType,
        weight: float = 1.0,
        properties: Optional[dict[str, Any]] = None,
    ) -> Optional[Edge]:
        if source_id not in self._entity_index or target_id not in self._entity_index:
            logger.warning("Cannot add edge: source or target not found")
            return None

        key = f"{source_id}:{target_id}:{relation.value}"
        if key in self._edge_index:
            existing = self._edge_index[key]
            existing.weight = min(1.0, existing.weight + 0.1)
            existing.evidence_count += 1
            existing.last_verified_at = datetime.utcnow()
            return existing

        edge = Edge(
            source_id=source_id,
            target_id=target_id,
            relation=relation,
            weight=weight,
            properties=properties or {},
        )
        self._add_edge_internal(edge)
        return edge

    def remove_entity(self, entity_id: str) -> bool:
        if entity_id not in self._entity_index:
            return False
        self._graph.remove_node(entity_id)
        del self._entity_index[entity_id]
        keys_to_remove = [
            k for k, e in self._edge_index.items()
            if e.source_id == entity_id or e.target_id == entity_id
        ]
        for k in keys_to_remove:
            del self._edge_index[k]
        return True

    def get_entity(self, entity_id: str) -> Optional[EntityNode]:
        return self._entity_index.get(entity_id)

    def get_neighbors(
        self,
        entity_id: str,
        relation: Optional[RelationType] = None,
        direction: str = "both",
    ) -> list[tuple[EntityNode, Edge]]:
        if entity_id not in self._entity_index:
            return []

        results: list[tuple[EntityNode, Edge]] = []
        if direction in ("out", "both"):
            for _, target, data in self._graph.out_edges(entity_id, data=True):
                if relation and data.get("relation") != relation.value:
                    continue
                key = f"{entity_id}:{target}:{data['relation']}"
                edge = self._edge_index.get(key)
                node = self._entity_index.get(target)
                if edge and node:
                    results.append((node, edge))

        if direction in ("in", "both"):
            for source, _, data in self._graph.in_edges(entity_id, data=True):
                if relation and data.get("relation") != relation.value:
                    continue
                key = f"{source}:{entity_id}:{data['relation']}"
                edge = self._edge_index.get(key)
                node = self._entity_index.get(source)
                if edge and node:
                    results.append((node, edge))

        return results

    def find_entity_by_name(
        self, name: str, entity_type: Optional[EntityType] = None
    ) -> list[EntityNode]:
        canonical = name.strip().lower()
        results = []
        for node in self._entity_index.values():
            if node.canonical_name == canonical:
                if entity_type is None or node.entity_type == entity_type:
                    results.append(node)
        return results

    def get_facts_for_entity(self, entity_id: str) -> list[Edge]:
        return [
            edge for edge in self._edge_index.values()
            if edge.source_id == entity_id or edge.target_id == entity_id
        ]

    def apply_decay(self) -> int:
        decayed = 0
        for edge in self._edge_index.values():
            if edge.weight > 0.01:
                edge.weight *= self._weight_decay
                decayed += 1
        return decayed

    def get_domain_entities(self, domain: str) -> list[EntityNode]:
        return [
            node for node in self._entity_index.values()
            if node.properties.get("domain") == domain
        ]

    def get_stats(self) -> KnowledgeGraphStats:
        entity_types: dict[str, int] = {}
        for node in self._entity_index.values():
            t = node.entity_type.value
            entity_types[t] = entity_types.get(t, 0) + 1

        relation_types: dict[str, int] = {}
        for edge in self._edge_index.values():
            r = edge.relation.value
            relation_types[r] = relation_types.get(r, 0) + 1

        weights = [e.weight for e in self._edge_index.values()]
        avg_weight = sum(weights) / len(weights) if weights else 0.0

        domains = {
            n.properties.get("domain", "unknown")
            for n in self._entity_index.values()
            if n.properties.get("domain")
        }

        return KnowledgeGraphStats(
            total_nodes=self._graph.number_of_nodes(),
            total_edges=self._graph.number_of_edges(),
            entity_type_counts=entity_types,
            relation_type_counts=relation_types,
            avg_edge_weight=round(avg_weight, 4),
            domains_covered=sorted(domains),
        )

    def analyze(self, top_k: int = 10) -> GraphAnalytics:
        n = self._graph.number_of_nodes()
        e = self._graph.number_of_edges()

        if n == 0:
            return GraphAnalytics(
                total_nodes=0,
                total_edges=0,
                connected_components=0,
                most_important=[],
                communities=0,
                top_communities=[],
            )

        undirected = self._graph.to_undirected()
        components = list(nx.connected_components(undirected))

        pr = nx.pagerank(self._graph, alpha=0.85, max_iter=100)
        degree = dict(self._graph.degree())

        try:
            bet = nx.betweenness_centrality(self._graph)
        except Exception:
            bet = {node: 0.0 for node in self._graph.nodes()}

        def _score(node: str) -> tuple[float, float, float]:
            return (pr.get(node, 0.0), degree.get(node, 0), bet.get(node, 0.0))

        ranked = sorted(self._graph.nodes(), key=_score, reverse=True)[:top_k]

        most_important: list[EntityImportance] = []
        for node_id in ranked:
            data = self._entity_index.get(node_id)
            most_important.append(
                EntityImportance(
                    entity_id=node_id,
                    name=data.name if data else str(node_id),
                    entity_type=data.entity_type if data else EntityType.CONCEPT,
                    page_rank=round(pr.get(node_id, 0.0), 6),
                    degree=degree.get(node_id, 0),
                    betweenness=round(bet.get(node_id, 0.0), 6),
                )
            )

        try:
            community_gen = nx.community.louvain_communities(undirected, seed=42)
            community_list = [sorted(c) for c in community_gen]
        except Exception:
            community_list = [sorted(undirected.nodes())]

        top_communities: list[dict[str, Any]] = []
        for i, members in enumerate(community_list[:5]):
            sub = undirected.subgraph(members)
            top_communities.append(
                {
                    "id": i,
                    "size": len(members),
                    "members": members[:10],
                    "density": round(nx.density(sub), 4) if len(members) > 1 else 0.0,
                }
            )

        return GraphAnalytics(
            total_nodes=n,
            total_edges=e,
            connected_components=len(components),
            most_important=most_important,
            communities=len(community_list),
            top_communities=top_communities,
        )

    def save(self) -> None:
        self._save()

    def clear(self) -> None:
        self._graph.clear()
        self._entity_index.clear()
        self._edge_index.clear()


_knowledge_graph_instance: Optional[KnowledgeGraph] = None


def get_knowledge_graph(
    persistence_path: str = "data/knowledge_graph.json",
    max_nodes: int = 100_000,
    weight_decay: float = 0.95,
) -> KnowledgeGraph:
    global _knowledge_graph_instance
    if _knowledge_graph_instance is None:
        _knowledge_graph_instance = KnowledgeGraph(
            persistence_path=persistence_path,
            max_nodes=max_nodes,
            weight_decay=weight_decay,
        )
    return _knowledge_graph_instance
