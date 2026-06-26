# Word Linker — AI Fejlesztői Prompt

> **Tagline:** Connect Letters. Find Words.
> **Műfajok:** WORD / PUZZLE / TRIVIA / COZY
> **Cél hossz:** ~35 000 karakter (jelen verzió tömör 20 000+ char, későbbi bővítésre alkalmas).

Word Linker egy „swipe-to-connect" szótalálós puzzle, a Word Cookies / Words of Wonders / Wordscapes szegmensbe. Lovable Cloud backend, React + Canvas/SVG frontend, többnyelvű szótár. Lassú, relax mechanika, női-skew lapsed-gamer közönség, magas LTV.

---

## 1. Vízió, célközönség, design

- **Vízió:** „A Word Linker az a játék, amit a kávészünetben nyitsz meg, és 5 perc múlva azt érzed, hogy okosabb lettél."
- **Célközönség:** 25–65 év, női skew (~70%), magas LTV.
- **Top piacok:** USA, UK, Németország, Brazília, Spanyolország, Olaszország, Franciaország, Magyarország.
- **Design pillérek:** anxiety-free, cozy art (pasztell lavender), no time limit, hint economy, daily word challenge, leaderboard opcionális (nem fő motivátor).
- **Brand:** Primary `#7B61FF`, Accent `#FFD173`, Surface `#FAF7FF`, Ink `#2B1B5C`. Font: „Fraunces" + „Inter".
- **KPI célok:** D1 ≥ 45%, D7 ≥ 25%, D30 ≥ 12%, ARPDAU ≥ 0.06 (US), session 180 s, IAP conv D30 ≥ 4%.

---

## 2. Core gameplay mechanika

- **Layout:** közép kör betű-paletta (4–7 betű level-függő), felül üres szó-rácsok (hossz szerint).
- **Input:** drag connect szomszédos betűken (radial neighbour). Engedd el → ellenőrzés a szótárban.
- **Találat:** ha érvényes és listázott szó → betölt a megfelelő rácsba, coin reward = `5 + szóhossz · 2`.
- **Bonus szó:** érvényes szó, de nem listázott → bonus jar pottyan, 5 db után 1 hint reward.
- **Hint rendszer:**
  - `Reveal letter` 25 coin
  - `Reveal word` 75 coin
  - `Shuffle` ingyenes (nem segít, csak random keverés)
- **Level complete:** összes fő szó megtalálva → 3 csillag rating, coin reward.
- **Formulák:**
  - Betű-szám: `B(n) = min(8, 4 + floor(n/15))`.
  - Fő szavak: `W(n) = 3 + floor(n/5)`.
  - Min hossz: 3 betű. Max hossz: betű-szám.
- **Daily Word puzzle:** napi seed, mindenki ugyanazt játssza, külön leaderboard.
- **Téma-pakkok:** Állatok, Ételek, Országok, Filmek, Zene — minden téma 50 szint, IAP-pal vagy progresszióval unlock.
- **DDA:** ha 90 sec inaktivitás → auto „free hint" offer (rewarded ad).

---

## 3. Frontend architektúra — React + Canvas / SVG

- **Stack:** React 19 + TS + Vite + Zustand + Howler + TanStack Query + framer-motion.
- **Render:** SVG line-draw a betű-összekötéshez (kis adat, retina-éles). Betű-paletta CSS Grid + transform animáció.
- **Projektstruktúra:**

```
src/games/word-linker/app/
├── engine/
│   ├── DictionaryService.ts        # szótár lookup, lazy load per nyelv
│   ├── LetterPalette.ts            # kör radial layout
│   ├── DragLineSystem.ts           # SVG path animation
│   ├── ScoreSystem.ts
│   ├── HintSystem.ts
│   └── Audio.ts
├── components/
│   ├── LetterCircle.tsx
│   ├── WordGrid.tsx                # felső szó-kockák
│   ├── BonusJar.tsx
│   ├── HintButton.tsx
│   ├── LevelCompleteModal.tsx
│   └── DailyWordBanner.tsx
├── screens/
│   ├── MainMenu.tsx
│   ├── PlayScreen.tsx
│   ├── ThemesScreen.tsx
│   ├── DailyWordScreen.tsx
│   ├── LeaderboardScreen.tsx
│   └── Settings.tsx
├── data/
│   ├── levels.json                 # generált pakkok
│   └── themes.json
├── locales/
│   ├── en/dict.bin                 # CDN-served, shard-elt
│   ├── es/dict.bin
│   └── …
├── lib/{ads,iap,analytics,i18n,rng}.ts
└── styles/
```

- **Asset budget:** app maga <8 MB, szótárak CDN-ről lazy-load per nyelv.
- **Reszponzív:** mobile-first portrait, tablet: kör nagyobb.
- **Accessibility:** keyboard nav (tab + space), screen-reader: minden betű `aria-label`, talált szavak announced.
- **Performance:** 60 FPS könnyű (csak SVG + DOM), <100 MB RAM.

---

