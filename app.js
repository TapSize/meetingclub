(() => {
  const state = {
    peer: null,
    isHost: false,
    roomCode: "",
    hostId: "",
    localStream: null,
    cameraTrack: null,
    rawCameraTrack: null,
    cameraInputId: localStorage.getItem("mymeet-camera-input") || "",
    cameraResolution: [480, 720, 1080].includes(Number(localStorage.getItem("mymeet-camera-resolution"))) ? Number(localStorage.getItem("mymeet-camera-resolution")) : 720,
    cameraSettingsPending: false,
    cameraBackgroundMode: localStorage.getItem("mymeet-camera-background-mode") || "none",
    cameraBackgroundImage: localStorage.getItem("mymeet-camera-background-image") || "",
    cameraProcessor: null,
    segmentationLoad: null,
    audioInputId: localStorage.getItem("mymeet-audio-input") || "",
    audioOutputId: localStorage.getItem("mymeet-audio-output") || "",
    soundsEnabled: localStorage.getItem("dury-ui-sounds") !== "false",
    soundContext: null,
    meterContext: null,
    speakerMeters: new Map(),
    speakerInterval: null,
    qualityInterval: null,
    screenTrack: null,
    screenAudioTrack: null,
    mediaReady: Promise.resolve(),
    micOn: false,
    cameraOn: false,
    screenOn: false,
    mirrorOn: localStorage.getItem("mymeet-mirror") === "true",
    avatar: normalizeAvatar(localStorage.getItem("mymeet-avatar")) || "🌙",
    selectedAvatar: normalizeAvatar(localStorage.getItem("mymeet-avatar")) || "🌙",
    theme: localStorage.getItem("mymeet-theme") === "day" ? "day" : "night",
    language: ["ru", "uk", "en"].includes(localStorage.getItem("dury-language")) ? localStorage.getItem("dury-language") : "ru",
    glowOn: false,
    glowColor: "#c5683c",
    glowWidth: Math.min(12, Math.max(1, Number(localStorage.getItem("mymeet-glow-width")) || 4)),
    glowStrength: 58,
    layout: "grid",
    focusId: "",
    openPanel: "",
    messages: [],
    unreadMessages: 0,
    participants: new Map(),
    calls: new Map(),
    dataConnections: new Map(),
    startTime: 0,
    clockInterval: null,
    toastTimer: null,
      dragId: null,
      tileSizes: new Map(),
      tilePositions: new Map(),
  };

  const phraseTranslations = [
    ["DURY / ВИДЕОСВЯЗЬ", "DURY / ВІДЕОЗВ’ЯЗОК", "DURY / VIDEO CALLS"],
    ["DURY / НЕДАВНИЕ", "DURY / НЕДАВНІ", "DURY / RECENT"],
    ["DURY / ROOM", "DURY / КІМНАТА", "DURY / ROOM"],
    ["DURY / WEB", "DURY / WEB", "DURY / WEB"],
    ["Всегда", "Завжди", "Always"], ["рядом.", "поруч.", "close."],
    ["Создавайте встречи и подключайтесь по коду.", "Створюйте зустрічі та долучайтеся за кодом.", "Create meetings and join with a code."],
    ["Главная", "Головна", "Home"], ["Недавние", "Недавні", "Recent"], ["Профиль", "Профіль", "Profile"],
    ["Новая встреча", "Нова зустріч", "New meeting"], ["Создать комнату", "Створити кімнату", "Create a room"],
    ["Создать встречу", "Створити зустріч", "Create meeting"], ["Войти по коду", "Увійти за кодом", "Join with a code"],
    ["Присоединиться к комнате", "Долучитися до кімнати", "Join a room"], ["Код встречи", "Код зустрічі", "Meeting code"],
    ["Войти", "Увійти", "Join"], ["Недавние встречи", "Недавні зустрічі", "Recent meetings"],
    ["Недавних встреч пока нет", "Недавніх зустрічей поки немає", "No recent meetings"],
    ["Встреча", "Зустріч", "Meeting"], ["Встреча создана", "Зустріч створено", "Meeting created"], ["Подключено", "Підключено", "Connected"],
    ["Сетка", "Сітка", "Grid"], ["Активный участник", "Активний учасник", "Active speaker"], ["Лента", "Стрічка", "Filmstrip"],
    ["Ожидание участников", "Очікування учасників", "Waiting for participants"], ["Скопировать приглашение", "Скопіювати запрошення", "Copy invite"],
    ["УЧАСТНИКИ", "УЧАСНИКИ", "PARTICIPANTS"], ["Участники", "Учасники", "Participants"], ["Чат", "Чат", "Chat"],
    ["Люди", "Люди", "People"], ["На связи", "На зв’язку", "Connected"], ["Это вы", "Це ви", "You"],
    ["Микрофон", "Мікрофон", "Microphone"], ["Камера", "Камера", "Camera"], ["Экран", "Екран", "Screen"],
    ["Эффекты", "Ефекти", "Effects"], ["Выйти", "Вийти", "Leave"], ["Приватно", "Приватно", "Private"],
    ["Настройки изображения", "Налаштування зображення", "Video settings"], ["Настройки камеры", "Налаштування камери", "Camera settings"],
    ["Зеркальное отображение", "Дзеркальне відображення", "Mirror video"], ["Только для вас", "Лише для вас", "Only for you"],
    ["Подсветка камеры", "Підсвічування камери", "Camera glow"], ["Цветная рамка на изображении", "Кольорова рамка на зображенні", "Colored frame around video"],
    ["Цвет", "Колір", "Color"], ["Ширина", "Ширина", "Width"], ["Яркость", "Яскравість", "Brightness"],
    ["Разрешение", "Роздільна здатність", "Resolution"], ["Фон камеры", "Тло камери", "Camera background"],
    ["Без фона", "Без тла", "No background"], ["Размытие", "Розмиття", "Blur"], ["Изображение", "Зображення", "Image"],
    ["Изображение для фона", "Зображення для тла", "Background image"], ["Изображение не выбрано", "Зображення не вибрано", "No image selected"],
    ["Настройки профиля", "Налаштування профілю", "Profile settings"], ["Имя", "Ім’я", "Name"], ["Фото профілю", "Фото профілю", "Profile photo"],
    ["Загрузить изображение", "Завантажити зображення", "Upload image"], ["Сохранить", "Зберегти", "Save"],
    ["Микрофон и наушники", "Мікрофон і навушники", "Microphone and headphones"], ["Камера и фон", "Камера і тло", "Camera and background"],
    ["Светлая тема", "Світла тема", "Light theme"], ["Тёмная тема", "Темна тема", "Dark theme"],
    ["ЗВУК", "ЗВУК", "AUDIO"], ["Аудиоустройства", "Аудіопристрої", "Audio devices"],
    ["Звуки интерфейса", "Звуки інтерфейсу", "Interface sounds"], ["Подключение, камера и микрофон", "Підключення, камера й мікрофон", "Join, camera and microphone"],
    ["Системный по умолчанию", "Системний за замовчуванням", "System default"], ["Системная по умолчанию", "Системна за замовчуванням", "System default"],
    ["Наушники / динамики", "Навушники / динаміки", "Headphones / speakers"], ["Источник видео", "Джерело відео", "Video input"],
    ["Оригинальный фон", "Оригінальне тло", "Original background"], ["Фон включится при активной камере", "Тло ввімкнеться разом із камерою", "Background starts when camera is on"],
    ["Размытие включится при активной камере.", "Розмиття ввімкнеться разом із камерою.", "Blur starts when camera is on."],
    ["Изображение включится при активной камере.", "Зображення ввімкнеться разом із камерою.", "Image starts when camera is on."],
    ["Сначала загрузите изображение для фона.", "Спочатку завантажте зображення для тла.", "Upload a background image first."],
    ["Размытие включено", "Розмиття ввімкнено", "Background blur enabled"],
    ["Фоновое изображение включено", "Фонове зображення ввімкнено", "Background image enabled"],
    ["Не удалось запустить фон. Проверьте интернет-соединение.", "Не вдалося запустити тло. Перевірте з’єднання з інтернетом.", "Could not start background. Check your internet connection."],
    ["Фон камеры недоступен; используется обычное видео.", "Тло камери недоступне; використовується звичайне відео.", "Camera background unavailable; using original video."],
    ["Настройки камеры применены", "Налаштування камери застосовано", "Camera settings applied"],
    ["Камера включена", "Камеру ввімкнено", "Camera on"], ["Камера выключена", "Камеру вимкнено", "Camera off"],
    ["Микрофон включён", "Мікрофон увімкнено", "Microphone on"], ["Микрофон выключен", "Мікрофон вимкнено", "Microphone off"],
    ["Увімкнути мікрофон", "Увімкнути мікрофон", "Turn microphone on"], ["Вимкнути мікрофон", "Вимкнути мікрофон", "Turn microphone off"],
    ["Увімкнути камеру", "Увімкнути камеру", "Turn camera on"], ["Вимкнути камеру", "Вимкнути камеру", "Turn camera off"],
    ["Увімкнути екран", "Увімкнути екран", "Turn screen sharing on"], ["Вимкнути екран", "Вимкнути екран", "Turn screen sharing off"],
    ["Ви на зв’язку", "Ви на зв’язку", "You are connected"], ["Керування зустріччю", "Керування зустріччю", "Meeting controls"],
    ["Демонстрация экрана", "Демонстрація екрана", "Screen sharing"],
    ["Качество соединения", "Якість з’єднання", "Connection quality"], ["Качество связи", "Якість зв’язку", "Connection quality"],
    ["Ожидание", "Очікування", "Waiting"], ["Стабильная", "Стабільне", "Stable"], ["Средняя", "Середнє", "Fair"], ["Слабая", "Слабке", "Poor"], ["Подключение", "З’єднання", "Connecting"],
    ["Гость", "Гість", "Guest"], ["Организатор", "Організатор", "Host"], ["Участник", "Учасник", "Participant"],
    ["Встреча завершена", "Зустріч завершено", "Meeting ended"],
    ["Начните разговор", "Почніть розмову", "Start a conversation"], ["Сообщения видны всем в комнате", "Повідомлення бачать усі в кімнаті", "Messages are visible to everyone in the room"],
    ["Напишите сообщение…", "Напишіть повідомлення…", "Write a message…"], ["Отправить сообщение", "Надіслати повідомлення", "Send message"],
    ["Изменить имя", "Змінити ім’я", "Change name"], ["Язык интерфейса", "Мова інтерфейсу", "Interface language"],
    ["Выбери микрофон и устройство для звука собеседников.", "Виберіть мікрофон і пристрій для звуку співрозмовників.", "Choose a microphone and an output for participant audio."],
    ["Закрыть", "Закрити", "Close"], ["Закрыть чат", "Закрити чат", "Close chat"], ["Закрыть панель", "Закрити панель", "Close panel"],
    ["Источник микрофона", "Джерело мікрофона", "Microphone input"], ["Устройство воспроизведения", "Пристрій відтворення", "Playback device"],
    ["КОД", "КОД", "CODE"], ["Ваша встреча", "Ваша зустріч", "Your meeting"],
    ["Скопировать приглашение", "Скопіювати запрошення", "Copy invite"], ["Открыть чат", "Відкрити чат", "Open chat"],
    ["Выйти из встречи", "Вийти із зустрічі", "Leave meeting"], ["Завершить встречу", "Завершити зустріч", "End meeting"],
    ["На весь экран", "На весь екран", "Fullscreen"], ["Выйти из полного экрана", "Вийти з повного екрана", "Exit fullscreen"],
    ["Показать экран", "Показати екран", "Share screen"], ["Настройки звука", "Налаштування звуку", "Audio settings"],
    ["Источник камеры", "Джерело камери", "Camera input"], ["Источник видео", "Джерело відео", "Video input"],
    ["Ваша комната", "Ваша кімната", "Your room"], ["Чат встречи", "Чат зустрічі", "Meeting chat"],
    ["Чат зустрічі", "Чат зустрічі", "Meeting chat"], ["Участники встречи", "Учасники зустрічі", "Meeting participants"],
    ["Введите код встречи", "Введіть код зустрічі", "Enter meeting code"],
    ["Введите сообщение…", "Введіть повідомлення…", "Enter a message…"], ["Напиши что-нибудь…", "Напишіть повідомлення…", "Write a message…"],
    ["Войти в эту комнату", "Увійти до цієї кімнати", "Join this room"], ["Войти в комнату", "Увійти до кімнати", "Join room"],
    ["Выбрать язык", "Обрати мову", "Select language"], ["Список участников", "Список учасників", "Participant list"],
    ["ВСТРЕЧА", "ЗУСТРІЧ", "MEETING"], ["ИЗОБРАЖЕНИЕ", "ЗОБРАЖЕННЯ", "VIDEO"], ["ПРОФИЛЬ", "ПРОФІЛЬ", "PROFILE"],
    ["Почніть розмову тут", "Почніть розмову тут", "Start a conversation here"], ["Ваше повідомлення", "Ваше повідомлення", "Your message"],
    ["Напиши щось…", "Напишіть щось…", "Write a message…"], ["Завантажити фото профілю", "Завантажити фото профілю", "Upload profile photo"],
    ["JPG, PNG або WebP · до 5 МБ", "JPG, PNG або WebP · до 5 МБ", "JPG, PNG or WebP · up to 5 MB"],
    ["Повернути аватар за замовчуванням", "Повернути аватар за замовчуванням", "Reset avatar"],
    ["DURY — видеовстречи", "DURY — відеозустрічі", "DURY — video meetings"],
    ["Не удалось загрузить сервис звонков. Проверьте подключение к интернету и обновите страницу.", "Не вдалося завантажити сервіс дзвінків. Перевірте інтернет-з’єднання й оновіть сторінку.", "Could not load the calling service. Check your internet connection and refresh."],
    ["Сервис звонков недоступен", "Сервіс дзвінків недоступний", "Calling service unavailable"],
    ["Код комнаты уже используется", "Код кімнати вже використовується", "Room code is already in use"],
    ["Не удалось подключиться", "Не вдалося підключитися", "Could not connect"],
    ["Встреча завершена", "Зустріч завершено", "Meeting ended"],
    ["Микрофон недоступен. Проверьте разрешение в настройках сайта.", "Мікрофон недоступний. Перевірте дозвіл у налаштуваннях сайту.", "Microphone unavailable. Check site permissions."],
    ["Камера недоступна. Проверьте разрешение в настройках сайта.", "Камера недоступна. Перевірте дозвіл у налаштуваннях сайту.", "Camera unavailable. Check site permissions."],
    ["Выберите файл изображения.", "Виберіть файл зображення.", "Select an image file."],
    ["Размер фонового изображения должен быть меньше 8 МБ.", "Розмір фонового зображення має бути меншим за 8 МБ.", "Background image must be under 8 MB."],
    ["Не удалось открыть это изображение.", "Не вдалося відкрити це зображення.", "Could not open this image."],
    ["Выберите изображение для фона.", "Виберіть зображення для тла.", "Choose a background image."],
    ["Выбор аудиовыхода не поддерживается этим браузером.", "Вибір аудіовиходу не підтримується цим браузером.", "Audio output selection is not supported by this browser."],
    ["Не удалось изменить устройство воспроизведения.", "Не вдалося змінити пристрій відтворення.", "Could not change the playback device."],
    ["Не удалось изменить микрофон.", "Не вдалося змінити мікрофон.", "Could not change microphone."],
    ["Не удалось сохранить фон. Выберите файл меньшего размера.", "Не вдалося зберегти тло. Виберіть файл меншого розміру.", "Could not save background. Choose a smaller file."],
    ["Фон камеры недоступен; используется обычное видео.", "Тло камери недоступне; використовується звичайне відео.", "Camera background unavailable; using original video."],
    ["Не удалось включить полный экран.", "Не вдалося ввімкнути повний екран.", "Could not enter fullscreen."],
    ["Полный экран не поддерживается этим браузером.", "Повний екран не підтримується цим браузером.", "Fullscreen is not supported by this browser."]
  ];
  const translationMap = new Map();
  phraseTranslations.forEach(([ru, uk, en]) => {
    translationMap.set(ru, { uk, en });
    translationMap.set(uk, { ru, en });
    translationMap.set(en, { ru, uk });
  });
  const translatedTextNodes = new Map();
  const translatedAttributes = new WeakMap();

  const $ = (selector) => document.querySelector(selector);
  const homeView = $("#homeView");
  const meetingView = $("#meetingView");
  const tileGrid = $("#tileGrid");
  const stage = $("#stage");
  const roomInput = $("#roomCodeInput");
  const languageLocales = { ru: "ru-RU", uk: "uk-UA", en: "en-US" };
  const translatePhrase = (source) => {
    const direct = translationMap.get(source)?.[state.language];
    if (direct) return direct;
    if (state.language === "ru") return source;
    if (source.includes("; ")) return source.split("; ").map((part) => translatePhrase(part)).join("; ");
    if (source.startsWith("Войти в комнату ")) {
      const prefix = state.language === "uk" ? "Увійти до кімнати " : "Join room ";
      return `${prefix}${source.slice("Войти в комнату ".length)}`;
    }
    if (source.startsWith("Змінити розмір камери ")) {
      const prefix = state.language === "uk" ? "Змінити розмір камери " : "Resize camera ";
      return `${prefix}${source.slice("Змінити розмір камери ".length)}`;
    }
    if (source.startsWith("КОД ")) return `${state.language === "uk" ? "КОД" : "CODE"} ${source.slice(4)}`;
    if (source.startsWith("Участники: ")) return `${state.language === "uk" ? "Учасники:" : "Participants:"} ${source.slice(11)}`;
    if (source.startsWith("Встреча ")) return `${state.language === "uk" ? "Зустріч" : "Meeting"} ${source.slice(8)}`;
    return source;
  };
  function translateTextNode(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, input, textarea, [data-no-translate], .chat-message, .person-info, .tile-name, #profileName, #meetingName")) return;
    const current = node.nodeValue;
    let record = translatedTextNodes.get(node);
    if (!record || current !== record.rendered) {
      record = { source: current, rendered: current };
      translatedTextNodes.set(node, record);
    }
    const leading = record.source.match(/^\s*/)?.[0] || "";
    const trailing = record.source.match(/\s*$/)?.[0] || "";
    const phrase = record.source.trim();
    const translated = `${leading}${translatePhrase(phrase)}${trailing}`;
    if (current !== translated) node.nodeValue = translated;
    record.rendered = translated;
  }

  function translateAttribute(element, name) {
    const current = element.getAttribute(name);
    if (current === null || element.closest("[data-no-translate]")) return;
    let attributes = translatedAttributes.get(element);
    if (!attributes) {
      attributes = new Map();
      translatedAttributes.set(element, attributes);
    }
    let record = attributes.get(name);
    if (!record || current !== record.rendered) {
      record = { source: current, rendered: current };
      attributes.set(name, record);
    }
    const translated = translatePhrase(record.source);
    if (translated !== current) element.setAttribute(name, translated);
    record.rendered = translated;
  }

  function translateSubtree(root) {
    if (root.nodeType === Node.TEXT_NODE) translateTextNode(root);
    if (root.nodeType === Node.ELEMENT_NODE) {
      ["title", "aria-label", "placeholder"].forEach((name) => translateAttribute(root, name));
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateTextNode(walker.currentNode);
    if (root.nodeType === Node.ELEMENT_NODE) {
      root.querySelectorAll("*").forEach((element) => ["title", "aria-label", "placeholder"].forEach((name) => translateAttribute(element, name)));
    }
  }

  function forgetTranslatedSubtree(root) {
    if (root.nodeType === Node.TEXT_NODE) translatedTextNodes.delete(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translatedTextNodes.delete(walker.currentNode);
  }

  function applyLanguage(language = state.language) {
    state.language = ["ru", "uk", "en"].includes(language) ? language : "ru";
    localStorage.setItem("dury-language", state.language);
    document.documentElement.lang = state.language;
    document.title = translatePhrase("DURY — видеовстречи");
    document.querySelectorAll(".language-select").forEach((select) => { select.value = state.language; });
    const savedName = localStorage.getItem("mymeet-name");
    if (!savedName || ["Гость", "Гість", "Guest"].includes(savedName)) {
      const guestName = translatePhrase("Гость");
      $("#profileName").textContent = guestName;
      $("#meetingName").textContent = guestName;
      const local = state.participants.get("local");
      if (local) {
        local.name = guestName;
        renderParticipants();
        renderTiles();
        broadcast({ type: "profile", peerId: state.peer?.id, name: guestName, avatar: state.avatar });
      }
    }
    translatedTextNodes.forEach((record, node) => {
      if (!node.isConnected) return;
      const leading = record.source.match(/^\s*/)?.[0] || "";
      const trailing = record.source.match(/\s*$/)?.[0] || "";
      const translated = `${leading}${translatePhrase(record.source.trim())}${trailing}`;
      node.nodeValue = translated;
      record.rendered = translated;
    });
    translateSubtree(document.body);
  }

  const translationObserver = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === "characterData") translateTextNode(record.target);
      if (record.type === "attributes") translateAttribute(record.target, record.attributeName);
      if (record.type === "childList") {
        record.removedNodes.forEach(forgetTranslatedSubtree);
        record.addedNodes.forEach(translateSubtree);
      }
    });
  });
  translationObserver.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["title", "aria-label", "placeholder"] });
  const heroLogo = $("#heroLogo");
  const showHeroLogoFallback = () => {
    heroLogo.classList.add("hidden");
    $("#heroLogoFallback").classList.remove("hidden");
  };
  heroLogo.addEventListener("error", showHeroLogoFallback);
  if (heroLogo.complete && !heroLogo.naturalWidth) showHeroLogoFallback();
  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function applyTheme() {
    document.body.dataset.theme = state.theme;
    $("#themeColor").content = state.theme === "night" ? "#17191b" : "#e5e7e2";
    const label = state.theme === "night" ? "Светлая тема" : "Тёмная тема";
    document.querySelectorAll(".theme-toggle").forEach((button) => {
      button.title = label;
      button.setAttribute("aria-label", label);
      button.innerHTML = `<i data-lucide="${state.theme === "night" ? "sun" : "moon"}"></i>`;
    });
    refreshIcons();
  }

  function toggleTheme() {
    state.theme = state.theme === "night" ? "day" : "night";
    localStorage.setItem("mymeet-theme", state.theme);
    applyTheme();
  }

  function toast(message) {
    const node = $("#toast");
    node.textContent = translatePhrase(message);
    node.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => node.classList.remove("show"), 2500);
  }

  function prepareSoundContext() {
    if (!state.soundsEnabled) return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try {
      state.soundContext ||= new AudioContextClass();
      if (state.soundContext.state === "suspended") state.soundContext.resume().catch(() => {});
      return state.soundContext;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  function playUiSound(cue) {
    const context = prepareSoundContext();
    if (!context) return;
    const cues = {
      connected: [{ frequency: 587, duration: 0.1 }, { frequency: 784, duration: 0.14 }],
      micOn: [{ frequency: 660, duration: 0.09 }],
      micOff: [{ frequency: 392, duration: 0.1 }],
      cameraOn: [{ frequency: 523, duration: 0.08 }, { frequency: 659, duration: 0.1 }],
      cameraOff: [{ frequency: 440, duration: 0.1 }],
      disconnected: [{ frequency: 659, duration: 0.09 }, { frequency: 523, duration: 0.1 }, { frequency: 392, duration: 0.13 }]
    }[cue];
    if (!cues) return;

    let startAt = context.currentTime + 0.02;
    cues.forEach(({ frequency, duration }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.045, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.02);
      startAt += duration + 0.045;
    });
  }

  function setError(message = "") {
    $("#joinError").textContent = translatePhrase(message);
  }

  function getName() {
    const name = localStorage.getItem("mymeet-name");
    return !name || ["Гость", "Гість", "Guest"].includes(name) ? translatePhrase("Гость") : name;
  }

  function setName(name) {
    const cleanName = name.trim().slice(0, 28) || translatePhrase("Гость");
    localStorage.setItem("mymeet-name", cleanName);
    $("#profileName").textContent = cleanName;
    $("#meetingName").textContent = cleanName;
    if (state.participants.has("local")) {
      const local = state.participants.get("local");
      local.name = cleanName;
      local.avatar = state.avatar;
      renderTiles();
      updateRoomUI();
      broadcast({ type: "profile", peerId: state.peer?.id, name: cleanName, avatar: state.avatar });
    }
  }

  function normalizeAvatar(value) {
    if (typeof value !== "string") return "";
    if (/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length <= 60000) return value;
    return value.length <= 8 ? value : "";
  }

  function avatarMarkup(value, fallback = "🌙") {
    const avatar = normalizeAvatar(value) || fallback;
    if (avatar.startsWith("data:image/jpeg;base64,")) return `<img src="${escapeHTML(avatar)}" alt="" />`;
    return escapeHTML(avatar);
  }

  function updateAvatarPreview(avatar) {
    $("#avatarPreview").innerHTML = avatarMarkup(avatar);
    $("#resetAvatar").classList.toggle("hidden", !avatar.startsWith("data:image/jpeg;base64,"));
  }

  async function imageFileToAvatar(file) {
    if (!file?.type.startsWith("image/")) {
      toast("Оберіть файл зображення.");
      return "";
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Зображення має бути менше 5 МБ.");
      return "";
    }
    try {
      const image = await createImageBitmap(file);
      const side = Math.min(image.width, image.height);
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      canvas.getContext("2d").drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 128, 128);
      image.close();
      return canvas.toDataURL("image/jpeg", 0.78);
    } catch (error) {
      console.error(error);
      toast("Не вдалося відкрити це зображення.");
      return "";
    }
  }

  async function imageFileToBackground(file) {
    if (!file?.type.startsWith("image/")) {
      toast("Выберите изображение для фона.");
      return "";
    }
    if (file.size > 8 * 1024 * 1024) {
      toast("Размер фонового изображения должен быть меньше 8 МБ.");
      return "";
    }
    try {
      const image = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      canvas.getContext("2d").drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      image.close();
      return canvas.toDataURL("image/jpeg", 0.76);
    } catch (error) {
      console.error(error);
      toast("Не удалось открыть это изображение.");
      return "";
    }
  }

  function getCameraConstraints(deviceId = state.cameraInputId, resolution = state.cameraResolution, exactDevice = false) {
    return {
      ...(deviceId ? { deviceId: exactDevice ? { exact: deviceId } : { ideal: deviceId } } : {}),
      width: { ideal: Math.round(resolution * 16 / 9) },
      height: { ideal: resolution }
    };
  }

  async function loadSelfieSegmentation() {
    if (window.SelfieSegmentation) return window.SelfieSegmentation;
    if (!state.segmentationLoad) {
      state.segmentationLoad = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js";
        script.onload = () => window.SelfieSegmentation ? resolve(window.SelfieSegmentation) : reject(new Error("Segmentation library unavailable"));
        script.onerror = () => reject(new Error("Could not load segmentation library"));
        document.head.append(script);
      });
    }
    return state.segmentationLoad.catch((error) => {
      state.segmentationLoad = null;
      throw error;
    });
  }

  async function startCameraBackground(rawTrack) {
    const SelfieSegmentation = await loadSelfieSegmentation();
    if (state.cameraBackgroundMode === "image" && !state.cameraBackgroundImage) {
      throw new Error("Загрузите изображение для фона.");
    }

    const settings = rawTrack.getSettings();
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(1280, settings.width || Math.round(state.cameraResolution * 16 / 9));
    canvas.height = Math.min(720, settings.height || state.cameraResolution);
    const context = canvas.getContext("2d", { alpha: false });
    const subjectCanvas = document.createElement("canvas");
    subjectCanvas.width = canvas.width;
    subjectCanvas.height = canvas.height;
    const subjectContext = subjectCanvas.getContext("2d");
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream([rawTrack]);
    await video.play();

    let backgroundImage = null;
    if (state.cameraBackgroundMode === "image") {
      backgroundImage = new Image();
      backgroundImage.src = state.cameraBackgroundImage;
      await backgroundImage.decode();
    }

    const segmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
    });
    segmentation.setOptions({ modelSelection: 1 });
    segmentation.onResults((results) => {
      context.save();
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (backgroundImage) {
        const scale = Math.max(canvas.width / backgroundImage.width, canvas.height / backgroundImage.height);
        const width = backgroundImage.width * scale;
        const height = backgroundImage.height * scale;
        context.drawImage(backgroundImage, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      } else {
        context.filter = "blur(20px)";
        context.drawImage(results.image, -16, -16, canvas.width + 32, canvas.height + 32);
        context.filter = "none";
      }
      subjectContext.globalCompositeOperation = "source-over";
      subjectContext.clearRect(0, 0, canvas.width, canvas.height);
      subjectContext.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      subjectContext.globalCompositeOperation = "destination-in";
      subjectContext.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
      subjectContext.globalCompositeOperation = "source-over";
      context.drawImage(subjectCanvas, 0, 0);
      context.restore();
    });

    const outputTrack = canvas.captureStream(24).getVideoTracks()[0];
    const processor = { canvas, video, segmentation, outputTrack, animationFrame: 0, busy: false, closed: false };
    state.cameraProcessor = processor;
    const processFrame = async () => {
      if (processor.closed) return;
      if (video.readyState >= 2 && !processor.busy) {
        processor.busy = true;
        try {
          await segmentation.send({ image: video });
        } catch (error) {
          console.error(error);
        } finally {
          processor.busy = false;
        }
      }
      if (!processor.closed) processor.animationFrame = requestAnimationFrame(processFrame);
    };
    processFrame();
    return outputTrack;
  }

  function stopCameraBackground() {
    const processor = state.cameraProcessor;
    if (!processor) return;
    processor.closed = true;
    cancelAnimationFrame(processor.animationFrame);
    processor.segmentation.close();
    processor.video.pause();
    processor.video.srcObject = null;
    processor.outputTrack.stop();
    state.cameraProcessor = null;
  }

  function setProfile(name, avatar) {
    state.avatar = normalizeAvatar(avatar) || "🌙";
    state.selectedAvatar = state.avatar;
    localStorage.setItem("mymeet-avatar", state.avatar);
    $("#profileAvatar").innerHTML = avatarMarkup(state.avatar);
    $("#homeProfileAvatar").innerHTML = avatarMarkup(state.avatar);
    updateAvatarPreview(state.avatar);
    setName(name);
  }

  function makeCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  }

  function makeHostId(code) {
    return `dury${code.toLowerCase()}`;
  }

  function getRecentRooms() {
    try {
      const rooms = JSON.parse(localStorage.getItem("dury-recent-rooms") || "[]");
      return Array.isArray(rooms) ? rooms.filter((room) => room && typeof room.code === "string" && typeof room.hostId === "string" && /^[A-Z0-9]{5,12}$/.test(room.code) && /^[a-z0-9]{5,40}$/.test(room.hostId)) : [];
    } catch {
      return [];
    }
  }

  function renderRecentRooms() {
    const container = $("#recentRooms");
    if (!container) return;
    const rooms = getRecentRooms();
    $("#recentCount").textContent = rooms.length;
    if (!rooms.length) {
      container.innerHTML = `<p class="recent-empty">Недавних встреч пока нет</p>`;
      return;
    }
    container.innerHTML = rooms.map((room) => {
      const date = new Date(room.visitedAt).toLocaleDateString(languageLocales[state.language], { day: "numeric", month: "short" });
      return `<article class="recent-room"><span class="recent-room-mark"><i data-lucide="video"></i></span><div class="recent-room-info"><strong>Встреча ${escapeHTML(room.code.match(/.{1,3}/g).join(" "))}</strong><small>${escapeHTML(date)}</small></div><button class="recent-room-enter" type="button" data-room-code="${escapeHTML(room.code)}" data-room-host="${escapeHTML(room.hostId)}" title="Войти в эту комнату" aria-label="Войти в комнату ${escapeHTML(room.code)}"><i data-lucide="arrow-up-right"></i></button></article>`;
    }).join("");
    refreshIcons();
  }

  function saveRecentRoom(code, hostId) {
    const rooms = getRecentRooms().filter((room) => room.code !== code);
    rooms.unshift({ code, hostId, visitedAt: Date.now() });
    localStorage.setItem("dury-recent-rooms", JSON.stringify(rooms.slice(0, 6)));
    renderRecentRooms();
  }

  function removeRecentRoom(code) {
    const rooms = getRecentRooms().filter((room) => room.code !== code);
    localStorage.setItem("dury-recent-rooms", JSON.stringify(rooms));
    renderRecentRooms();
  }

  function probeRoom(hostId) {
    return new Promise((resolve) => {
      let probe;
      let finished = false;
      const finish = (active) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        probe?.destroy();
        resolve(active);
      };
      const timeout = setTimeout(() => finish(null), 5000);
      try {
        probe = new Peer();
        probe.on("open", () => {
          const connection = probe.connect(hostId, { reliable: true });
          connection.on("open", () => finish(true));
          connection.on("error", (error) => finish(error.type === "peer-unavailable" ? false : null));
        });
        probe.on("error", (error) => finish(error.type === "peer-unavailable" ? false : null));
      } catch {
        finish(null);
      }
    });
  }

  async function pruneInactiveRecentRooms() {
    if (!window.Peer || !navigator.onLine) return;
    for (const room of getRecentRooms()) {
      if (new URLSearchParams(location.search).has("room")) return;
      if (await probeRoom(room.hostId) === false) removeRecentRoom(room.code);
    }
  }

  function normalizeCode(value) {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  }

  async function openRoom(isHost, code, hostId) {
    if (!window.Peer) {
      setError("Не вдалося завантажити сервіс дзвінків. Перевір підключення до інтернету й онови сторінку.");
      toast("Сервіс дзвінків недоступний");
      return;
    }
    setError("");
    const createButton = $("#createButton");
    createButton.disabled = true;
    createButton.querySelector("span").textContent = isHost ? "Створюємо зустріч…" : "Приєднуємося…";

    try {
      const peer = isHost ? new Peer(hostId) : new Peer();
      state.peer = peer;
      state.isHost = isHost;
      state.roomCode = code;
      state.hostId = hostId;

      peer.on("open", async () => {
        if (!isHost) {
          const connection = peer.connect(hostId, { reliable: true });
          attachDataConnection(connection);
          connection.on("open", () => {
            connection.send({ type: "join", peerId: peer.id, name: getName(), avatar: state.avatar });
            saveRecentRoom(code, hostId);
            showMeeting(code);
            state.mediaReady = enableMedia();
          });
          connection.on("error", () => failJoin());
          setTimeout(() => {
            if (!connection.open && homeView.classList.contains("hidden") === false) failJoin();
          }, 10000);
        } else {
          saveRecentRoom(code, hostId);
          showMeeting(code);
          state.mediaReady = enableMedia();
        }
      });

      peer.on("connection", (connection) => attachDataConnection(connection));
      peer.on("call", (call) => {
        state.mediaReady.then(() => {
          if (state.calls.has(call.peer)) return;
          call.answer(getOutgoingStream());
          attachMediaCall(call);
        });
      });
      peer.on("error", (error) => {
        if (error.type === "unavailable-id") {
          setError("Цей код уже зайнятий. Створи нову кімнату.");
          toast("Код кімнати вже використовується");
          cleanup(false);
          resetCreateButton();
        } else if (error.type === "peer-unavailable" && !isHost) {
          failJoin();
        } else if (error.type === "network" || error.type === "server-error") {
          toast("Проблема із сервером зв’язку. Спробуй ще раз.");
        }
      });
    } catch (error) {
      console.error(error);
      setError("Не вдалося відкрити кімнату. Онови сторінку й спробуй ще раз.");
      resetCreateButton();
    }
  }

  function resetCreateButton() {
    const button = $("#createButton");
    button.disabled = false;
    button.querySelector("span").textContent = "Створити зустріч";
  }

  function failJoin() {
    cleanup(false);
    resetCreateButton();
    setError("Кімнату не знайдено або організатор уже вийшов. Перевір код і спробуй ще раз.");
    toast("Не вдалося приєднатися");
  }

  function showMeeting(code) {
    homeView.classList.add("hidden");
    meetingView.classList.remove("hidden");
    playUiSound("connected");
    $("#roomCodeLabel").textContent = `КОД ${code.match(/.{1,3}/g).join(" ")}`;
    $("#watermarkCode").textContent = code;
    $("#meetingTitle").textContent = state.isHost ? "Встреча создана" : "Подключено";
    $("#profileName").textContent = getName();
    $("#meetingName").textContent = getName();
    $("#profileAvatar").innerHTML = avatarMarkup(state.avatar);
    $("#homeProfileAvatar").innerHTML = avatarMarkup(state.avatar);
    state.startTime = Date.now();
    startConnectionQualityMonitor();
    state.participants.set("local", { name: getName(), avatar: state.avatar, stream: state.screenOn ? getOutgoingStream() : state.localStream, local: true, micOn: state.micOn, cameraOn: state.cameraOn, screenOn: state.screenOn });
    if (state.localStream) startSpeakerMeter("local", state.localStream);
    if (!state.isHost && state.hostId) {
      state.participants.set(state.hostId, { name: "Організатор", avatar: "🌷", stream: null });
    }
    updateRoomUI();
    renderTiles();
    const showDesktopChat = window.matchMedia("(min-width: 761px)").matches;
    meetingView.classList.remove("participants-hidden");
    $("#meetingSidebar").classList.remove("is-open");
    $("#peoplePanel").classList.remove("hidden");
    $("#peopleButton").setAttribute("aria-expanded", String(showDesktopChat));
    if (showDesktopChat) openCallPanel("chat");
    clearInterval(state.clockInterval);
    state.clockInterval = setInterval(updateClock, 1000);
    refreshIcons();
    history.replaceState({}, "", `${location.pathname}?room=${encodeURIComponent(code)}&host=${encodeURIComponent(state.hostId)}`);
  }

  function updateClock() {
    const seconds = Math.floor((Date.now() - state.startTime) / 1000);
    const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    $("#meetingClock").textContent = time;
    $("#callTimer").textContent = time;
  }

  function mediaErrorHint(error) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") return "Дозволь доступ у налаштуваннях сайту біля адресного рядка.";
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") return "Перевір, чи пристрій під’єднаний.";
    if (error.name === "NotReadableError" || error.name === "TrackStartError") return "Закрий інші програми, які можуть використовувати пристрій.";
    if (error.name === "OverconstrainedError") return "Перевір налаштування пристрою.";
    return "Перевір дозволи браузера та налаштування приватності системи.";
  }

  async function enableMedia() {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      toast("Камера й мікрофон працюють лише через HTTPS або localhost.");
      return;
    }

    const tracks = [];
    const failures = [];
    let audioTrack = null;
    let videoTrack = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: state.audioInputId ? { deviceId: { ideal: state.audioInputId } } : true
      });
      audioTrack = stream.getAudioTracks()[0] || null;
      if (audioTrack) {
        const actualDeviceId = audioTrack.getSettings().deviceId;
        if (actualDeviceId && state.audioInputId && actualDeviceId !== state.audioInputId) {
          state.audioInputId = actualDeviceId;
          localStorage.setItem("mymeet-audio-input", actualDeviceId);
        }
      }
      if (audioTrack) tracks.push(audioTrack);
    } catch (error) {
      failures.push({ device: "Мікрофон", error });
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: getCameraConstraints() });
      videoTrack = stream.getVideoTracks()[0] || null;
      if (videoTrack) tracks.push(videoTrack);
    } catch (error) {
      failures.push({ device: "Камера", error });
    }

    if (tracks.length === 0) {
      const failure = failures.find(({ error }) => error.name === "NotAllowedError" || error.name === "PermissionDeniedError") || failures[0];
      if (failure) toast(`${failure.device}: ${mediaErrorHint(failure.error)}`);
      updateControlButtons();
      return;
    }

    state.localStream = new MediaStream(tracks);
    state.cameraTrack = videoTrack;
    state.rawCameraTrack = videoTrack;
    state.micOn = Boolean(audioTrack);
    state.cameraOn = Boolean(videoTrack);
    state.participants.set("local", { name: getName(), avatar: state.avatar, stream: state.localStream, local: true, micOn: state.micOn, cameraOn: state.cameraOn, screenOn: state.screenOn });
    startSpeakerMeter("local", state.localStream);
    if (videoTrack && state.cameraBackgroundMode !== "none") await replaceOutgoingCameraTrack(videoTrack);
    updateControlButtons();
    renderTiles();
    updateRoomUI();
    broadcastMediaStatus();
    broadcast({ type: "name", name: getName() });

    if (failures.length) {
      const failure = failures[0];
      toast(`${failure.device} недоступний. ${mediaErrorHint(failure.error)}`);
    }
  }

  async function refreshAudioDevices() {
    const inputSelect = $("#audioInputSelect");
    const outputSelect = $("#audioOutputSelect");
    const cameraSelect = $("#cameraInputSelect");
    const note = $("#audioDeviceNote");
    if (!navigator.mediaDevices?.enumerateDevices) {
      inputSelect.disabled = true;
      outputSelect.disabled = true;
      cameraSelect.disabled = true;
      note.textContent = "Цей браузер не надає список аудіопристроїв.";
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((device) => device.kind === "audioinput");
      const outputs = devices.filter((device) => device.kind === "audiooutput");
      const cameras = devices.filter((device) => device.kind === "videoinput");
      const fillSelect = (select, items, selectedId, defaultLabel) => {
        select.replaceChildren(new Option(defaultLabel, ""));
        items.forEach((device, index) => {
          const option = new Option(device.label || `Пристрій ${index + 1}`, device.deviceId);
          select.add(option);
        });
        select.value = items.some((device) => device.deviceId === selectedId) ? selectedId : "";
      };
      fillSelect(inputSelect, inputs, state.audioInputId, "Системний за замовчуванням");
      fillSelect(outputSelect, outputs, state.audioOutputId, "Системний за замовчуванням");
      fillSelect(cameraSelect, cameras, state.cameraInputId, "Системная по умолчанию");
      cameraSelect.disabled = cameras.length === 0;

      const outputSupported = typeof HTMLMediaElement.prototype.setSinkId === "function";
      outputSelect.disabled = !outputSupported || outputs.length === 0;
      const notes = [];
      if (!outputSupported) notes.push("Вибір аудіовиходу не підтримується цим браузером.");
      if ([...inputs, ...outputs, ...cameras].some((device) => !device.label)) notes.push("Названия устройств появятся после разрешения на доступ к камере и микрофону.");
      note.textContent = notes.join(" ");
      $("#cameraResolutionSelect").value = String(state.cameraResolution);
      $("#cameraBackgroundSelect").value = state.cameraBackgroundMode;
      $("#backgroundImageField").classList.toggle("hidden", state.cameraBackgroundMode !== "image");
      $("#backgroundImageName").textContent = state.cameraBackgroundImage ? "Сохранённое изображение" : "Изображение не выбрано";
      $("#cameraSettingsNote").textContent = state.cameraBackgroundMode === "none" ? "Оригинальный фон" : state.cameraBackgroundMode === "blur" ? "Размытие включится при активной камере." : "Изображение включится при активной камере.";
    } catch (error) {
      console.error(error);
      note.textContent = "Не вдалося отримати список аудіопристроїв.";
    }
  }

  async function replaceOutgoingCameraTrack(rawTrack) {
    const previousOutput = state.cameraTrack;
    const previousRaw = state.rawCameraTrack;
    stopCameraBackground();
    let outputTrack = rawTrack;
    if (state.cameraBackgroundMode !== "none" && state.cameraOn) {
      try {
        outputTrack = await startCameraBackground(rawTrack);
        $("#cameraSettingsNote").textContent = state.cameraBackgroundMode === "blur" ? "Размытие включено" : "Фоновое изображение включено";
      } catch (error) {
        console.error(error);
        $("#cameraSettingsNote").textContent = "Не удалось запустить фон. Проверьте интернет-соединение.";
        toast("Фон камеры недоступен; используется обычное видео.");
      }
    } else {
      $("#cameraSettingsNote").textContent = state.cameraBackgroundMode === "none" ? "Оригинальный фон" : "Фон включится вместе с камерой";
    }

    rawTrack.enabled = state.cameraOn;
    outputTrack.enabled = state.cameraOn;
    const currentVideo = state.localStream?.getVideoTracks()[0] || null;
    if (currentVideo && currentVideo !== outputTrack) state.localStream.removeTrack(currentVideo);
    if (state.localStream && !state.localStream.getVideoTracks().includes(outputTrack)) state.localStream.addTrack(outputTrack);
    state.rawCameraTrack = rawTrack;
    state.cameraTrack = outputTrack;

    if (currentVideo && currentVideo !== outputTrack && currentVideo !== rawTrack) currentVideo.stop();
    if (previousRaw && previousRaw !== rawTrack) previousRaw.stop();

    if (!state.screenOn) {
      const replacements = Array.from(state.calls.values()).map(async (call) => {
        const sender = getVideoSender(call);
        if (sender) await sender.replaceTrack(state.cameraOn ? outputTrack : null);
      });
      await Promise.allSettled(replacements);
    }
    const local = state.participants.get("local");
    if (local) local.stream = state.screenOn ? getOutgoingStream() : state.localStream;
    updateControlButtons();
    updateRoomUI();
    renderTiles();
    broadcastMediaStatus();
  }

  async function updateCameraSettings(deviceId = state.cameraInputId, resolution = state.cameraResolution) {
    const previousDevice = state.cameraInputId;
    const previousResolution = state.cameraResolution;
    if (!state.localStream || !state.cameraOn) {
      state.cameraInputId = deviceId;
      state.cameraResolution = resolution;
      state.cameraSettingsPending = true;
      localStorage.setItem("mymeet-camera-input", deviceId);
      localStorage.setItem("mymeet-camera-resolution", String(resolution));
      $("#cameraSettingsNote").textContent = "Настройки применятся при следующем включении камеры.";
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: getCameraConstraints(deviceId, resolution, true), audio: false });
      const rawTrack = stream.getVideoTracks()[0];
      if (!rawTrack) throw new Error("No camera track returned");
      state.cameraInputId = deviceId;
      state.cameraResolution = resolution;
      state.cameraSettingsPending = false;
      localStorage.setItem("mymeet-camera-input", deviceId);
      localStorage.setItem("mymeet-camera-resolution", String(resolution));
      await replaceOutgoingCameraTrack(rawTrack);
      toast("Настройки камеры применены");
    } catch (error) {
      console.error(error);
      state.cameraInputId = previousDevice;
      state.cameraResolution = previousResolution;
      $("#cameraInputSelect").value = previousDevice;
      $("#cameraResolutionSelect").value = String(previousResolution);
      toast(`Не удалось применить настройки камеры. ${mediaErrorHint(error)}`);
    }
  }

  async function updateCameraBackground(mode) {
    state.cameraBackgroundMode = mode;
    localStorage.setItem("mymeet-camera-background-mode", mode);
    $("#backgroundImageField").classList.toggle("hidden", mode !== "image");
    if (mode === "image" && !state.cameraBackgroundImage) {
      $("#cameraSettingsNote").textContent = "Сначала загрузите изображение для фона.";
      $("#backgroundImageInput").click();
      return;
    }
    if (state.localStream && state.cameraOn && state.rawCameraTrack) await replaceOutgoingCameraTrack(state.rawCameraTrack);
    else $("#cameraSettingsNote").textContent = mode === "none" ? "Оригинальный фон" : "Фон включится вместе с камерой";
  }

  async function changeAudioInput(deviceId) {
    const previousTrack = state.localStream?.getAudioTracks()[0] || null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false
      });
      const nextTrack = stream.getAudioTracks()[0];
      if (!nextTrack) throw new Error("No audio track returned");
      nextTrack.enabled = previousTrack ? previousTrack.enabled : true;

      const replacements = Array.from(state.calls.values()).map(async (call) => {
        const sender = call.peerConnection?.getSenders().find((item) => item.track === previousTrack);
        if (sender) await sender.replaceTrack(nextTrack);
      });
      await Promise.all(replacements);

      if (previousTrack) state.localStream.removeTrack(previousTrack);
      if (!state.localStream) state.localStream = new MediaStream();
      state.localStream.addTrack(nextTrack);
      startSpeakerMeter("local", state.localStream);
      previousTrack?.stop();
      state.micOn = nextTrack.enabled;
      state.audioInputId = deviceId;
      localStorage.setItem("mymeet-audio-input", deviceId);
      state.participants.set("local", { name: getName(), avatar: state.avatar, stream: state.screenOn ? getOutgoingStream() : state.localStream, local: true, micOn: state.micOn, cameraOn: state.cameraOn, screenOn: state.screenOn });
      updateControlButtons();
      updateRoomUI();
      broadcastMediaStatus();
      renderTiles();
      toast("Мікрофон змінено");
    } catch (error) {
      console.error(error);
      $("#audioInputSelect").value = state.audioInputId;
      toast(`Не вдалося змінити мікрофон. ${mediaErrorHint(error)}`);
    }
  }

  async function changeAudioOutput(deviceId) {
    if (typeof HTMLMediaElement.prototype.setSinkId !== "function") {
      toast("Вибір аудіовиходу не підтримується цим браузером.");
      return;
    }
    try {
      const videos = Array.from(tileGrid.querySelectorAll(".tile:not(.tile-local) video"));
      const results = await Promise.allSettled(videos.map((video) => video.setSinkId(deviceId)));
      if (results.some((result) => result.status === "rejected")) throw new Error("Could not change audio output");
      state.audioOutputId = deviceId;
      localStorage.setItem("mymeet-audio-output", deviceId);
      toast("Пристрій виводу звуку змінено");
    } catch (error) {
      console.error(error);
      $("#audioOutputSelect").value = state.audioOutputId;
      toast("Не вдалося змінити пристрій відтворення.");
    }
  }

  function attachDataConnection(connection) {
    state.dataConnections.set(connection.peer, connection);
    connection.on("data", (message) => handleMessage(connection.peer, message));
    connection.on("close", () => {
      state.dataConnections.delete(connection.peer);
      if (state.isHost) {
        broadcast({ type: "member-left", peerId: connection.peer }, connection.peer);
        state.participants.delete(connection.peer);
        updateRoomUI();
        renderTiles();
      } else if (connection.peer === state.hostId) {
        removeRecentRoom(state.roomCode);
        toast("Встреча завершена");
        cleanup();
      } else removeParticipant(connection.peer);
    });
  }

  function handleMessage(senderId, message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "room-closed" && senderId === state.hostId) {
      removeRecentRoom(state.roomCode);
      cleanup();
      return;
    }
    if (state.isHost && message.type === "join") {
      const members = [{ peerId: state.peer.id, name: getName(), avatar: state.avatar, micOn: state.micOn, cameraOn: state.cameraOn, screenOn: state.screenOn }];
      state.participants.forEach((person, peerId) => {
        if (peerId !== "local" && peerId !== senderId) members.push({ peerId, name: person.name, avatar: person.avatar || "🌙", micOn: Boolean(person.micOn), cameraOn: Boolean(person.cameraOn), screenOn: Boolean(person.screenOn) });
      });
      const sender = state.dataConnections.get(senderId);
      if (sender?.open) sender.send({ type: "members", peers: members });
      if (sender?.open) sender.send({ type: "profile", peerId: state.peer.id, name: getName(), avatar: state.avatar });
      addParticipant(senderId, message.name || "Учасник", message.avatar || "🌙");
      broadcast({ type: "member-joined", peerId: senderId, name: String(message.name || "Учасник").slice(0, 28), avatar: message.avatar || "🌙", micOn: false, cameraOn: false, screenOn: false }, senderId);
      updateRoomUI();
      renderTiles();
      return;
    }
    if (message.type === "members") {
      message.peers.forEach((person) => {
        if (typeof person === "string") addParticipant(person, "Учасник");
        else {
          addParticipant(person.peerId, person.name, person.avatar);
          const participant = state.participants.get(person.peerId);
          if (participant) {
            participant.micOn = Boolean(person.micOn);
            participant.cameraOn = Boolean(person.cameraOn);
            participant.screenOn = Boolean(person.screenOn);
          }
        }
      });
      updateRoomUI();
      renderTiles();
      return;
    }
    if (message.type === "member-joined") {
      addParticipant(message.peerId, message.name || "Учасник", message.avatar || "🌙");
      const participant = state.participants.get(message.peerId);
      if (participant) {
        participant.micOn = Boolean(message.micOn);
        participant.cameraOn = Boolean(message.cameraOn);
        participant.screenOn = Boolean(message.screenOn);
      }
      updateRoomUI();
      renderTiles();
      return;
    }
    if (message.type === "media-status") {
      const peerId = message.peerId || senderId;
      const participant = state.participants.get(peerId);
      if (participant) {
        participant.micOn = Boolean(message.micOn);
        participant.cameraOn = Boolean(message.cameraOn);
        participant.screenOn = Boolean(message.screenOn);
        if (!participant.micOn) setSpeakingIndicator(peerId, false);
        updateRoomUI();
        renderTiles();
      }
      if (state.isHost) broadcast({ ...message, peerId }, senderId);
      return;
    }
    if (message.type === "member-left") {
      removeParticipant(message.peerId);
      return;
    }
    if (message.type === "name") {
      const participant = state.participants.get(senderId);
      if (participant) {
        participant.name = String(message.name || "Учасник").slice(0, 28);
        renderTiles();
      }
      return;
    }
    if (message.type === "profile") {
      const peerId = message.peerId || senderId;
      if (!state.participants.has(peerId) && peerId !== state.peer.id) addParticipant(peerId, message.name, message.avatar);
      const participant = state.participants.get(peerId);
      if (participant) {
        participant.name = String(message.name || "Учасник").slice(0, 28);
        participant.avatar = normalizeAvatar(message.avatar) || participant.avatar || "🌙";
        renderTiles();
        updateRoomUI();
      }
      if (state.isHost) broadcast({ ...message, peerId: senderId }, senderId);
      return;
    }
    if (message.type === "chat") {
      const participant = state.participants.get(senderId);
      const text = String(message.text || "").trim().slice(0, 500);
      if (text) {
        addChatMessage({
          id: `${Date.now()}-${senderId}`,
          name: String(participant?.name || message.name || "Учасник").slice(0, 28),
          avatar: participant?.avatar || message.avatar || "🌙",
          text,
          time: new Date().toLocaleTimeString(languageLocales[state.language], { hour: "2-digit", minute: "2-digit" }),
          own: false
        });
        if (state.isHost) broadcast({ ...message, text, name: participant?.name, avatar: participant?.avatar }, senderId);
      }
    }
  }

  function addParticipant(peerId, name, avatar = "🌙") {
    if (!peerId || peerId === state.peer?.id) return;
    const safeAvatar = normalizeAvatar(avatar) || "🌙";
    const existing = state.participants.get(peerId);
    if (existing) {
      if (name) existing.name = name;
      if (avatar) existing.avatar = safeAvatar;
    } else {
      state.participants.set(peerId, { name: name || "Учасник", avatar: safeAvatar, stream: null });
    }
    if (state.peer.id.localeCompare(peerId) < 0) {
      state.mediaReady.then(() => {
        if (!state.peer || state.calls.has(peerId) || !state.participants.has(peerId)) return;
        const call = state.peer.call(peerId, getOutgoingStream(), { metadata: { name: getName(), avatar: state.avatar } });
        if (call) attachMediaCall(call);
      });
    }
    updateRoomUI();
    renderTiles();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (meetingView.requestFullscreen) await meetingView.requestFullscreen({ navigationUI: "hide" });
      else toast("Повний екран не підтримується цим браузером.");
    } catch (error) {
      console.error(error);
      toast("Не вдалося увімкнути повний екран.");
    }
  }

  function updateFullscreenButton() {
    const isFullscreen = document.fullscreenElement === meetingView;
    const button = $("#fullscreenButton");
    const label = isFullscreen ? "Вийти з повного екрана" : "На весь екран";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<i data-lucide="${isFullscreen ? "minimize" : "maximize"}"></i>`;
    refreshIcons();
  }

  function attachMediaCall(call) {
    state.calls.set(call.peer, call);
    updateConnectionQuality();
    call.on("stream", (stream) => {
      const existing = state.participants.get(call.peer) || { name: call.metadata?.name || "Учасник", avatar: call.metadata?.avatar || "🌙" };
      existing.stream = stream;
      existing.name = existing.name === "Учасник" ? (call.metadata?.name || existing.name) : existing.name;
      existing.avatar = call.metadata?.avatar || existing.avatar || "🌙";
      state.participants.set(call.peer, existing);
      startSpeakerMeter(call.peer, stream);
      renderTiles();
    });
    call.on("close", () => removeParticipant(call.peer));
    call.on("error", () => {
      state.calls.delete(call.peer);
      updateRoomUI();
    });
  }

  function removeParticipant(peerId) {
    const call = state.calls.get(peerId);
    stopSpeakerMeter(peerId);
    state.participants.delete(peerId);
    if (state.focusId === peerId) state.focusId = "";
    state.calls.delete(peerId);
    if (call) call.close();
    updateConnectionQuality();
    updateRoomUI();
    renderTiles();
  }

  function setSpeakingIndicator(peerId, speaking) {
    const participant = state.participants.get(peerId);
    if (participant) participant.isSpeaking = speaking;
    tileGrid.querySelector(`[data-id="${CSS.escape(peerId)}"]`)?.classList.toggle("is-speaking", speaking);
    const row = Array.from($("#peopleList").querySelectorAll(".person-row")).find((item) => item.dataset.person === peerId);
    row?.classList.toggle("is-speaking", speaking);
    row?.querySelector(".mic-indicator")?.classList.toggle("is-speaking", speaking);
  }

  function startSpeakerMeter(peerId, stream) {
    const track = stream?.getAudioTracks()[0];
    if (!track) return stopSpeakerMeter(peerId);
    if (state.speakerMeters.get(peerId)?.track.id === track.id) return;
    stopSpeakerMeter(peerId);

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      state.meterContext ||= state.soundContext || new AudioContextClass();
      if (state.meterContext.state === "suspended") state.meterContext.resume().catch(() => {});
      const source = state.meterContext.createMediaStreamSource(new MediaStream([track]));
      const analyser = state.meterContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.35;
      source.connect(analyser);
      state.speakerMeters.set(peerId, {
        track,
        source,
        analyser,
        samples: new Uint8Array(analyser.fftSize),
        loudFrames: 0,
        quietFrames: 0,
        speaking: false
      });
      if (!state.speakerInterval) {
        state.speakerInterval = setInterval(() => {
          state.speakerMeters.forEach((meter, id) => {
            const participant = state.participants.get(id);
            if (!participant || meter.track.readyState === "ended") return stopSpeakerMeter(id);
            meter.analyser.getByteTimeDomainData(meter.samples);
            const rms = Math.sqrt(meter.samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / meter.samples.length);
            const micOn = id === "local" ? state.micOn : Boolean(participant.micOn);
            if (micOn && rms > 0.035) {
              meter.loudFrames += 1;
              meter.quietFrames = 0;
              if (!meter.speaking && meter.loudFrames >= 2) {
                meter.speaking = true;
                setSpeakingIndicator(id, true);
              }
            } else {
              meter.loudFrames = 0;
              meter.quietFrames += 1;
              if (meter.speaking && meter.quietFrames >= 4) {
                meter.speaking = false;
                setSpeakingIndicator(id, false);
              }
            }
          });
        }, 80);
      }
    } catch (error) {
      console.error(error);
    }
  }

  function stopSpeakerMeter(peerId) {
    const meter = state.speakerMeters.get(peerId);
    if (meter) {
      meter.source.disconnect();
      meter.analyser.disconnect();
      state.speakerMeters.delete(peerId);
    }
    setSpeakingIndicator(peerId, false);
    if (!state.speakerMeters.size && state.speakerInterval) {
      clearInterval(state.speakerInterval);
      state.speakerInterval = null;
    }
  }

  function setConnectionQuality(quality, label) {
    const indicator = $("#connectionQuality");
    indicator.dataset.quality = quality;
    indicator.title = `Качество связи: ${label.toLowerCase()}`;
    indicator.querySelector("span").textContent = label;
  }

  async function getCallQuality(call) {
    const connection = call.peerConnection;
    if (!connection) return "connecting";
    if (["failed", "closed"].includes(connection.connectionState) || ["failed", "disconnected"].includes(connection.iceConnectionState)) return "poor";
    if (["new", "connecting"].includes(connection.connectionState) || ["new", "checking"].includes(connection.iceConnectionState)) return "connecting";

    try {
      const reports = await connection.getStats();
      let roundTripTime = 0;
      let packetsReceived = 0;
      let packetsLost = 0;
      let jitter = 0;
      reports.forEach((report) => {
        if (report.type === "candidate-pair" && (report.selected || report.nominated) && report.state === "succeeded") {
          roundTripTime = report.currentRoundTripTime || roundTripTime;
        }
        if (report.type === "inbound-rtp" && !report.isRemote) {
          packetsReceived += report.packetsReceived || 0;
          packetsLost += Math.max(0, report.packetsLost || 0);
          jitter = Math.max(jitter, report.jitter || 0);
        }
      });
      const lossRate = packetsLost / Math.max(1, packetsReceived + packetsLost);
      if (roundTripTime > 0.4 || lossRate > 0.08 || jitter > 0.06) return "poor";
      if (roundTripTime > 0.18 || lossRate > 0.025 || jitter > 0.03) return "fair";
      return "good";
    } catch {
      return "connecting";
    }
  }

  async function updateConnectionQuality() {
    if (!state.calls.size) {
      setConnectionQuality("idle", "Ожидание");
      return;
    }
    const ranks = { good: 0, fair: 1, connecting: 2, poor: 3 };
    const qualities = await Promise.all(Array.from(state.calls.values(), getCallQuality));
    const quality = qualities.reduce((worst, current) => ranks[current] > ranks[worst] ? current : worst, "good");
    const labels = { good: "Стабильная", fair: "Средняя", connecting: "Подключение", poor: "Слабая" };
    setConnectionQuality(quality, labels[quality]);
  }

  function startConnectionQualityMonitor() {
    clearInterval(state.qualityInterval);
    updateConnectionQuality();
    state.qualityInterval = setInterval(updateConnectionQuality, 2500);
  }

  function broadcast(message, exceptId = "") {
    state.dataConnections.forEach((connection, peerId) => {
      if (peerId !== exceptId && connection.open) connection.send(message);
    });
  }

  function broadcastMediaStatus() {
    const local = state.participants.get("local");
    if (local) {
      local.micOn = state.micOn;
      local.cameraOn = state.cameraOn;
      local.screenOn = state.screenOn;
    }
    broadcast({ type: "media-status", peerId: state.peer?.id, micOn: state.micOn, cameraOn: state.cameraOn, screenOn: state.screenOn });
  }

  function updateRoomUI() {
    const total = Math.max(1, state.participants.size);
    $("#participantCount").innerHTML = `<i data-lucide="users-round"></i> ${total}`;
    $("#peopleCount").textContent = total;
    $("#meetingTitle").textContent = total === 1 ? (state.isHost ? "Встреча создана" : "Подключено") : `Участники: ${total}`;
    renderParticipants();
    refreshIcons();
  }

  function renderParticipants() {
    const peopleList = $("#peopleList");
    if (!peopleList) return;
    peopleList.innerHTML = Array.from(state.participants.entries()).map(([id, person]) => {
      const name = escapeHTML(person.name || "Учасник");
      const avatar = avatarMarkup(person.avatar, name.slice(0, 1).toUpperCase());
      const local = id === "local";
      const micOn = local ? state.micOn : Boolean(person.micOn);
      const cameraOn = local ? state.cameraOn : Boolean(person.cameraOn);
      const screenOn = local ? state.screenOn : Boolean(person.screenOn);
      const speakingClass = person.isSpeaking ? " is-speaking" : "";
      const cameraIcon = screenOn ? "monitor-up" : cameraOn ? "video" : "video-off";
      const cameraLabel = screenOn ? "Демонстрация экрана" : cameraOn ? "Камера включена" : "Камера выключена";
      return `<button type="button" class="person-row ${local ? "person-self" : ""}${speakingClass}" data-person="${escapeHTML(id)}"><span class="person-avatar">${avatar}</span><span class="person-info"><strong>${name}${local ? " · вы" : ""}</strong><small>${local ? "Это вы" : "На связи"}</small></span><span class="person-status" aria-label="Микрофон ${micOn ? "включён" : "выключен"}; ${cameraLabel}"><i class="mic-indicator ${micOn ? "is-on" : "is-off"}${speakingClass}" data-lucide="${micOn ? "mic" : "mic-off"}" title="Микрофон ${micOn ? "включён" : "выключен"}"></i><i class="${cameraOn || screenOn ? "is-on" : "is-off"}" data-lucide="${cameraIcon}" title="${cameraLabel}"></i></span></button>`;
    }).join("");
    refreshIcons();
  }

  function addChatMessage(message) {
    message.avatar = normalizeAvatar(message.avatar) || "🌙";
    state.messages.push(message);
    renderChat();
    if (state.openPanel !== "chat" && !message.own) {
      state.unreadMessages += 1;
      const badge = $("#chatBadge");
      badge.textContent = state.unreadMessages > 9 ? "9+" : state.unreadMessages;
      badge.classList.remove("hidden");
    }
  }

  function renderChat() {
    const container = $("#chatMessages");
    if (!container) return;
    if (state.messages.length === 0) {
      container.innerHTML = `<div class="chat-empty"><i data-lucide="messages-square"></i><span>Почніть розмову тут</span><small>Повідомлення бачать усі в кімнаті</small></div>`;
    } else {
      container.innerHTML = state.messages.map((message) => `<article class="chat-message ${message.own ? "chat-message-own" : ""}"><span class="person-avatar">${avatarMarkup(message.avatar)}</span><div><div class="chat-message-meta"><strong>${escapeHTML(message.name)}</strong><time>${escapeHTML(message.time)}</time></div><p>${escapeHTML(message.text)}</p></div></article>`).join("");
      container.scrollTop = container.scrollHeight;
    }
    refreshIcons();
  }

  function openCallPanel(panel) {
    if (panel === "people") {
      const isMobile = window.matchMedia("(max-width: 760px)").matches;
      const isOpen = isMobile
        ? $("#meetingSidebar").classList.toggle("is-open")
        : meetingView.classList.contains("participants-hidden");
      if (!isMobile) meetingView.classList.toggle("participants-hidden", !isOpen);
      $("#peopleButton").setAttribute("aria-expanded", String(isOpen));
      return;
    }

    state.openPanel = state.openPanel === "chat" ? "" : "chat";
    const isOpen = state.openPanel === "chat";
    $("#callPanel").classList.toggle("hidden", !isOpen);
    $("#meetingWorkspace").classList.toggle("panel-open", isOpen);
    $("#chatPanel").classList.toggle("hidden", !isOpen);
    $("#callPanelTitle").textContent = "Чат";
    $("#chatButton").setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      state.unreadMessages = 0;
      $("#chatBadge").classList.add("hidden");
      renderChat();
    }
  }

  function openProfileModal() {
    $("#profileNameInput").value = getName();
    state.selectedAvatar = state.avatar;
    $("#avatarInput").value = "";
    updateAvatarPreview(state.selectedAvatar);
    $("#profileModal").classList.remove("hidden");
    refreshIcons();
  }

  async function openAudioSettings() {
    $("#audioSettingsModal").classList.remove("hidden");
    await state.mediaReady;
    await refreshAudioDevices();
  }

  async function openCameraSettings() {
    $("#effectsModal").classList.remove("hidden");
    await state.mediaReady;
    await refreshAudioDevices();
  }

  function setLayout(layout) {
    if (stage.classList.contains("free-layout")) {
      stage.classList.remove("free-layout");
      state.tilePositions.clear();
      $("#freeLayoutButton").classList.remove("is-selected");
      $("#freeLayoutButton").setAttribute("aria-pressed", "false");
    }
    state.layout = layout;
    if (layout === "grid") state.focusId = "";
    else if (!state.participants.has(state.focusId)) {
      state.focusId = Array.from(state.participants.keys()).find((id) => id !== "local") || "local";
    }
    document.querySelectorAll(".layout-button").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.layout === layout);
    });
    renderTiles();
  }

  function focusParticipant(peerId) {
    if (!state.participants.has(peerId)) return;
    if (state.focusId === peerId) {
      state.focusId = "";
      state.layout = "grid";
    } else {
      state.focusId = peerId;
      if (state.layout === "grid") state.layout = "speaker";
    }
    document.querySelectorAll(".layout-button").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.layout === state.layout);
    });
    renderTiles();
  }

  function setFreeLayout(enabled) {
    if (enabled) {
      const gridRect = tileGrid.getBoundingClientRect();
      tileGrid.querySelectorAll(".tile").forEach((tile) => {
        const rect = tile.getBoundingClientRect();
        const width = Math.max(160, Math.min(420, gridRect.width, rect.width));
        const height = Math.max(110, Math.round(width * rect.height / Math.max(1, rect.width)));
        const x = Math.min(gridRect.width - width, Math.max(0, rect.left - gridRect.left));
        const y = Math.min(gridRect.height - height, Math.max(0, rect.top - gridRect.top));
        state.tilePositions.set(tile.dataset.id, { x, y });
        state.tileSizes.set(tile.dataset.id, { width, height });
      });
      stage.classList.add("free-layout");
    } else {
      stage.classList.remove("free-layout");
      state.tilePositions.clear();
    }
    $("#freeLayoutButton").classList.toggle("is-selected", enabled);
    $("#freeLayoutButton").setAttribute("aria-pressed", String(enabled));
    renderTiles();
  }

  function getDefaultFreePosition(index) {
    const gap = 12;
    const width = Math.max(160, Math.min(360, (tileGrid.clientWidth - gap) / 2));
    const height = Math.round(width * 9 / 16);
    const columns = Math.max(1, Math.floor((tileGrid.clientWidth + gap) / (width + gap)));
    return { x: (index % columns) * (width + gap), y: Math.floor(index / columns) * (height + gap), width, height };
  }

  function renderTiles() {
    if (!tileGrid) return;
    const entries = Array.from(state.participants.entries());
    const freeLayout = stage.classList.contains("free-layout");
    if (freeLayout) {
      entries.forEach(([id], index) => {
        if (!state.tilePositions.has(id)) {
          const position = getDefaultFreePosition(index);
          state.tilePositions.set(id, { x: position.x, y: position.y });
          if (!state.tileSizes.has(id)) state.tileSizes.set(id, { width: position.width, height: position.height });
        }
      });
    }
    tileGrid.innerHTML = entries.map(([id, person]) => {
      const local = id === "local";
      const safeName = escapeHTML(person.name || "Учасник");
      const initials = escapeHTML((person.name || "?").trim().slice(0, 1).toUpperCase());
      const avatar = avatarMarkup(person.avatar, initials);
      const videoOn = local ? state.cameraOn || state.screenOn : Boolean(person.cameraOn || person.screenOn);
      const videoClass = person.stream && videoOn ? "tile-video" : "tile-video hidden-video";
      const mirrorClass = local && state.mirrorOn && !state.screenOn ? " mirrored-video" : "";
      const avatarClass = person.stream && videoOn ? "tile-avatar hidden-avatar" : "tile-avatar";
      const micOn = local ? state.micOn : Boolean(person.micOn);
      const icon = micOn ? "mic" : "mic-off";
      const speakingClass = person.isSpeaking ? " is-speaking" : "";
      const focusClass = state.focusId === id ? " tile-focus" : "";
      const glowClass = local && state.glowOn ? "glow-on" : "";
      const size = state.tileSizes.get(id);
      const sizeClass = size ? " tile-resized" : "";
      const position = freeLayout ? state.tilePositions.get(id) : null;
      const sizeStyle = `${size ? `width:${size.width}px;height:${size.height}px;` : ""}${position ? `left:${position.x}px;top:${position.y}px;` : ""}`;
      return `<article class="tile${focusClass}${sizeClass}${speakingClass} ${local ? "tile-local" : ""} ${glowClass}" data-id="${escapeHTML(id)}" draggable="${!freeLayout}" style="${sizeStyle}--glow-color:${state.glowColor};--glow-strength:${state.glowStrength / 100};--glow-width:${state.glowWidth}px;--glow-spread:${state.glowWidth * 8}px;--glow-inset:${state.glowWidth * 5}px"><video class="${videoClass}${mirrorClass}" autoplay playsinline ${local ? "muted" : ""}></video><div class="${avatarClass}">${avatar}</div><button class="tile-resize-handle" type="button" data-resize="${escapeHTML(id)}" aria-label="Изменить размер камеры ${safeName}" title="Изменить размер"><i data-lucide="move-diagonal-2"></i></button><div class="tile-name"><i class="speaker-indicator" data-lucide="${icon}"></i><span>${safeName}${local ? " · вы" : ""}</span></div></article>`;
    }).join("");

    entries.forEach(([id, person]) => {
      const video = tileGrid.querySelector(`[data-id="${CSS.escape(id)}"] video`);
      if (video && person.stream && video.srcObject !== person.stream) video.srcObject = person.stream;
      if (video && !person.local && typeof video.setSinkId === "function" && video.sinkId !== state.audioOutputId) {
        video.setSinkId(state.audioOutputId).catch((error) => console.error(error));
      }
    });
    stage.classList.toggle("has-tiles", entries.length > 0);
    stage.dataset.layout = state.layout;
    stage.dataset.focusId = state.focusId;
    refreshIcons();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function updateControlButtons() {
    const controls = [
      ["#micButton", state.micOn, "mic", "mic-off", "Мікрофон"],
      ["#cameraButton", state.cameraOn, "video", "video-off", "Камера"],
      ["#shareButton", state.screenOn, "monitor-up", "monitor-up", "екран"],
      ["#effectsButton", state.glowOn, "sun", "sun", "налаштування камери"]
    ];
    controls.forEach(([selector, active, activeIcon, idleIcon, label]) => {
      const button = $(selector);
      button.classList.toggle("is-active", active);
      button.title = `${active ? "Вимкнути" : "Увімкнути"} ${label.toLowerCase()}`;
      button.querySelector(".control-icon").innerHTML = `<i data-lucide="${active ? activeIcon : idleIcon}"></i>`;
    });
    refreshIcons();
  }

  async function toggleMic() {
    if (!state.localStream) {
      await enableMedia();
      if (!state.localStream) return;
    }
    const track = state.localStream?.getAudioTracks()[0];
    if (!track) return toast("Мікрофон недоступний. Перевір дозвіл у налаштуваннях сайту.");
    track.enabled = !track.enabled;
    state.micOn = track.enabled;
    if (!state.micOn) setSpeakingIndicator("local", false);
    playUiSound(state.micOn ? "micOn" : "micOff");
    broadcastMediaStatus();
    updateControlButtons();
    updateRoomUI();
    renderTiles();
  }

  async function toggleCamera() {
    if (!state.localStream) {
      await enableMedia();
      if (!state.localStream) return;
    }
    const track = state.cameraTrack;
    if (!track) return toast("Камера недоступна. Перевір дозвіл у налаштуваннях сайту.");
    track.enabled = !track.enabled;
    state.cameraOn = track.enabled;
    if (state.rawCameraTrack && state.rawCameraTrack !== track) state.rawCameraTrack.enabled = state.cameraOn;
    if (state.cameraOn && state.rawCameraTrack) {
      const settings = state.rawCameraTrack.getSettings();
      const deviceChanged = state.cameraInputId && settings.deviceId !== state.cameraInputId;
      const resolutionChanged = settings.height && Math.abs(settings.height - state.cameraResolution) > 120;
      if (state.cameraSettingsPending || deviceChanged || resolutionChanged) await updateCameraSettings(state.cameraInputId, state.cameraResolution);
    }
    if (state.cameraOn && state.cameraBackgroundMode !== "none" && !state.cameraProcessor && state.rawCameraTrack) {
      await replaceOutgoingCameraTrack(state.rawCameraTrack);
    }
    playUiSound(state.cameraOn ? "cameraOn" : "cameraOff");
    if (state.cameraOn && !state.screenOn) {
      const replacements = Array.from(state.calls.values()).map(async (call) => {
        const sender = getVideoSender(call);
        if (sender && !sender.track) await sender.replaceTrack(track);
      });
      await Promise.allSettled(replacements);
    }
    broadcastMediaStatus();
    updateControlButtons();
    updateRoomUI();
    renderTiles();
  }

  async function toggleScreenShare() {
    if (state.screenOn) {
      stopScreenShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) return toast("Показ екрана недоступний у цьому браузері");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      state.screenTrack = track;
      state.screenAudioTrack = stream.getAudioTracks()[0] || null;
      state.screenOn = true;
      const replacements = Array.from(state.calls.values()).map(async (call) => {
        const sender = getVideoSender(call);
        if (sender) await sender.replaceTrack(track);
        if (state.screenAudioTrack) call.peerConnection?.addTrack(state.screenAudioTrack, new MediaStream([state.screenAudioTrack]));
      });
      await Promise.allSettled(replacements);
      const local = state.participants.get("local");
      if (local) local.stream = new MediaStream([...state.localStream.getAudioTracks(), track]);
      track.onended = stopScreenShare;
      broadcastMediaStatus();
      updateRoomUI();
      updateControlButtons();
      renderTiles();
      toast(state.screenAudioTrack ? "Екран і системний звук передаються" : "Показ екрана ввімкнено");
    } catch (error) {
      if (error.name !== "NotAllowedError") toast("Не вдалося почати показ екрана");
    }
  }

  function stopScreenShare() {
    if (!state.screenTrack) return;
    state.screenTrack.stop();
    const camera = state.cameraOn ? state.cameraTrack : null;
    const replacements = Array.from(state.calls.values()).map(async (call) => {
      const sender = getVideoSender(call);
      if (sender) await sender.replaceTrack(camera);
      if (state.screenAudioTrack) {
        const audioSender = call.peerConnection?.getSenders().find((item) => item.track === state.screenAudioTrack);
        if (audioSender) await audioSender.replaceTrack(null);
      }
    });
    Promise.allSettled(replacements);
    state.screenTrack = null;
    state.screenAudioTrack?.stop();
    state.screenAudioTrack = null;
    state.screenOn = false;
    const local = state.participants.get("local");
    if (local) local.stream = state.localStream;
    broadcastMediaStatus();
    updateRoomUI();
    updateControlButtons();
    renderTiles();
    toast("Показ екрана зупинено");
  }

  function getVideoSender(call) {
    const connection = call.peerConnection;
    if (!connection) return null;
    return connection.getSenders().find((sender) => sender.track?.kind === "video")
      || connection.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "video")?.sender
      || null;
  }

  function getOutgoingStream() {
    if (state.screenOn && state.screenTrack) {
      return new MediaStream([
        ...(state.localStream?.getAudioTracks() || []),
        ...(state.screenAudioTrack ? [state.screenAudioTrack] : []),
        state.screenTrack
      ]);
    }
    return state.localStream || new MediaStream();
  }

  async function copyInvite() {
    const invite = new URL(location.href);
    invite.searchParams.set("room", state.roomCode);
    invite.searchParams.set("host", state.hostId);
    try {
      await navigator.clipboard.writeText(invite.toString());
      toast("Посилання-запрошення скопійовано");
    } catch {
      window.prompt("Скопіюй посилання-запрошення:", invite.toString());
    }
  }

  function cleanup(goHome = true) {
    if (!meetingView.classList.contains("hidden")) playUiSound("disconnected");
    clearInterval(state.clockInterval);
    clearInterval(state.qualityInterval);
    state.qualityInterval = null;
    state.speakerMeters.forEach((meter) => {
      meter.source.disconnect();
      meter.analyser.disconnect();
    });
    state.speakerMeters.clear();
    clearInterval(state.speakerInterval);
    state.speakerInterval = null;
    if (state.isHost) {
      broadcast({ type: "room-closed", roomCode: state.roomCode });
      removeRecentRoom(state.roomCode);
    }
    state.calls.forEach((call) => call.close());
    state.dataConnections.forEach((connection) => connection.close());
    state.peer?.destroy();
    stopCameraBackground();
    state.localStream?.getTracks().forEach((track) => track.stop());
    if (state.rawCameraTrack && !state.localStream?.getTracks().includes(state.rawCameraTrack)) state.rawCameraTrack.stop();
    state.screenTrack?.stop();
    state.screenAudioTrack?.stop();
    state.peer = null;
    state.localStream = null;
    state.cameraTrack = null;
    state.rawCameraTrack = null;
    state.screenTrack = null;
    state.screenAudioTrack = null;
    state.micOn = false;
    state.cameraOn = false;
    state.screenOn = false;
    state.participants.clear();
    state.calls.clear();
    state.dataConnections.clear();
    state.tileSizes.clear();
    state.tilePositions.clear();
    state.focusId = "";
    state.layout = "grid";
    state.openPanel = "";
    state.messages = [];
    state.unreadMessages = 0;
    $("#callPanel").classList.add("hidden");
    $("#meetingWorkspace").classList.remove("panel-open");
    $("#chatBadge").classList.add("hidden");
    $("#stage").dataset.layout = "grid";
    $("#stage").dataset.focusId = "";
    $("#stage").classList.remove("free-layout");
    $("#freeLayoutButton").classList.remove("is-selected");
    $("#freeLayoutButton").setAttribute("aria-pressed", "false");
    meetingView.classList.remove("participants-hidden");
    $("#meetingSidebar").classList.remove("is-open");
    $("#peoplePanel").classList.remove("hidden");
    $("#peopleButton").setAttribute("aria-expanded", "true");
    $("#chatButton").setAttribute("aria-expanded", "false");
    document.querySelectorAll(".layout-button").forEach((button) => button.classList.toggle("is-selected", button.dataset.layout === "grid"));
    if (goHome) {
      meetingView.classList.add("hidden");
      homeView.classList.remove("hidden");
      history.replaceState({}, "", location.pathname);
      resetCreateButton();
    }
  }

  $("#createButton").addEventListener("click", () => {
    const code = makeCode();
    openRoom(true, code, makeHostId(code));
  });

  $("#joinForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const code = normalizeCode(roomInput.value);
    const params = new URLSearchParams(location.search);
    const hostId = params.get("room") === code && params.get("host") ? params.get("host") : makeHostId(code);
    if (code.length < 5) return setError("Введи повний код кімнати.");
    openRoom(false, code, hostId);
  });
  $("#recentRooms").addEventListener("click", (event) => {
    const button = event.target.closest("[data-room-code]");
    if (!button) return;
    const code = button.dataset.roomCode;
    roomInput.value = code;
    openRoom(false, code, button.dataset.roomHost);
  });
  function setHomeTab(tab) {
    homeView.dataset.homeTab = tab;
    const isRecent = tab === "recent";
    $("#homeNav").classList.toggle("is-active", !isRecent);
    $("#recentNav").classList.toggle("is-active", isRecent);
    $(".home-section-label").textContent = isRecent ? "DURY / НЕДАВНИЕ" : "DURY / ВИДЕОСВЯЗЬ";
    $(".home-dashboard").scrollTo({ top: 0, behavior: "smooth" });
  }

  $("#homeNav").addEventListener("click", (event) => {
    event.preventDefault();
    setHomeTab("home");
  });
  $("#recentNav").addEventListener("click", (event) => {
    event.preventDefault();
    setHomeTab("recent");
  });

  roomInput.addEventListener("input", () => {
    const start = roomInput.selectionStart;
    roomInput.value = normalizeCode(roomInput.value);
    roomInput.setSelectionRange(start, start);
    setError("");
  });

  $("#nameButton").addEventListener("click", openProfileModal);
  $("#profileNav").addEventListener("click", openProfileModal);
  $("#profileButton").addEventListener("click", openProfileModal);
  $("#closeProfile").addEventListener("click", () => $("#profileModal").classList.add("hidden"));
  $("#profileModal").addEventListener("click", (event) => {
    if (event.target === $("#profileModal")) $("#profileModal").classList.add("hidden");
  });
  $("#avatarInput").addEventListener("change", async (event) => {
    const avatar = await imageFileToAvatar(event.target.files?.[0]);
    event.target.value = "";
    if (!avatar) return;
    state.selectedAvatar = avatar;
    updateAvatarPreview(avatar);
  });
  $("#resetAvatar").addEventListener("click", () => {
    state.selectedAvatar = "🌙";
    updateAvatarPreview(state.selectedAvatar);
  });
  $("#saveProfile").addEventListener("click", () => {
    setProfile($("#profileNameInput").value, state.selectedAvatar);
    $("#profileModal").classList.add("hidden");
  });
  $("#peopleButton").addEventListener("click", () => openCallPanel("people"));
  $("#chatButton").addEventListener("click", () => openCallPanel("chat"));
  $("#profileAudioSettings").addEventListener("click", () => {
    $("#profileModal").classList.add("hidden");
    openAudioSettings();
  });
  $("#profileCameraSettings").addEventListener("click", () => {
    $("#profileModal").classList.add("hidden");
    openCameraSettings();
  });
  $("#closeCallPanel").addEventListener("click", () => openCallPanel(state.openPanel));
  $("#peopleList").addEventListener("click", (event) => {
    const row = event.target.closest("[data-person]");
    if (row) focusParticipant(row.dataset.person);
  });
  document.querySelectorAll(".layout-button").forEach((button) => {
    if (button.dataset.layout) button.addEventListener("click", () => setLayout(button.dataset.layout));
  });
  $("#freeLayoutButton").addEventListener("click", () => setFreeLayout(!stage.classList.contains("free-layout")));
  $("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    const text = input.value.trim().slice(0, 500);
    if (!text) return;
    const message = { type: "chat", text, name: getName(), avatar: state.avatar };
    addChatMessage({ ...message, id: `${Date.now()}-local`, time: new Date().toLocaleTimeString(languageLocales[state.language], { hour: "2-digit", minute: "2-digit" }), own: true });
    broadcast(message);
    input.value = "";
    input.focus();
  });
  $("#micButton").addEventListener("click", toggleMic);
  $("#cameraButton").addEventListener("click", toggleCamera);
  $("#shareButton").addEventListener("click", toggleScreenShare);
  $("#effectsButton").addEventListener("click", openCameraSettings);
  $("#audioSettingsButton").addEventListener("click", openAudioSettings);
  $("#closeAudioSettings").addEventListener("click", () => $("#audioSettingsModal").classList.add("hidden"));
  $("#audioSettingsModal").addEventListener("click", (event) => {
    if (event.target === $("#audioSettingsModal")) $("#audioSettingsModal").classList.add("hidden");
  });
  $("#uiSoundToggle").addEventListener("change", (event) => {
    state.soundsEnabled = event.target.checked;
    localStorage.setItem("dury-ui-sounds", String(state.soundsEnabled));
    if (state.soundsEnabled) prepareSoundContext();
  });
  $("#audioInputSelect").addEventListener("change", (event) => changeAudioInput(event.target.value));
  $("#audioOutputSelect").addEventListener("change", (event) => changeAudioOutput(event.target.value));
  $("#cameraInputSelect").addEventListener("change", (event) => updateCameraSettings(event.target.value, state.cameraResolution));
  $("#cameraResolutionSelect").addEventListener("change", (event) => updateCameraSettings(state.cameraInputId, Number(event.target.value)));
  $("#cameraBackgroundSelect").addEventListener("change", (event) => updateCameraBackground(event.target.value));
  $("#backgroundImageInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      if (!state.cameraBackgroundImage) {
        state.cameraBackgroundMode = "none";
        localStorage.setItem("mymeet-camera-background-mode", "none");
        $("#cameraBackgroundSelect").value = "none";
        $("#backgroundImageField").classList.add("hidden");
      }
      return;
    }
    const image = await imageFileToBackground(file);
    if (!image) return;
    try {
      localStorage.setItem("mymeet-camera-background-image", image);
      state.cameraBackgroundImage = image;
      $("#backgroundImageName").textContent = file.name;
      await updateCameraBackground("image");
    } catch (error) {
      console.error(error);
      toast("Не удалось сохранить фон. Выберите файл меньшего размера.");
    }
  });
  navigator.mediaDevices?.addEventListener?.("devicechange", () => {
    if (!$("#audioSettingsModal").classList.contains("hidden")) refreshAudioDevices();
  });
  $("#closeEffects").addEventListener("click", () => $("#effectsModal").classList.add("hidden"));
  $("#effectsModal").addEventListener("click", (event) => {
    if (event.target === $("#effectsModal")) $("#effectsModal").classList.add("hidden");
  });
  $("#glowToggle").addEventListener("change", (event) => {
    state.glowOn = event.target.checked;
    updateControlButtons();
    renderTiles();
  });
  $("#mirrorToggle").addEventListener("change", (event) => {
    state.mirrorOn = event.target.checked;
    localStorage.setItem("mymeet-mirror", String(state.mirrorOn));
    renderTiles();
  });
  $("#glowColor").addEventListener("input", (event) => {
    state.glowColor = event.target.value;
    $("#effectSwatch").style.background = state.glowColor;
    $("#effectSwatch").style.boxShadow = `0 0 13px ${state.glowColor}`;
    renderTiles();
  });
  $("#glowWidth").addEventListener("input", (event) => {
    state.glowWidth = Number(event.target.value);
    localStorage.setItem("mymeet-glow-width", String(state.glowWidth));
    $("#glowWidthValue").textContent = `${state.glowWidth} px`;
    renderTiles();
  });
  $("#glowStrength").addEventListener("input", (event) => {
    state.glowStrength = Number(event.target.value);
    $("#glowValue").textContent = `${state.glowStrength}%`;
    renderTiles();
  });
  $("#copyInviteTop").addEventListener("click", copyInvite);
  $("#copyInviteEmpty").addEventListener("click", copyInvite);
  $("#leaveButton").addEventListener("click", () => cleanup());
  $("#leaveTop").addEventListener("click", () => cleanup());
  $("#homeLink").addEventListener("click", (event) => { event.preventDefault(); cleanup(); });
  $("#fullscreenButton").addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", updateFullscreenButton);

  tileGrid.addEventListener("click", (event) => {
    if (event.target.closest("[data-resize]")) return;
    if (stage.classList.contains("free-layout")) return;
    const tile = event.target.closest(".tile");
    if (tile) focusParticipant(tile.dataset.id);
  });
  let tileResize = null;
  let tileMove = null;
  tileGrid.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest("[data-resize]");
    const tile = handle?.closest(".tile") || (stage.classList.contains("free-layout") ? event.target.closest(".tile") : null);
    if (!tile) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = tile.getBoundingClientRect();
    if (handle) {
      handle.setPointerCapture(event.pointerId);
      tileResize = {
        id: tile.dataset.id,
        handle,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: rect.width,
        height: rect.height,
        tile
      };
    } else {
      tile.setPointerCapture(event.pointerId);
      tile.classList.add("tile-moving");
      tileMove = {
        id: tile.dataset.id,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        tile
      };
    }
  });
  window.addEventListener("pointermove", (event) => {
    if (tileResize && event.pointerId === tileResize.pointerId) {
      const minWidth = Math.min(150, tileGrid.clientWidth);
      const minHeight = Math.min(110, tileGrid.clientHeight);
      const width = Math.round(Math.min(tileGrid.clientWidth, Math.max(minWidth, tileResize.width + event.clientX - tileResize.startX)));
      const height = Math.round(Math.min(tileGrid.clientHeight, Math.max(minHeight, tileResize.height + event.clientY - tileResize.startY)));
      tileResize.tile.style.width = `${width}px`;
      tileResize.tile.style.height = `${height}px`;
      tileResize.tile.classList.add("tile-resized");
      state.tileSizes.set(tileResize.id, { width, height });
      return;
    }
    if (!tileMove || event.pointerId !== tileMove.pointerId) return;
    const gridRect = tileGrid.getBoundingClientRect();
    const maxX = Math.max(0, tileGrid.clientWidth - tileMove.tile.offsetWidth);
    const maxY = Math.max(0, tileGrid.clientHeight - tileMove.tile.offsetHeight);
    const x = Math.round(Math.min(maxX, Math.max(0, event.clientX - gridRect.left - tileMove.offsetX)));
    const y = Math.round(Math.min(maxY, Math.max(0, event.clientY - gridRect.top - tileMove.offsetY)));
    tileMove.tile.style.left = `${x}px`;
    tileMove.tile.style.top = `${y}px`;
    state.tilePositions.set(tileMove.id, { x, y });
  });
  const finishTileResize = (event) => {
    if (!tileResize || event.pointerId !== tileResize.pointerId) return;
    if (tileResize.handle.hasPointerCapture(event.pointerId)) tileResize.handle.releasePointerCapture(event.pointerId);
    tileResize = null;
  };
  window.addEventListener("pointerup", finishTileResize);
  window.addEventListener("pointercancel", finishTileResize);
  const finishTileMove = (event) => {
    if (!tileMove || event.pointerId !== tileMove.pointerId) return;
    tileMove.tile.classList.remove("tile-moving");
    if (tileMove.tile.hasPointerCapture(event.pointerId)) tileMove.tile.releasePointerCapture(event.pointerId);
    tileMove = null;
  };
  window.addEventListener("pointerup", finishTileMove);
  window.addEventListener("pointercancel", finishTileMove);
  tileGrid.addEventListener("dragstart", (event) => {
    const tile = event.target.closest(".tile");
    if (!tile) return;
    state.dragId = tile.dataset.id;
    tile.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.dragId);
  });
  tileGrid.addEventListener("dragend", () => {
    tileGrid.querySelectorAll(".tile").forEach((tile) => tile.classList.remove("dragging", "drag-over"));
  });
  tileGrid.addEventListener("dragover", (event) => {
    event.preventDefault();
    const tile = event.target.closest(".tile");
    if (tile && tile.dataset.id !== state.dragId) tile.classList.add("drag-over");
  });
  tileGrid.addEventListener("dragleave", (event) => event.target.closest(".tile")?.classList.remove("drag-over"));
  tileGrid.addEventListener("drop", (event) => {
    event.preventDefault();
    const target = event.target.closest(".tile");
    if (!target || target.dataset.id === state.dragId) return;
    const tiles = Array.from(tileGrid.children);
    const dragged = tiles.find((tile) => tile.dataset.id === state.dragId);
    const targetIndex = tiles.indexOf(target);
    const draggedIndex = tiles.indexOf(dragged);
    tileGrid.insertBefore(dragged, draggedIndex < targetIndex ? target.nextSibling : target);
  });

  $("#profileName").textContent = getName();
  $("#homeProfileAvatar").innerHTML = avatarMarkup(state.avatar);
  renderRecentRooms();
  $("#uiSoundToggle").checked = state.soundsEnabled;
  document.addEventListener("pointerdown", prepareSoundContext);
  $("#mirrorToggle").checked = state.mirrorOn;
  $("#glowWidth").value = state.glowWidth;
  $("#glowWidthValue").textContent = `${state.glowWidth} px`;
  document.querySelectorAll(".theme-toggle").forEach((button) => button.addEventListener("click", toggleTheme));
  document.querySelectorAll(".language-select").forEach((select) => {
    select.value = state.language;
    select.addEventListener("change", (event) => applyLanguage(event.target.value));
  });
  applyTheme();
  applyLanguage();
  const params = new URLSearchParams(location.search);
  const inviteCode = params.get("room");
  if (inviteCode) {
    roomInput.value = normalizeCode(inviteCode);
    const hostId = params.get("host") || makeHostId(normalizeCode(inviteCode));
    openRoom(false, normalizeCode(inviteCode), hostId);
  } else pruneInactiveRecentRooms().catch((error) => console.error(error));
  refreshIcons();
})();