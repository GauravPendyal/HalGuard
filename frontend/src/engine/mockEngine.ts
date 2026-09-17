import { eventBus } from './eventBus';
import { formatTimestamp, sleep } from '@/lib/utils';
import { VerificationClaim, VerificationMode } from '@/types';

export async function runMockVerification(prompt: string, mode: VerificationMode, model: string) {
  const sessionId = `session-${Date.now()}`;
  const now = () => formatTimestamp();

  // Step 1: Prompt Submitted
  eventBus.emit('PROMPT_SUBMITTED', {
    sessionId,
    timestamp: now(),
    prompt,
    mode,
    model,
  });
  await sleep(400);

  // Step 2: LLM Candidate Generation
  eventBus.emit('LLM_DRAFT_STARTED', {
    sessionId,
    timestamp: now(),
    agentId: 'llm',
    progress: 10,
    message: 'Reasoner LLM model generating candidate response...',
  });
  await sleep(300);

  const sampleDraft =
    'Python is a high-level programming language created by Guido van Rossum. It was originally released in 1989 and gained popularity for its readable syntax. Python 3.0 was released in 2008 as a major revision.';

  const words = sampleDraft.split(' ');
  let accumulated = '';
  for (let i = 0; i < words.length; i++) {
    accumulated += (i > 0 ? ' ' : '') + words[i];
    eventBus.emit('LLM_DRAFT_STREAM', {
      sessionId,
      timestamp: now(),
      chunk: words[i],
      accumulatedText: accumulated,
    });
    await sleep(40);
  }

  eventBus.emit('LLM_DRAFT_COMPLETED', {
    sessionId,
    timestamp: now(),
    agentId: 'llm',
    progress: 100,
    message: 'Reasoner candidate response generation complete.',
  });
  await sleep(400);

  // Step 3: Claim Extraction (Investigator Agent)
  const mockClaims: VerificationClaim[] = [
    {
      id: 'claim-1',
      claimText: 'Python was created by Guido van Rossum.',
      status: 'verified',
      confidence: 99.8,
      evidenceUrl: 'https://en.wikipedia.org/wiki/Guido_van_Rossum',
      evidenceSnippet: 'Guido van Rossum is a Dutch programmer who created the Python programming language.',
    },
    {
      id: 'claim-2',
      claimText: 'Python was originally released in 1989.',
      status: 'corrected',
      confidence: 94.2,
      originalText: 'It was originally released in 1989.',
      correctedText: 'Python was first released on February 20, 1991.',
      evidenceUrl: 'https://docs.python.org/3/faq/general.html',
      evidenceSnippet: 'Python was created in the late 1980s and first released on February 20, 1991.',
    },
    {
      id: 'claim-3',
      claimText: 'Python 3.0 was released in 2008.',
      status: 'verified',
      confidence: 98.9,
      evidenceUrl: 'https://www.python.org/download/releases/3.0/',
      evidenceSnippet: 'Python 3.0 was released on December 3, 2008.',
    },
  ];

  eventBus.emit('CLAIMS_EXTRACTED', {
    sessionId,
    timestamp: now(),
    claims: mockClaims,
  });
  await sleep(500);

  // Step 4: Evidence Discovery (Archivist Agent)
  const mockEvidence = [
    {
      source: 'Python Software Foundation',
      trustScore: 99.5,
      relevance: 98.2,
      snippet: 'Python 3.0 final release notes on December 3, 2008.',
      latencyMs: 42,
      url: 'https://www.python.org',
    },
    {
      source: 'Wikipedia Encyclopedia',
      trustScore: 96.0,
      relevance: 94.5,
      snippet: 'Guido van Rossum began implementation of Python in December 1989.',
      latencyMs: 65,
      url: 'https://en.wikipedia.org/wiki/History_of_Python',
    },
    {
      source: 'CrossRef Academic Registry',
      trustScore: 98.0,
      relevance: 91.0,
      snippet: 'van Rossum, G. (1995) Python reference manual.',
      latencyMs: 88,
      url: 'https://crossref.org',
    },
  ];

  eventBus.emit('EVIDENCE_DISCOVERED', {
    sessionId,
    timestamp: now(),
    evidence: mockEvidence,
  });
  await sleep(400);

  // Step 5: Consensus Meter Stepping (Arbiter Agent)
  const steps = [30, 48, 67, 82, 98.4];
  for (const score of steps) {
    eventBus.emit('CONSENSUS_UPDATED', {
      sessionId,
      timestamp: now(),
      confidence: score,
    });
    await sleep(250);
  }

  // Step 6: Diff Correction (Refiner Agent)
  eventBus.emit('CORRECTION_STARTED', {
    sessionId,
    timestamp: now(),
    agentId: 'corrector',
    progress: 50,
    message: 'Refiner Agent patching hallucinated release date...',
  });
  await sleep(350);

  eventBus.emit('CORRECTION_COMPLETED', {
    sessionId,
    timestamp: now(),
    originalText: 'It was originally released in 1989.',
    correctedText: 'Python was first released on February 20, 1991 by Guido van Rossum.',
    diffs: [
      { type: 'equal', value: 'Python is a high-level programming language created by Guido van Rossum. ' },
      { type: 'delete', value: 'It was originally released in 1989' },
      { type: 'add', value: 'Python was first released on February 20, 1991' },
      { type: 'equal', value: ' and gained popularity for its readable syntax. Python 3.0 was released in 2008 as a major revision.' },
    ],
  });
  await sleep(400);

  // Step 7: Memory Sync (Memory Keeper Agent)
  eventBus.emit('MEMORY_UPDATED', {
    sessionId,
    timestamp: now(),
    agentId: 'memory',
    progress: 100,
    message: 'Consensus facts indexed into persistent vector memory.',
  });
  await sleep(300);

  // Step 8: Final Verification Complete & Certificate Generation
  const finalVerifiedResponse =
    'Python is a high-level programming language created by Guido van Rossum. **Python was first released on February 20, 1991** [1] and gained popularity for its readable syntax. Python 3.0 was released in 2008 [2] as a major revision.';

  eventBus.emit('VERIFICATION_COMPLETED', {
    sessionId,
    timestamp: now(),
    finalResponse: finalVerifiedResponse,
    overallConfidence: 98.4,
    totalExecutionTimeMs: 1420,
    certificateId: `HG-CERT-${Math.floor(100000 + Math.random() * 900000)}`,
  });

  eventBus.emit('REPORT_GENERATED', {
    sessionId,
    timestamp: now(),
  });
}
