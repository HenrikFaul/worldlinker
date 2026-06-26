// Word Linker — level generator (build-time, output committed to src/data/levels.json)
//
// Strategy: pick a recognizable "base" word, compute every valid dictionary word
// that can be spelled from its letters, then split those into MAIN words (the grid
// slots — common & length-varied) and BONUS words (the rest — a delight to discover).
// Because every level ships its own complete word set, the runtime needs NO dictionary.
//
// Deterministic: a fixed seed makes re-runs produce an identical levels.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---- config ---------------------------------------------------------------
const LEVEL_COUNT = 150;
const SEED = 0x5eed1234;
const MAX_BONUS = 50; // cap stored bonus words per level to bound file size

// Progression formulas. B(n) is the spec's letter count. The spec's raw
// W(n)=3+floor(n/5) reaches 33 words by level 150 — an unplayable grid — so we
// keep the same gentle ramp but cap it at a mobile-friendly maximum.
const lettersForLevel = (n) => Math.min(8, 4 + Math.floor(n / 15)); // B(n)
const MAX_MAIN = 8;
const mainWordsForLevel = (n) => Math.min(MAX_MAIN, 3 + Math.floor(n / 12)); // W(n), capped

// ---- load word sources ----------------------------------------------------
const bigRaw = readFileSync(join(ROOT, 'node_modules/an-array-of-english-words/index.json'), 'utf8');
const allWords = JSON.parse(bigRaw).filter((w) => w.length >= 3 && w.length <= 8 && /^[a-z]+$/.test(w));
const validSet = new Set(allWords);

const commonList = readFileSync(join(ROOT, 'scripts/data/common-words.txt'), 'utf8')
  .split('\n')
  .map((w) => w.trim())
  .filter((w) => /^[a-z]+$/.test(w));
const rank = new Map(commonList.map((w, i) => [w, i])); // 0 = most common
const rankOf = (w) => (rank.has(w) ? rank.get(w) : Infinity);
const COMMON_CUTOFF = 9000; // a word is "common enough" to be a main word below this rank

// Web-frequency lists carry abbreviations / proper-noun fragments. Keep these out
// of the showcase grid (they may still appear as bonus discoveries).
const MAIN_STOPLIST = new Set([
  'las', 'san', 'los', 'inc', 'ltd', 'etc', 'dept', 'vol', 'www', 'com', 'org',
  'net', 'php', 'xml', 'api', 'url', 'faq', 'usa', 'pdf', 'jpg', 'png', 'css',
  'alan', 'dan', 'sam', 'tom', 'ron', 'ben', 'ian', 'leo', 'max', 'rob',
]);

// ---- deterministic RNG (mulberry32) --------------------------------------
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(SEED);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---- letter helpers -------------------------------------------------------
const countLetters = (word) => {
  const c = {};
  for (const ch of word) c[ch] = (c[ch] || 0) + 1;
  return c;
};
const canForm = (word, baseCount) => {
  const c = {};
  for (const ch of word) {
    c[ch] = (c[ch] || 0) + 1;
    if (!baseCount[ch] || c[ch] > baseCount[ch]) return false;
  }
  return true;
};

// All valid words spellable from `base` (excluding 1-2 letter words).
function formableWords(base) {
  const baseCount = countLetters(base);
  const out = [];
  for (const w of allWords) {
    if (w.length > base.length) continue;
    if (canForm(w, baseCount)) out.push(w);
  }
  return out;
}

// ---- base-word candidates by length (common words, frequency order) -------
const candidatesByLen = new Map();
for (const w of commonList) {
  if (w.length < 4 || w.length > 8) continue;
  if (!validSet.has(w)) continue; // must also be in the validation dict
  if (!candidatesByLen.has(w.length)) candidatesByLen.set(w.length, []);
  candidatesByLen.get(w.length).push(w);
}
for (const [len, arr] of candidatesByLen) {
  console.log(`base candidates len ${len}: ${arr.length}`);
}

