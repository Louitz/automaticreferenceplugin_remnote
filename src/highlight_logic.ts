export type TextRange = {
  start: number;
  end: number;
  text: string;
};

const TOKEN_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}-]*/gu;
const MIN_TERM_LENGTH = 3;
const MAX_TERM_WORDS = 3;

export function normalizeTerm(term: string) {
  return term.trim().toLocaleLowerCase();
}

export function getCandidatePhrases(sourceText: string) {
  const tokenMatches = Array.from(sourceText.matchAll(TOKEN_PATTERN));
  if (!tokenMatches.length) {
    return [];
  }

  const tokens = tokenMatches.map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

  const candidatePhrases = new Map<string, TextRange>();
  for (let startIndex = 0; startIndex < tokens.length; startIndex += 1) {
    for (
      let endIndex = startIndex;
      endIndex < tokens.length && endIndex < startIndex + MAX_TERM_WORDS;
      endIndex += 1
    ) {
      const start = tokens[startIndex].start;
      const end = tokens[endIndex].end;
      const text = sourceText.slice(start, end).trim();

      if (text.length < MIN_TERM_LENGTH) {
        continue;
      }

      candidatePhrases.set(`${start}:${end}`, { start, end, text });
    }
  }

  return Array.from(candidatePhrases.values());
}

export function selectHighlightRanges(
  sourceText: string,
  knownTerms: Iterable<string>
): TextRange[] {
  const knownTermSet = new Set(Array.from(knownTerms, normalizeTerm));
  const candidates = getCandidatePhrases(sourceText).filter((candidate) =>
    knownTermSet.has(normalizeTerm(candidate.text))
  );

  candidates.sort((left, right) => {
    const leftLength = left.end - left.start;
    const rightLength = right.end - right.start;
    if (leftLength !== rightLength) {
      return rightLength - leftLength;
    }

    return left.start - right.start;
  });

  const accepted: TextRange[] = [];
  for (const candidate of candidates) {
    const overlaps = accepted.some(
      (existing) => candidate.start < existing.end && existing.start < candidate.end
    );

    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  return accepted.sort((left, right) => left.start - right.start);
}
