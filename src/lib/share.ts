/** Wordle-style shareable result for a finished daily. */
export function buildDailyShare(dateKey: string, stars: number, found: number, total: number): string {
  const starStr = '⭐'.repeat(stars) + '▫️'.repeat(Math.max(0, 3 - stars));
  const extra = found > total ? ` (+${found - total} bonus)` : '';
  return `Word Linker — Daily ${dateKey}\n${starStr}  ${Math.min(found, total)}/${total} words${extra}\nConnect letters, find words 🟣`;
}

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/** Use the native share sheet when available, otherwise copy to clipboard. */
export async function shareText(text: string): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch {
      /* user cancelled or share failed — fall back to copy */
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
