/** Compute the Shannon entropy (bits per character) of a string. */
export function shannonEntropy(input: string): number {
  if (!input) return 0;
  const counts = new Map<string, number>();
  for (const ch of input) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  const len = input.length;
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

const TOKEN_RE = /[A-Za-z0-9+/_\-]{20,}/g;

/**
 * Find high-entropy tokens that look like randomly generated secrets.
 *
 * Heuristics to cut down on false positives:
 *  - minimum length 24
 *  - Shannon entropy >= 4.5 bits/char
 *  - must contain at least two of: lowercase, uppercase, digits
 *  - ignored when present in `alreadyMatched` (already found by a regex rule)
 */
export function findHighEntropyTokens(
  content: string,
  alreadyMatched: Set<string>,
  threshold = 4.5,
): { token: string; index: number }[] {
  const results: { token: string; index: number }[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(TOKEN_RE)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (token.length < 24) continue;
    if (seen.has(token)) continue;
    if (alreadyMatched.has(token)) continue;
    // Skip tokens that are fully contained in an already-detected secret.
    if ([...alreadyMatched].some((m) => m.includes(token))) continue;

    const hasLower = /[a-z]/.test(token);
    const hasUpper = /[A-Z]/.test(token);
    const hasDigit = /[0-9]/.test(token);
    const classes = Number(hasLower) + Number(hasUpper) + Number(hasDigit);
    if (classes < 2) continue;

    if (shannonEntropy(token) >= threshold) {
      seen.add(token);
      results.push({ token, index });
    }
  }

  return results;
}
