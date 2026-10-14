(() => {
  const state = {
    peer: null,
    isHost: false,
    roomCode: "",
    hostId: "",
    localStream: null,
    cameraTrack: null,
    screenTrack: null,
    screenAudioTrack: null,
    mediaReady: Promise.resolve(),
    micOn: false,
    cameraOn: false,
    screenOn: false,
    mirrorOn: localStorage.getItem("mymeet-mirror") === "true",
    avatar: localStorage.getItem("mymeet-avatar") || "🌙",
    selectedAvatar: localStorage.getItem("mymeet-avatar") || "🌙",
    theme: localStorage.getItem("mymeet-theme") === "night" ? "night" : "day",
    glowOn: false,
    glowColor: "#d76f70",
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
    pinnedId: ""
  };

  const $ = (selector) => document.querySelector(selector);
  const homeView = $("#homeView");
  const meetingView = $("#meetingView");
  const tileGrid = $("#tileGrid");
  const stage = $("#stage");
  const roomInput = $("#roomCodeInput");
  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function applyTheme() {
    document.body.dataset.theme = state.theme;
    $("#themeColor").content = state.theme === "night" ? "#241a1c" : "#f4e9e0";
    const label = state.theme === "night" ? "Увімкнути денну тему" : "Увімкнути нічну тему";
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
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => node.classList.remove("show"), 2500);
  }

  function setError(message = "") {
    $("#joinError").textContent = message;
  }

  function getName() {
    return localStorage.getItem("mymeet-name") || "Гість";
  }

  function setName(name) {
    const cleanName = name.trim().slice(0, 28) || "Гість";
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

  function setProfile(name, avatar) {
    state.avatar = avatar || state.avatar;
    state.selectedAvatar = state.avatar;
    localStorage.setItem("mymeet-avatar", state.avatar);
    $("#profileAvatar").textContent = state.avatar;
    setName(name);
  }

  function makeCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  }

  function makeHostId(code) {
    return `mesto${code.toLowerCase()}`;
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
            showMeeting(code);
            state.mediaReady = enableMedia();
          });
          connection.on("error", () => failJoin());
          setTimeout(() => {
            if (!connection.open && homeView.classList.contains("hidden") === false) failJoin();
          }, 10000);
        } else {
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
    $("#roomCodeLabel").textContent = `КОД ${code.match(/.{1,3}/g).join(" ")}`;
    $("#watermarkCode").textContent = code;
    $("#meetingTitle").textContent = state.isHost ? "Кімнату створено" : "Ти в кімнаті";
    $("#profileName").textContent = getName();
    $("#meetingName").textContent = getName();
    $("#profileAvatar").textContent = state.avatar;
    state.startTime = Date.now();
    state.participants.set("local", { name: getName(), avatar: state.avatar, stream: state.localStream, local: true });
    if (!state.isHost && state.hostId) {
      state.participants.set(state.hostId, { name: "Організатор", avatar: "🌷", stream: null });
    }
    updateRoomUI();
    renderTiles();
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

  async function enableMedia() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast("Камера недоступна. Відкрий сайт через HTTPS або localhost.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
      state.localStream = stream;
      state.cameraTrack = stream.getVideoTracks()[0] || null;
      state.micOn = stream.getAudioTracks().length > 0;
      state.cameraOn = Boolean(state.cameraTrack);
      state.participants.set("local", { name: getName(), avatar: state.avatar, stream, local: true });
      updateControlButtons();
      renderTiles();
      broadcast({ type: "name", name: getName() });
    } catch (error) {
      if (error.name !== "NotAllowedError" && error.name !== "PermissionDeniedError") console.warn("Media access unavailable:", error);
      toast(error.name === "NotAllowedError" || error.name === "PermissionDeniedError" ? "Дозволь браузеру доступ до камери й мікрофона" : "Камера або мікрофон зараз недоступні");
      updateControlButtons();
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
      } else removeParticipant(connection.peer);
    });
  }

  function handleMessage(senderId, message) {
    if (!message || typeof message !== "object") return;
    if (state.isHost && message.type === "join") {
      const members = [{ peerId: state.peer.id, name: getName(), avatar: state.avatar }];
      state.participants.forEach((person, peerId) => {
        if (peerId !== "local" && peerId !== senderId) members.push({ peerId, name: person.name, avatar: person.avatar || "🌙" });
      });
      const sender = state.dataConnections.get(senderId);
      if (sender?.open) sender.send({ type: "members", peers: members });
      if (sender?.open) sender.send({ type: "profile", peerId: state.peer.id, name: getName(), avatar: state.avatar });
      addParticipant(senderId, message.name || "Учасник", message.avatar || "🌙");
      broadcast({ type: "member-joined", peerId: senderId, name: String(message.name || "Учасник").slice(0, 28), avatar: message.avatar || "🌙" }, senderId);
      updateRoomUI();
      renderTiles();
      return;
    }
    if (message.type === "members") {
      message.peers.forEach((person) => {
        if (typeof person === "string") addParticipant(person, "Учасник");
        else addParticipant(person.peerId, person.name, person.avatar);
      });
      return;
    }
    if (message.type === "member-joined") {
      addParticipant(message.peerId, message.name || "Учасник", message.avatar || "🌙");
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
        participant.avatar = message.avatar || participant.avatar || "🌙";
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
          time: new Date().toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" }),
          own: false
        });
        if (state.isHost) broadcast({ ...message, text, name: participant?.name, avatar: participant?.avatar }, senderId);
      }
    }
  }

  function addParticipant(peerId, name, avatar = "🌙") {
    if (!peerId || peerId === state.peer?.id) return;
    const existing = state.participants.get(peerId);
    if (existing) {
      if (name) existing.name = name;
      if (avatar) existing.avatar = avatar;
    } else {
      state.participants.set(peerId, { name: name || "Учасник", avatar, stream: null });
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

  function attachMediaCall(call) {
    state.calls.set(call.peer, call);
    call.on("stream", (stream) => {
      const existing = state.participants.get(call.peer) || { name: call.metadata?.name || "Учасник", avatar: call.metadata?.avatar || "🌙" };
      existing.stream = stream;
      existing.name = existing.name === "Учасник" ? (call.metadata?.name || existing.name) : existing.name;
      existing.avatar = call.metadata?.avatar || existing.avatar || "🌙";
      state.participants.set(call.peer, existing);
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
    state.participants.delete(peerId);
    if (state.focusId === peerId) state.focusId = "";
    state.calls.delete(peerId);
    if (call) call.close();
    updateRoomUI();
    renderTiles();
  }

  function broadcast(message, exceptId = "") {
    state.dataConnections.forEach((connection, peerId) => {
      if (peerId !== exceptId && connection.open) connection.send(message);
    });
  }

  function updateRoomUI() {
    const total = Math.max(1, state.participants.size);
    $("#participantCount").innerHTML = `<i data-lucide="users-round"></i> ${total}`;
    $("#peopleCount").textContent = total;
    $("#meetingTitle").textContent = total === 1 ? (state.isHost ? "Кімнату створено" : "Ти в кімнаті") : `У кімнаті: ${total}`;
    renderParticipants();
    refreshIcons();
  }

  function renderParticipants() {
    const peopleList = $("#peopleList");
    if (!peopleList) return;
    peopleList.innerHTML = Array.from(state.participants.entries()).map(([id, person]) => {
      const name = escapeHTML(person.name || "Учасник");
      const avatar = escapeHTML(person.avatar || name.slice(0, 1).toUpperCase());
      const local = id === "local";
      return `<button type="button" class="person-row ${local ? "person-self" : ""}" data-person="${escapeHTML(id)}"><span class="person-avatar">${avatar}</span><span class="person-info"><strong>${name}${local ? " · ти" : ""}</strong><small>${local ? "Це ти" : "На зв’язку"}</small></span><i data-lucide="${local && !state.micOn ? "mic-off" : "mic"}"></i></button>`;
    }).join("");
    refreshIcons();
  }

  function addChatMessage(message) {
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
      container.innerHTML = state.messages.map((message) => `<article class="chat-message ${message.own ? "chat-message-own" : ""}"><span class="person-avatar">${escapeHTML(message.avatar || "🌙")}</span><div><div class="chat-message-meta"><strong>${escapeHTML(message.name)}</strong><time>${escapeHTML(message.time)}</time></div><p>${escapeHTML(message.text)}</p></div></article>`).join("");
      container.scrollTop = container.scrollHeight;
    }
    refreshIcons();
  }

  function openCallPanel(panel) {
    state.openPanel = state.openPanel === panel ? "" : panel;
    const isOpen = Boolean(state.openPanel);
    $("#callPanel").classList.toggle("hidden", !isOpen);
    $("#meetingWorkspace").classList.toggle("panel-open", isOpen);
    $("#peoplePanel").classList.toggle("hidden", state.openPanel !== "people");
    $("#chatPanel").classList.toggle("hidden", state.openPanel !== "chat");
    $("#callPanelTitle").textContent = state.openPanel === "chat" ? "Чат зустрічі" : "Учасники";
    $("#peopleButton").setAttribute("aria-expanded", String(state.openPanel === "people"));
    $("#chatButton").setAttribute("aria-expanded", String(state.openPanel === "chat"));
    if (state.openPanel === "chat") {
      state.unreadMessages = 0;
      $("#chatBadge").classList.add("hidden");
      renderChat();
    }
  }

  function openProfileModal() {
    $("#profileNameInput").value = getName();
    state.selectedAvatar = state.avatar;
    document.querySelectorAll(".avatar-option").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.avatar === state.selectedAvatar);
    });
    $("#profileModal").classList.remove("hidden");
    refreshIcons();
  }

  function setLayout(layout) {
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

  function renderTiles() {
    if (!tileGrid) return;
    const entries = Array.from(state.participants.entries());
    if (state.pinnedId) entries.sort(([firstId], [secondId]) => Number(secondId === state.pinnedId) - Number(firstId === state.pinnedId));
    tileGrid.innerHTML = entries.map(([id, person]) => {
      const local = id === "local";
      const safeName = escapeHTML(person.name || "Учасник");
      const initials = escapeHTML((person.name || "?").trim().slice(0, 1).toUpperCase());
      const avatar = escapeHTML(person.avatar || initials);
      const videoClass = person.stream ? "tile-video" : "tile-video hidden-video";
      const mirrorClass = local && state.mirrorOn && !state.screenOn ? " mirrored-video" : "";
      const avatarClass = person.stream ? "tile-avatar hidden-avatar" : "tile-avatar";
      const icon = local && !state.micOn ? "mic-off" : "mic";
      const pinClass = state.pinnedId === id ? "tile tile-pinned" : "tile";
      const focusClass = state.focusId === id ? " tile-focus" : "";
      const glowClass = local && state.glowOn ? "glow-on" : "";
      return `<article class="${pinClass}${focusClass} ${local ? "tile-local" : ""} ${glowClass}" data-id="${escapeHTML(id)}" draggable="true" style="--glow-color:${state.glowColor};--glow-strength:${state.glowStrength / 100};--glow-width:${state.glowWidth}px;--glow-spread:${state.glowWidth * 8}px;--glow-inset:${state.glowWidth * 5}px"><video class="${videoClass}${mirrorClass}" autoplay playsinline ${local ? "muted" : ""}></video><div class="${avatarClass}">${avatar}</div><div class="tile-head" title="Перетягни, щоб змінити порядок"><button class="tile-pin" data-pin="${escapeHTML(id)}" aria-label="${state.pinnedId === id ? "Відкріпити" : "Закріпити"}"><i data-lucide="pin"></i></button></div><div class="tile-name"><i data-lucide="${icon}"></i><span>${safeName}${local ? " · ти" : ""}</span></div></article>`;
    }).join("");

    entries.forEach(([id, person]) => {
      const video = tileGrid.querySelector(`[data-id="${CSS.escape(id)}"] video`);
      if (video && person.stream && video.srcObject !== person.stream) video.srcObject = person.stream;
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
    if (!state.localStream) await enableMedia();
    const track = state.localStream?.getAudioTracks()[0];
    if (!track) return toast("Мікрофон не знайдено");
    track.enabled = !track.enabled;
    state.micOn = track.enabled;
    updateControlButtons();
    renderTiles();
  }

  async function toggleCamera() {
    if (!state.localStream) await enableMedia();
    const track = state.cameraTrack;
    if (!track) return toast("Камеру не знайдено");
    track.enabled = !track.enabled;
    state.cameraOn = track.enabled;
    if (state.cameraOn && !state.screenOn) {
      const replacements = Array.from(state.calls.values()).map(async (call) => {
        const sender = getVideoSender(call);
        if (sender && !sender.track) await sender.replaceTrack(track);
      });
      await Promise.allSettled(replacements);
    }
    updateControlButtons();
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
    clearInterval(state.clockInterval);
    if (state.isHost) broadcast({ type: "member-left", peerId: state.peer?.id });
    state.calls.forEach((call) => call.close());
    state.dataConnections.forEach((connection) => connection.close());
    state.peer?.destroy();
    state.localStream?.getTracks().forEach((track) => track.stop());
    state.screenTrack?.stop();
    state.screenAudioTrack?.stop();
    state.peer = null;
    state.localStream = null;
    state.cameraTrack = null;
    state.screenTrack = null;
    state.screenAudioTrack = null;
    state.micOn = false;
    state.cameraOn = false;
    state.screenOn = false;
    state.participants.clear();
    state.calls.clear();
    state.dataConnections.clear();
    state.pinnedId = "";
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

  roomInput.addEventListener("input", () => {
    const start = roomInput.selectionStart;
    roomInput.value = normalizeCode(roomInput.value);
    roomInput.setSelectionRange(start, start);
    setError("");
  });

  $("#nameButton").addEventListener("click", openProfileModal);
  $("#profileButton").addEventListener("click", openProfileModal);
  $("#closeProfile").addEventListener("click", () => $("#profileModal").classList.add("hidden"));
  $("#profileModal").addEventListener("click", (event) => {
    if (event.target === $("#profileModal")) $("#profileModal").classList.add("hidden");
  });
  $("#avatarPicker").addEventListener("click", (event) => {
    const option = event.target.closest("[data-avatar]");
    if (!option) return;
    state.selectedAvatar = option.dataset.avatar;
    document.querySelectorAll(".avatar-option").forEach((button) => button.classList.toggle("is-selected", button === option));
  });
  $("#saveProfile").addEventListener("click", () => {
    setProfile($("#profileNameInput").value, state.selectedAvatar);
    $("#profileModal").classList.add("hidden");
  });
  $("#peopleButton").addEventListener("click", () => openCallPanel("people"));
  $("#chatButton").addEventListener("click", () => openCallPanel("chat"));
  $("#closeCallPanel").addEventListener("click", () => openCallPanel(state.openPanel));
  $("#peopleList").addEventListener("click", (event) => {
    const row = event.target.closest("[data-person]");
    if (row) focusParticipant(row.dataset.person);
  });
  document.querySelectorAll(".layout-button").forEach((button) => {
    button.addEventListener("click", () => setLayout(button.dataset.layout));
  });
  $("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    const text = input.value.trim().slice(0, 500);
    if (!text) return;
    const message = { type: "chat", text, name: getName(), avatar: state.avatar };
    addChatMessage({ ...message, id: `${Date.now()}-local`, time: new Date().toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" }), own: true });
    broadcast(message);
    input.value = "";
    input.focus();
  });
  $("#micButton").addEventListener("click", toggleMic);
  $("#cameraButton").addEventListener("click", toggleCamera);
  $("#shareButton").addEventListener("click", toggleScreenShare);
  $("#effectsButton").addEventListener("click", () => $("#effectsModal").classList.remove("hidden"));
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
  $("#fullscreenButton").addEventListener("click", () => {
    if (!document.fullscreenElement) meetingView.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  tileGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pin]");
    if (button) {
      state.pinnedId = state.pinnedId === button.dataset.pin ? "" : button.dataset.pin;
      renderTiles();
      return;
    }
    const tile = event.target.closest(".tile");
    if (tile) focusParticipant(tile.dataset.id);
  });
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
  $("#mirrorToggle").checked = state.mirrorOn;
  $("#glowWidth").value = state.glowWidth;
  $("#glowWidthValue").textContent = `${state.glowWidth} px`;
  document.querySelectorAll(".theme-toggle").forEach((button) => button.addEventListener("click", toggleTheme));
  applyTheme();
  const params = new URLSearchParams(location.search);
  const inviteCode = params.get("room");
  if (inviteCode) {
    roomInput.value = normalizeCode(inviteCode);
    const hostId = params.get("host") || makeHostId(normalizeCode(inviteCode));
    openRoom(false, normalizeCode(inviteCode), hostId);
  }
  refreshIcons();
})();