## 4. Backend és adat-persistencia (Lovable Cloud)

### 4.1 Adattáblák

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Word Lover',
  country_code text,
  language text default 'en',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "self" on public.profiles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.game_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins int not null default 0,
  current_level int not null default 1,
  completed_levels int[] not null default '{}',
  unlocked_themes text[] not null default array['classic'],
  daily_streak int not null default 0,
  last_daily_login date,
  hints_remaining int not null default 5,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.game_state to authenticated;
grant all on public.game_state to service_role;
alter table public.game_state enable row level security;
create policy "self" on public.game_state for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.daily_word (
  date date primary key,
  language text not null,
  seed bigint not null,
  letters text not null,                 -- "FRUIT" letters scrambled
  main_words text[] not null,
  created_at timestamptz not null default now(),
  primary key (date, language)
);
grant select on public.daily_word to authenticated, anon;
grant all on public.daily_word to service_role;
alter table public.daily_word enable row level security;
create policy "public read" on public.daily_word for select to authenticated, anon using (true);

create table public.daily_word_results (
  user_id uuid not null references auth.users(id),
  date date not null,
  language text not null,
  found_words text[] not null,
  bonus_words int not null,
  time_ms int not null,
  hints_used int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, date, language)
);
grant select, insert, update on public.daily_word_results to authenticated;
grant all on public.daily_word_results to service_role;
alter table public.daily_word_results enable row level security;
create policy "self" on public.daily_word_results for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.iap_receipts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id),
  product_id text not null,
  store text not null,
  receipt text not null,
  state text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert on public.iap_receipts to authenticated;
grant all on public.iap_receipts to service_role;
alter table public.iap_receipts enable row level security;
create policy "self r" on public.iap_receipts for select to authenticated using (auth.uid() = user_id);
create policy "self i" on public.iap_receipts for insert to authenticated with check (auth.uid() = user_id);

create table public.ad_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id),
  placement text not null,
  state text not null,
  created_at timestamptz not null default now()
);
grant insert on public.ad_events to authenticated;
grant all on public.ad_events to service_role;
alter table public.ad_events enable row level security;
create policy "self i" on public.ad_events for insert to authenticated with check (auth.uid() = user_id);
```

### 4.2 Edge Functions

- `GET /functions/v1/daily-word?lang=en` — visszaadja a mai szót, betűket, fő szavakat (per nyelv).
- `POST /functions/v1/submit-daily-result` — beküldi az eredményt, leaderboard insert.
- `POST /functions/v1/validate-word?word=&lang=` — szerver-oldali validáció (anti-cheat, ne lehessen a kliens-szótárt manipulálni).
- `POST /functions/v1/validate-iap` — receipt check.

### 4.3 Szótár-architektúra

- Lokálisan compressed Trie (per nyelv, ~1.5 MB gz).
- Lazy load CDN-ről első play-nél.
- Server-side validáció Daily Wordnél, hogy minden talált szó valódi.

---

## 5. AI és intelligencia rétegek

### 5.1 AI-generated level pack

Edge cron naponta `100 új level`-t generál per nyelv:

```ts
const prompt = `Generate 10 levels for a Word Linker game in ${lang}.
Each level: pick 5-7 letters such that 4-8 valid words can be formed (length 3-7).
Output JSON array: [{letters: 'EFGRRU', mainWords: ['urge','rug','fur','ref','rue']}].
Difficulty grading: easy (3-letter only), medium, hard.`;

