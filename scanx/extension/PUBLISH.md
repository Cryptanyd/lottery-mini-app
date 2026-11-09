# Публикация ScanX в Chrome Web Store — пошагово

Всё нужное уже готово:
- ZIP собирается одной командой с вашим доменом;
- скриншоты и промо-плитки нужных размеров лежат в `store/`;
- тексты карточки и ответы для вкладки Privacy — в `store/LISTING.md`;
- страница политики конфиденциальности есть на сайте: `/privacy`.

## Шаг 0. Задеплойте сайт (обязательно до отправки)
Расширение открывает отчёты на вашем сайте, а проверяющие Google это кликают.
1. https://vercel.com → **Add New → Project** → импортируйте репозиторий `lottery-mini-app`.
2. **Root Directory**: `scanx/web`.
3. **Environment Variables**: минимум `SOLANA_RPC_URL` (бесплатный ключ Helius), `LICENSE_SECRET` (`openssl rand -hex 32`), `NEXT_PUBLIC_TREASURY_ADDRESS` (ваш кошелёк для оплат Pro).
4. **Deploy**. Получите домен, например `https://scanx-xxxx.vercel.app` (или привяжите свой).
5. Проверьте: `https://ВАШ-ДОМЕН/privacy` открывается, анализ любого CA работает.

## Шаг 1. Соберите ZIP со своим доменом
```bash
cd scanx/extension
./scripts/pack.sh https://ВАШ-ДОМЕН
# -> dist/scanx-extension-v0.1.0.zip
```
Скрипт подставит домен только в архив, исходники не меняются. Без аргумента он предупредит, что домен — заглушка.

Нет терминала? Откройте `src/shared/config.js`, замените `https://scanx.app` на свой домен и запакуйте в ZIP три пункта: `manifest.json`, `src`, `icons`. В корне архива должен сразу лежать `manifest.json`, без вложенной папки.

## Шаг 2. Проверьте локально (2 минуты)
1. Распакуйте ZIP в папку.
2. `chrome://extensions` → **Режим разработчика** → **Загрузить распакованное** → выберите папку.
3. Откройте x.com, найдите твит с CA, нажмите кнопку-прицел. Должен открыться ваш сайт с отчётом.

## Шаг 3. Аккаунт разработчика
1. https://chrome.google.com/webstore/devconsole — войдите в Google-аккаунт.
2. Примите соглашение и оплатите **разовый взнос $5**.
3. В **Account** укажите контактный e-mail и подтвердите его. Без этого кнопка отправки неактивна.

## Шаг 4. Загрузите расширение
1. **+ New item** → загрузите `dist/scanx-extension-v0.1.0.zip`.
2. **Store listing**: вставьте тексты из `store/LISTING.md`, загрузите иконку, 3 скриншота и промо-плитку из `store/`.
3. **Privacy**: заполните по `store/LISTING.md` (single purpose, обоснование `storage` и host-доступа, «No remote code», три галочки, ссылка `https://ВАШ-ДОМЕН/privacy`).
4. **Distribution**: Public (или Unlisted для теста), Free, All regions.
5. **Submit for review**.

Проверка обычно занимает от 1 до 3 дней, иногда до недели. Статус и письмо придут на e-mail.

## Шаг 5. Edge и Brave
- **Brave** ставит расширения прямо из Chrome Web Store, ничего делать не нужно.
- **Edge**: https://partner.microsoft.com/dashboard/microsoftedge (бесплатно) → тот же ZIP, те же тексты и картинки.

## Обновления
1. Увеличьте `"version"` в `manifest.json` (например `0.1.1`) и `VERSION` в `src/shared/config.js`.
2. `./scripts/pack.sh https://ВАШ-ДОМЕН`.
3. В консоли разработчика: **Package → Upload new package** → **Submit for review**.

## Пересоздать картинки для магазина
```bash
cd scanx/web && npm run dev            # сайт на :3000
cd scanx/extension && node scripts/store-assets.js http://localhost:3000
```
На скриншотах отчёта — вымышленный демо-токен (`scripts/fixtures/demo-report.json`).

## Частые причины отказа и как их избежать
| Причина | Уже учтено |
|---|---|
| Лишние разрешения | Только `storage` |
| Нет политики конфиденциальности | Страница `/privacy` на сайте + `PRIVACY.md` |
| Неясное назначение | Одно назначение, описано в single purpose |
| Удалённый код | Весь JS внутри пакета, без `eval` и внешних скриптов |
| Битые ссылки / нерабочий сайт | Сначала шаг 0: задеплойте сайт |
| Обфусцированный код | Код открытый и читаемый |
