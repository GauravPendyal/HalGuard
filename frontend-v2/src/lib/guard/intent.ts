/**
 * Deterministic intent guard for conversational messages and non-claims.
 * Factual claims are routed to the 9-stage verification backend.
 * Greetings and non-claim pleasantries are answered locally without wasting backend resources.
 */

const GREETINGS = new Set([
  "hi",
  "hello",
  "hey",
  "hey there",
  "hi there",
  "hello there",
  "good morning",
  "good afternoon",
  "good evening",
  "good night",
  "howdy",
  "hola",
  "greetings",
  "sup",
  "yo",
]);

const THANKS = new Set([
  "thanks",
  "thank you",
  "thx",
  "ty",
  "thank you so much",
  "appreciate it",
]);

const ASSISTANT_QUERIES = new Set([
  "who are you",
  "what are you",
  "what can you do",
  "help",
  "what is halluciguard",
  "what is this",
  "how does this work",
  "how to use",
]);

export interface IntentGuardResult {
  isConversational: boolean;
  response?: string;
}

export function classifyUserIntent(query: string): IntentGuardResult {
  const normalized = query
    .trim()
    .toLowerCase()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^[!?,.]+|[!?,.]+$/g, "")
    .trim();

  if (!normalized || normalized.length === 0) {
    return {
      isConversational: true,
      response: "Please enter a factual claim or statement for me to verify.",
    };
  }

  if (GREETINGS.has(normalized)) {
    return {
      isConversational: true,
      response: "Hello! What factual claim would you like me to verify? Send me a statement (e.g. \"Java was created by James Gosling\") and I'll check it against live evidence.",
    };
  }

  if (THANKS.has(normalized)) {
    return {
      isConversational: true,
      response: "You're welcome! Send me any factual claim or statement whenever you'd like to check its accuracy against live sources.",
    };
  }

  if (ASSISTANT_QUERIES.has(normalized)) {
    return {
      isConversational: true,
      response: "I am HalluciGuard, an evidence-grounded verification engine. Give me any factual claim and I will search authoritative sources, run BGE reranking, perform DeBERTa NLI entailment, and determine whether the claim is Verified, Contradicted, or Unverified.",
    };
  }

  // Very short non-factual single-word greetings
  if (normalized.length <= 3 && ["hi", "hey", "yo"].includes(normalized)) {
    return {
      isConversational: true,
      response: "Hi! Send me a factual statement and I'll check it against live evidence.",
    };
  }

  return { isConversational: false };
}
