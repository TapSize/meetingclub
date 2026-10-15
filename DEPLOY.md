# Публикация DURY и настройка Cloudflare TURN

GitHub Pages публикует статический сайт. Cloudflare Worker с TURN-ключом разворачивается отдельно. API-токен Cloudflare нельзя добавлять в GitHub или `turn-config.js`.

## 1. Отправить проект в GitHub из VS Code

1. Откройте папку проекта `MyMeet` в VS Code.
2. Откройте **Source Control** на левой панели. Если репозиторий ещё не создан, нажмите **Initialize Repository**.
3. Проверьте, что в списке изменений есть `index.html`, `app.js`, `styles.css`, `turn-config.js`, `README.md`, папка `src` с изображениями и папка `cloudflare` с Worker. Не добавляйте пароли или API-токены.
4. Нажмите `+` возле **Changes** или **Stage All Changes**.
5. Введите сообщение, например `Publish DURY meeting app`, и нажмите **Commit**.
6. Нажмите **Publish Branch** или **Sync Changes**. Выберите свой GitHub-аккаунт и имя репозитория. Для простоты можно сделать репозиторий публичным.

## 2. Включить GitHub Pages

1. Откройте репозиторий на GitHub и перейдите в **Settings → Pages**.
2. В **Build and deployment** выберите **Deploy from a branch**.
3. Выберите ветку `main` и папку `/(root)`, затем нажмите **Save**.
4. Дождитесь публикации. Адрес будет примерно `https://ВАШ-ЛОГИН.github.io/ИМЯ-РЕПОЗИТОРИЯ/`.

На этом шаге `turn-config.js` ещё содержит пустой адрес Worker. Сайт откроется, но TURN пока не включён.

## 3. Создать Cloudflare TURN key и Worker

1. В Cloudflare откройте **Calls / Realtime → TURN** и создайте TURN key. Сохраните его ID.
2. Создайте API token с минимальными правами для выпуска TURN credentials. Не используйте Global API Key.
3. Откройте **Workers & Pages → Create → Worker**, создайте Worker и выберите **Edit code**.
4. Скопируйте содержимое `cloudflare/turn-worker.js` в редактор Worker и нажмите **Deploy**.
5. В настройках Worker откройте **Settings → Variables and Secrets** и добавьте:
   - `TURN_KEY_ID` — ID созданного TURN key;
   - `TURN_API_TOKEN` — API token, обязательно как **Secret**;
   - `ALLOWED_ORIGIN` — только origin сайта, например `https://ВАШ-ЛОГИН.github.io` (без имени репозитория и завершающего `/`).
6. Сохраните настройки и снова нажмите **Deploy**. Адрес будет вида `https://ИМЯ-WORKER.ВАШ-АККАУНТ.workers.dev`.

Worker выдаёт короткоживущие credentials. Не публикуйте TURN key или API token. Ограничение Origin помогает браузеру, но само по себе не блокирует прямые запросы к публичному Worker; следите за usage в Cloudflare и настройте rate limit, если Worker будет доступен всем.

## 4. Подключить Worker к сайту

В `turn-config.js` замените пустую строку на URL Worker с путём `/turn-credentials`:

```js
window.DURY_TURN_CREDENTIALS_URL = "https://ИМЯ-WORKER.ВАШ-АККАУНТ.workers.dev/turn-credentials";
```

Сохраните файл, затем в **Source Control** выполните **Stage All Changes → Commit → Sync Changes**. Дождитесь обновления GitHub Pages и проверьте подключение с телефона через мобильный интернет, пока ведущий остаётся в комнате.

Без этого последнего шага Worker не будет использоваться приложением. Если адрес Worker пока не настроен, оставьте значение пустым: приложение продолжит работать с текущей ICE-конфигурацией PeerJS.

Официальная инструкция Cloudflare: <https://developers.cloudflare.com/realtime/turn/generate-credentials/>.