// Pick main words via a commonness+length score: longer words are favoured (the
// satisfying finds), but a very common short word can still beat an obscure long
// one. The base word (the showcase) is always included. Returns null if a base
// can't supply enough reasonably-common words.
const LEN_WEIGHT = 600; // how strongly to reward each extra letter
const scoreWord = (w) => (rank.has(w) ? rank.get(w) : 20000) - LEN_WEIGHT * (w.length - 3);

function pickMainWords(base, formable, need) {
  const pool = formable.filter((w) => w !== base && rankOf(w) < COMMON_CUTOFF && !MAIN_STOPLIST.has(w));
  if (pool.length < need - 1) return null;
  pool.sort((a, b) => scoreWord(a) - scoreWord(b));
  return [base, ...pool.slice(0, need - 1)];
}

// ---- generate -------------------------------------------------------------
const levels = [];
const recentlyUsed = []; // avoid repeating a base too soon
const RECENT_WINDOW = 25;
const candidateCursor = new Map(); // per-length pointer into candidate list

function nextBaseCandidate(len) {
  const arr = candidatesByLen.get(len) || [];
  let i = candidateCursor.get(len) || 0;
  for (; i < arr.length; i++) {
    const cand = arr[i];
    if (recentlyUsed.includes(cand)) continue;
    candidateCursor.set(len, i + 1);
    return cand;
  }
  candidateCursor.set(len, i);
  return null;
}

for (let n = 1; n <= LEVEL_COUNT; n++) {
  const need = mainWordsForLevel(n);
  let built = null;

  // try the spec length first, then fall back to longer bases (more words available)
  for (const len of [lettersForLevel(n), lettersForLevel(n) + 1, lettersForLevel(n) + 2]) {
    if (len > 8) continue;
    const startCursor = candidateCursor.get(len) || 0;
    let tries = 0;
    while (tries < 400) {
      tries++;
      const base = nextBaseCandidate(len);
      if (!base) break;
      const formable = formableWords(base);
      if (formable.length < need + 1) continue; // want at least one bonus too
      const mains = pickMainWords(base, formable, need);
      if (!mains) continue;
      const mainSet = new Set(mains);
      const bonus = formable
        .filter((w) => !mainSet.has(w))
        .sort((a, b) => b.length - a.length || rankOf(a) - rankOf(b))
        .slice(0, MAX_BONUS);
      built = { base, formable, mains, bonus };
      break;
    }
    if (built) break;
    candidateCursor.set(len, startCursor); // reset so fallback length can reuse pool
  }

  if (!built) {
    throw new Error(`Could not build level ${n} (need ${need} main words)`);
  }

  recentlyUsed.push(built.base);
  if (recentlyUsed.length > RECENT_WINDOW) recentlyUsed.shift();

  // scrambled letter tiles (never identical to the base spelling)
  let letters = shuffle([...built.base]).join('');
  let guard = 0;
  while (letters === built.base && guard++ < 10) letters = shuffle([...built.base]).join('');

  const mainWords = built.mains.sort((a, b) => a.length - b.length || a.localeCompare(b));

  levels.push({
    id: n,
    base: built.base,
    letters: letters.toUpperCase(),
    mainWords: mainWords.map((w) => w.toUpperCase()),
    bonusWords: built.bonus.map((w) => w.toUpperCase()),
  });
}

// ---- write ----------------------------------------------------------------
const outPath = join(ROOT, 'src/data/levels.json');
writeFileSync(outPath, JSON.stringify(levels));
const sizeKb = (Buffer.byteLength(JSON.stringify(levels)) / 1024).toFixed(1);

// quick stats
const avgMain = (levels.reduce((s, l) => s + l.mainWords.length, 0) / levels.length).toFixed(1);
const avgBonus = (levels.reduce((s, l) => s + l.bonusWords.length, 0) / levels.length).toFixed(1);
console.log(`\nGenerated ${levels.length} levels -> src/data/levels.json (${sizeKb} KB)`);
console.log(`avg main words: ${avgMain}, avg bonus words: ${avgBonus}`);
console.log('sample level 1:', JSON.stringify(levels[0]));
console.log('sample level 60:', JSON.stringify(levels[59]));
console.log('sample level 150:', JSON.stringify(levels[149]));
