# Chrome Web Store — тексты для заполнения карточки

Копируйте блоки как есть. Замените `YOUR-DOMAIN` на домен сайта (например `scanx.vercel.app`).

---

## Вкладка «Store listing» (Описание в магазине)

**Name** (берётся из manifest автоматически)
```
ScanX — Solana CA Scanner for X
```

**Summary** (берётся из manifest, ≤132 символа)
```
Finds Solana contract addresses in tweets and opens an instant risk report on ScanX in one click.
```

**Description** (English)
```
ScanX finds Solana contract addresses (CAs) right inside your X / Twitter feed and puts a small scan button next to each one. One click opens a full ScanX report — so you can check a token before you ape.

WHAT YOU GET
• Automatic detection of Solana CAs in tweets, replies, quote tweets, links (DexScreener, pump.fun…) and profile bios
• A clean scan button that fits X's Default, Dim and Lights-out themes
• One click → full report: risk score 0–100 with every point explained, mint & freeze authority, top-10 holders (LP excluded), liquidity, market cap, volume, token age, and links to DexScreener, Birdeye, GMGN and Solscan
• Works with infinite scroll — new tweets are scanned as they load
• Toolbar popup: status on the current page, quick scan for any CA, settings, recent scans

SMART DETECTION
Only real Solana addresses are matched: text must be valid base58 that decodes to exactly 32 bytes. Transaction hashes and random long words are ignored.

PRIVACY FIRST
• Page text is analyzed locally in your browser and never sent anywhere
• Only one permission: storage (for your settings and optional local history)
• No analytics, no tracking, no ads

Not financial advice. The risk score is a heuristic based on public on-chain data — always DYOR.
```

**Description** (Русский — добавьте как второй язык, если хотите)
```
ScanX находит контрактные адреса Solana (CA) прямо в ленте X / Twitter и ставит рядом с каждым маленькую кнопку. Один клик — и открывается полный отчёт ScanX, чтобы проверить токен до покупки.

ЧТО ВНУТРИ
• Автопоиск CA в твитах, ответах, цитатах, ссылках (DexScreener, pump.fun…) и био профилей
• Аккуратная кнопка под любую тему X: светлую, Dim и Lights out
• Один клик → полный отчёт: риск-скор 0–100 с объяснением каждого балла, mint и freeze authority, топ-10 холдеров (без LP), ликвидность, капитализация, объём, возраст токена, ссылки на DexScreener, Birdeye, GMGN и Solscan
• Работает с бесконечной лентой — новые твиты проверяются при подгрузке
• Popup: статус на странице, быстрый анализ любого CA, настройки, недавние проверки

УМНОЕ РАСПОЗНАВАНИЕ
Срабатывает только на настоящие адреса Solana: base58, который декодируется ровно в 32 байта. Хэши транзакций и длинные слова игнорируются.

ПРИВАТНОСТЬ
• Текст страницы анализируется локально в браузере и никуда не отправляется
• Одно разрешение: storage (настройки и локальная история)
• Без аналитики, трекинга и рекламы

Не финансовый совет. Риск-скор — эвристика по публичным on-chain данным. DYOR.
```

**Category:** `Tools` (раздел Productivity) — или `Developer Tools`
**Language:** English

**Graphic assets** (файлы в этой папке):
| Поле | Файл |
|---|---|
| Store icon 128×128 | `../icons/icon-128.png` |
| Screenshots 1280×800 (1–5) | `screenshot-1-feed.png`, `screenshot-2-report.png`, `screenshot-3-popup.png` |
| Small promo tile 440×280 | `promo-small-440x280.png` |
| Marquee promo tile 1400×560 (необязательно) | `promo-marquee-1400x560.png` |

**Official URL / Homepage URL:** `https://YOUR-DOMAIN`
**Support URL:** `https://github.com/Cryptanyd/lottery-mini-app/issues` (или e-mail/Telegram)

---

## Вкладка «Privacy» (Конфиденциальность)

**Single purpose description**
```
ScanX detects Solana contract addresses in posts on X (Twitter) and lets the user open a risk report for a detected address on the ScanX website in one click.
```

**Permission justification → storage**
```
Used to save the user's extension settings (on/off, scan bios, open in background, keep history) and an optional local list of recently opened addresses. Nothing leaves the device.
```

**Host permission justification** (спросят из-за content script на x.com / twitter.com)
```
The content script runs only on x.com and twitter.com to find Solana contract addresses in post text and add a scan button next to them. Page content is processed locally and is never transmitted.
```

**Are you using remote code?** → `No, I am not using remote code`

**Data usage** — НЕ отмечайте ни одного типа данных (расширение ничего не собирает).
Отметьте все три подтверждения:
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**
```
https://YOUR-DOMAIN/privacy
```

---

## Вкладка «Distribution»
- **Visibility:** Public (или Unlisted — доступ только по ссылке, удобно для первого теста)
- **Regions:** All regions
- **Pricing:** Free (монетизация — через Pro на сайте)
