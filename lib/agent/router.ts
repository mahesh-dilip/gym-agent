const SONNET_PATTERNS = [
  /what should i do/i,
  /what.*today/i,
  /recommend/i,
  /suggest/i,
  /what else/i,
  /what.*next/i,
  /how.*do.*i/i,
  /help.*with/i,
  /plan/i,
  /program/i,
  /advice/i,
  /goal/i,
  /progress/i,
  /posture/i,
  /why.*should/i,
  /explain/i,
  /what.*work/i,
  /should i/i,
  /can you.*suggest/i,
  /improve/i,
  /fix/i,
  /set.*goal/i,
  /start.*session/i,
];

export function routeIntent(message: string): "haiku" | "sonnet" {
  if (SONNET_PATTERNS.some((p) => p.test(message))) return "sonnet";
  return "haiku";
}
