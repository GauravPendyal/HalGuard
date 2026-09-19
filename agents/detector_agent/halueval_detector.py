from __future__ import annotations

import inspect
import os
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

import torch
from datasets import Dataset, load_dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)

DEFAULT_BASE_MODEL = os.getenv("HALUEVAL_BASE_MODEL", "distilbert-base-uncased")
DEFAULT_DATASET = "pminervini/HaluEval"
DEFAULT_MAX_LENGTH = int(os.getenv("HALUEVAL_MAX_LENGTH", "384"))


def _label(value: Any) -> int:
    value = str(value).strip().lower()
    if value in {"yes", "true", "1", "hallucinated", "hallucination"}:
        return 1
    if value in {"no", "false", "0", "not hallucinated", "non-hallucinated"}:
        return 0
    raise ValueError(f"Unsupported HaluEval label: {value!r}")


def _paired_rows(
    rows: Iterable[Dict[str, Any]],
    context_key: str,
    positive_key: str,
    hallucinated_key: str,
    query_key: Optional[str] = None,
) -> List[Dict[str, Any]]:
    result: List[Dict[str, Any]] = []
    for row in rows:
        context = str(row.get(context_key, ""))
        positive = str(row.get(positive_key, ""))
        hallucinated = str(row.get(hallucinated_key, ""))
        if not context or not positive or not hallucinated:
            continue
        prefix = f"Context: {context}"
        if query_key and row.get(query_key):
            prefix += f"\nQuery: {row[query_key]}"
        result.append({"text": f"{prefix}\nAnswer: {positive}", "label": 0})
        result.append({"text": f"{prefix}\nAnswer: {hallucinated}", "label": 1})
    return result


def build_halueval_dataset(max_rows: Optional[int] = None) -> Dataset:
    """Normalize all official HaluEval configurations into one binary dataset."""
    result: List[Dict[str, Any]] = []

    general = load_dataset(DEFAULT_DATASET, "general", split="data")
    for row in general:
        query = str(row.get("user_query", ""))
        response = str(row.get("chatgpt_response", ""))
        if query and response:
            result.append({
                "text": f"Query: {query}\nAnswer: {response}",
                "label": _label(row.get("hallucination_label")),
            })

    result.extend(_paired_rows(
        load_dataset(DEFAULT_DATASET, "qa", split="data"),
        "knowledge", "right_answer", "hallucinated_answer", "question",
    ))
    result.extend(_paired_rows(
        load_dataset(DEFAULT_DATASET, "dialogue", split="data"),
        "knowledge", "right_response", "hallucinated_response", "dialogue_history",
    ))
    result.extend(_paired_rows(
        load_dataset(DEFAULT_DATASET, "summarization", split="data"),
        "document", "right_summary", "hallucinated_summary",
    ))

    if max_rows is not None:
        result = result[:max_rows]
    if not result:
        raise RuntimeError("HaluEval produced no training examples")
    return Dataset.from_list(result).shuffle(seed=42)


@dataclass
class HaluEvalTrainConfig:
    base_model: str = DEFAULT_BASE_MODEL
    output_dir: str = os.getenv("HALUEVAL_OUTPUT_DIR", "./artifacts/halueval-detector")
    max_length: int = DEFAULT_MAX_LENGTH
    epochs: float = float(os.getenv("HALUEVAL_EPOCHS", "2"))
    learning_rate: float = float(os.getenv("HALUEVAL_LR", "2e-5"))
    train_batch_size: int = int(os.getenv("HALUEVAL_TRAIN_BATCH_SIZE", "16"))
    eval_batch_size: int = int(os.getenv("HALUEVAL_EVAL_BATCH_SIZE", "32"))
    seed: int = int(os.getenv("HALUEVAL_SEED", "42"))


class HaluEvalDetector:
    """Binary hallucination classifier fine-tuned on HaluEval."""

    def __init__(self, model_path: str, max_length: int = DEFAULT_MAX_LENGTH) -> None:
        self.model_path = model_path
        self.max_length = max_length
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.model.eval()

    @torch.inference_mode()
    def predict(self, user_query: str, llm_response: str) -> Dict[str, Any]:
        text = f"Query: {user_query}\nAnswer: {llm_response}"
        batch = self.tokenizer(
            [text], truncation=True, max_length=self.max_length,
            padding=True, return_tensors="pt",
        )
        device = next(self.model.parameters()).device
        accepted_inputs = set(inspect.signature(self.model.forward).parameters)
        batch = {
            key: value.to(device)
            for key, value in batch.items()
            if key in accepted_inputs
        }
        probabilities = torch.softmax(self.model(**batch).logits, dim=-1)[0]
        probabilities = probabilities.detach().cpu().tolist()
        hallucination_probability = float(probabilities[1])
        return {
            "hallucination_probability": round(hallucination_probability, 4),
            "confidence_score": round(float(max(probabilities)), 4),
            "predicted_label": (
                "HALLUCINATION" if hallucination_probability >= 0.5
                else "NO_HALLUCINATION"
            ),
        }


def train_halueval_detector(
    config: Optional[HaluEvalTrainConfig] = None,
    max_rows: Optional[int] = None,
) -> Dict[str, Any]:
    """Fine-tune the detector on HaluEval and save the trained model."""
    cfg = config or HaluEvalTrainConfig()
    dataset = build_halueval_dataset(max_rows=max_rows)
    split = dataset.train_test_split(test_size=0.1, seed=cfg.seed)

    tokenizer = AutoTokenizer.from_pretrained(cfg.base_model)
    model = AutoModelForSequenceClassification.from_pretrained(
        cfg.base_model,
        num_labels=2,
        id2label={0: "NO_HALLUCINATION", 1: "HALLUCINATION"},
        label2id={"NO_HALLUCINATION": 0, "HALLUCINATION": 1},
    )

    def tokenize(batch: Dict[str, List[Any]]) -> Dict[str, Any]:
        return tokenizer(batch["text"], truncation=True, max_length=cfg.max_length)

    tokenized = split.map(tokenize, batched=True, remove_columns=["text"])
    args = TrainingArguments(
        output_dir=cfg.output_dir,
        learning_rate=cfg.learning_rate,
        per_device_train_batch_size=cfg.train_batch_size,
        per_device_eval_batch_size=cfg.eval_batch_size,
        num_train_epochs=cfg.epochs,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        seed=cfg.seed,
        report_to="none",
    )
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["test"],
        tokenizer=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
    )
    trainer.train()
    trainer.save_model(cfg.output_dir)
    tokenizer.save_pretrained(cfg.output_dir)
    return {
        "dataset": DEFAULT_DATASET,
        "base_model": cfg.base_model,
        "output_dir": cfg.output_dir,
        "train_rows": len(tokenized["train"]),
        "eval_rows": len(tokenized["test"]),
        "metrics": trainer.evaluate(),
    }


if __name__ == "__main__":
    print(train_halueval_detector())