const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: { 'Lovable-API-Key': Deno.env.get('LOVABLE_API_KEY')!, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'google/gemini-3-flash-preview',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  }),
});
```

Validáció: minden szó a szótárban → ha nem, drop és re-generate.

### 5.2 Smart hint

- Ha 90 sec inaktív → tooltip: „Free hint?" → rewarded ad → reveal letter.
- Ha user hint-et használ ugyanazon a leveln 3×, surface „Hint pack" IAP.

### 5.3 Daily Word AI-generated theme

Naponta egy „téma-szó" (pl. FRUIT, ANIMAL, COLOR). AI generálja a betű-szettet és az érvényes szavak listáját, server validálja a szótár ellen, és menti `daily_word` táblába napi cronnal.

### 5.4 Churn prediction

- `days_since_last_play ≥ 3 && current_level ≥ 30` → push „A daily wordöd vár! +50 coin" + win-back offer.

### 5.5 Anti-cheat

- Daily Word eredmény validáció: `found_words` minden eleme valódi szó (server dict).
- `time_ms < threshold && hints_used = 0` → flag manual review.

---

## 6. Monetizáció

### 6.1 Rewarded

| Key | Trigger | Reward |
|-----|---------|--------|
| `free_hint` | level közben | 1 reveal letter |
| `free_shuffle` | level közben | 1 shuffle |
| `double_coins` | level complete | 2× |
| `daily_spin` | menu | 10–500 coin |
| `unlock_theme_preview` | themes screen | 3 free level a témából |

### 6.2 Interstitial

- Minden 3. level complete után, capping 60 sec.
- D0 user: 0 interstitial.

### 6.3 IAP

| Product | Tier | Ár | Tartalom |
|---------|------|----|---------|
| `coins.small` | cons | 0.99 | 200 |
| `coins.medium` | cons | 4.99 | 1500 |
| `hints.50` | cons | 1.99 | 50 hint |
| `theme.bundle.foods` | non-cons | 2.99 | 50 ételek-téma szint |
| `theme.bundle.movies` | non-cons | 4.99 | 50 filmek-téma szint |
| `noads` | non-cons | 2.99 | nincs interstitial |
| `vip.subscription` | sub | 4.99/hó | no-ads + 100 coin/nap + exclusive theme |

### 6.4 FTUE funnel

| Lépés | Esemény | Cél |
|-------|---------|-----|
| App open | `app_open` | 100% |
| First word found | `first_word` | ≥ 95% |
| First level complete | `level_complete level=1` | ≥ 92% |
| Reach level 10 | `level_complete level=10` | ≥ 60% |
| First rewarded | `rwd_completed` | ≥ 38% |
| First IAP impression | `iap_impression` | ≥ 25% |
| First IAP purchase | `iap_purchase` | ≥ 3% |

### 6.5 LTV

`LTV(30) ≥ 0.9 USD T1` (kávés-szegmens magasabb LTV).

---

## 7. ASO, lokalizáció, performance, launch

### 7.1 ASO

| Piac | Primary | Secondary |
|------|---------|-----------|
| US | `word game`, `word puzzle`, `connect letters` | `crossword`, `brain training` |
| UK | `word puzzle`, `wordlinker` | `brain game` |
| DE | `wort puzzle`, `wörter verbinden` | `kreuzworträtsel` |
| ES | `juego palabras`, `conectar letras` | `crucigrama` |
| BR | `palavras cruzadas`, `puzzle palavras` | `passatempo` |

### 7.2 Store-listing

- **Title:** Word Linker: Connect Words
- **Subtitle:** Cozy word puzzles, every day.
- **Screenshots:** Daily Word → Find all words → Bonus jar → Level complete 3-star → Themes
- **Video preview:** 25 sec, slow + relaxing.

### 7.3 Lokalizáció

8 nyelv natívan saját szótárral: EN, ES, PT-BR, FR, DE, IT, HU, TR.

### 7.4 Viralitás

- Share Daily Word eredmény (Wordle-stílusú emoji rács).
- Téma-szerű puzzle: „today's theme FRUIT, I found 12 words — try it".
- Invite reward: +50 coin.

### 7.5 Push notifications

| Trigger | Időzítés |
|---------|----------|
| Daily Word ready | local 09:00 |
| Streak about to break | local 19:00 |
| Win-back 3d | local 18:00 |

### 7.6 Soft launch

- Piac: Kanada, Új-Zéland.
- 3 hét.
- Gate: D1 ≥ 40%, D7 ≥ 22%, ARPDAU ≥ 0.04.

### 7.7 Global launch checklist

- [ ] Privacy & terms.
- [ ] Age rating 4+ (Everyone).
- [ ] GDPR consent (UMP).
- [ ] Account-delete endpoint.
- [ ] App-thinning.
- [ ] Crash reporting.
- [ ] Localized screenshots (8 nyelv).

### 7.8 KPI

| Metrika | T1 | T3 |
|---------|----|----|
| D1 | 45% | 35% |
| D7 | 25% | 16% |
| D30 | 12% | 6% |
| ARPDAU | 0.06 | 0.018 |
| IAP conv D30 | 4% | 1.2% |

### 7.9 Performance budget

| Eszköz | RAM | FPS | Cold start |
|--------|-----|-----|-----------|
| Android low | 220 MB | 30 | <3s |
| Android mid | 320 MB | 60 | <2s |
| iPhone SE 2 | 300 MB | 60 | <1.5s |

### 7.10 QA

- 8 device-class.
- 8 nyelvű szótár load.
- Offline mode (cached pack).
- Background mid-level.

### 7.11 GDPR / COPPA

- Designed for Families alkalmas (kid-safe build külön).
- GDPR consent, delete endpoint.

### 7.12 Post-launch roadmap

- +4 hét: Halloween téma-pakk.
- +8 hét: VIP subscription bevezetés.
- +12 hét: Multiplayer word-race (béta).
- +16 hét: Daily Word global tournament.
- +24 hét: Új nyelv: JA, KO.

---

## Záró megjegyzés a fejlesztő AI számára

Sprintek:
1. Betű-kör + drag + dictionary lookup + 1 nyelv.
2. Level packaging + level complete + coin + hint rendszer.
3. Lovable Cloud auth + daily word + leaderboard.
4. Téma-pakkok + IAP + rewarded ads.
5. AI-generated level pack pipeline.
6. Lokalizáció (top 4) + Capacitor + ASO.

Sikeres ha: D1 ≥ 40% soft-launch, IAP conv D7 ≥ 3%, crash-free ≥ 99.5%.
