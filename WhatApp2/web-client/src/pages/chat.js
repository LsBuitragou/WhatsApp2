import renderUserBar from "../components/UserBar.js";
import { sendMessage } from "../services/UserService.js";
import delegate from "../services/delegate.js";

export const renderChatPage = (username, contact) => {
  const app = document.getElementById("app");
  app.innerHTML = "";

  // ===== Estado llamada =====
  let currentSessionId = null;
  let localStream = null;
  let micAudioContext = null;
  let micSource = null;
  let micProcessor = null;

  // Playback llamada
  let playCtx = null;
  let playTime = 0;

  // ===== Nota de voz =====
  let vnRecorder = null;
  let vnStream = null;
  let vnChunks = [];
  let vnMime = "";

  // Barra superior
  const userbar = renderUserBar({ name: username });
  app.appendChild(userbar);

  // Contenedor
  const chatContainer = document.createElement("div");
  chatContainer.classList.add("chat-container");

  // Header: título + botones
  const titleRow = document.createElement("div");
  titleRow.classList.add("chat-title-row");

  const title = document.createElement("h3");
  title.textContent = `Chat con ${contact}`;
  title.classList.add("chat-title");

  const callBtn = document.createElement("button");
  callBtn.classList.add("btn");
  callBtn.textContent = "Llamar";

  const voiceBtn = document.createElement("button");
  voiceBtn.classList.add("btn");
  voiceBtn.textContent = "🎙️ Nota";
  voiceBtn.title = "Grabar nota de voz";

  titleRow.appendChild(title);
  titleRow.appendChild(callBtn);
  titleRow.appendChild(voiceBtn);
  chatContainer.appendChild(titleRow);

  // Alert box
  const alertBox = document.createElement("h2");
  alertBox.classList.add("alert-box");
  alertBox.style.display = "none";
  chatContainer.appendChild(alertBox);

  // Mensajes
  const messagesDiv = document.createElement("div");
  messagesDiv.classList.add("messages");
  chatContainer.appendChild(messagesDiv);

  // ---- util render ----
  const append = (kind, text) => {
    const div = document.createElement("div");
    div.classList.add("msg", kind); // sent | received | system | error
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const appendVoice = ({ kind, label, url }) => {
    const wrap = document.createElement("div");
    wrap.classList.add("msg", kind);

    const t = document.createElement("div");
    t.classList.add("audio-label");
    t.textContent = label;

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = url;

    wrap.appendChild(t);
    wrap.appendChild(audio);
    messagesDiv.appendChild(wrap);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  // ===== ICE =====
  const ensureIceReady = async () => {
    if (delegate?.subject) return;
    if (typeof delegate?.init === "function") {
      await delegate.init(username);
      return;
    }
    throw new Error("ICE no está inicializado (delegate.subject no existe y no hay delegate.init).");
  };

  // Conectar ICE al abrir chat
  ensureIceReady()
    .then(() => append("system", "ICE WS conectado (listo para recibir notas/llamadas)."))
    .catch((e) => append("error", "ICE WS NO conectado: " + (e?.message || e)));

  // ===== Helpers nota de voz =====
  const pickMimeType = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    for (const t of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  };

  const sendVoiceNoteICE = async ({ blob, to }) => {
    await ensureIceReady();
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);

    if (bytes.byteLength > 6 * 1024 * 1024) throw new Error("Nota de voz demasiado grande.");
    await delegate.sendAudioMessage(bytes, to);
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      append("error", "Tu navegador no soporta getUserMedia para audio.");
      return;
    }

    try {
      vnStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      vnChunks = [];

      vnMime = pickMimeType();
      vnRecorder = new MediaRecorder(vnStream, vnMime ? { mimeType: vnMime } : undefined);

      vnRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) vnChunks.push(e.data);
      };

      vnRecorder.onstop = async () => {
        try {
          const blob = new Blob(vnChunks, { type: vnRecorder.mimeType || "audio/webm" });

          const localUrl = URL.createObjectURL(blob);
          appendVoice({ kind: "sent", label: `🎙️ Nota de voz (a ${contact})`, url: localUrl });

          await sendVoiceNoteICE({ blob, to: contact });
          append("system", "Nota de voz enviada.");
        } catch (err) {
          console.error("Error enviando nota de voz:", err);
          append("error", "No se pudo enviar la nota de voz.");
        } finally {
          try { vnStream?.getTracks().forEach((t) => t.stop()); } catch {}
          vnStream = null;
          vnRecorder = null;
          vnChunks = [];
          voiceBtn.textContent = "🎙️ Nota";
        }
      };

      vnRecorder.start();
      voiceBtn.textContent = "⏹️ Stop";
      append("system", "Grabando nota de voz...");
    } catch (err) {
      console.error("Error abriendo micrófono (nota de voz):", err);
      append("error", "No se pudo acceder al micrófono para nota de voz.");
      try { vnStream?.getTracks().forEach((t) => t.stop()); } catch {}
      vnStream = null;
      vnRecorder = null;
      voiceBtn.textContent = "🎙️ Nota";
    }
  };

  const stopVoiceRecording = () => {
    try {
      if (vnRecorder && vnRecorder.state !== "inactive") vnRecorder.stop();
    } catch (err) {
      console.error("stopVoiceRecording error:", err);
      append("error", "No se pudo detener la grabación.");
      vnRecorder = null;
      voiceBtn.textContent = "🎙️ Nota";
    }
  };

  voiceBtn.addEventListener("click", async () => {
    if (!vnRecorder || vnRecorder.state === "inactive") await startVoiceRecording();
    else stopVoiceRecording();
  });

  // ===== UI llamadas  =====
  let activeCallModalOverlay = null;

  const showActiveCallModal = (other) => {
    alertBox.style.display = "none";

    const overlay = document.createElement("div");
    overlay.classList.add("incoming-call-overlay");

    const modal = document.createElement("div");
    modal.classList.add("incoming-call-modal");

    const text = document.createElement("p");
    text.classList.add("call-text");
    text.textContent = `Llamada en curso con ${other}`;

    const btnContainer = document.createElement("div");
    btnContainer.classList.add("button-container");

    const hangupBtn = document.createElement("button");
    hangupBtn.textContent = "Colgar";
    hangupBtn.classList.add("btn", "reject");

    btnContainer.appendChild(hangupBtn);
    modal.appendChild(text);
    modal.appendChild(btnContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    activeCallModalOverlay = overlay;

    hangupBtn.addEventListener("click", async () => {
      try {
        await delegate.endCall(other);
      } catch (e) {
        console.error("endCall UI error:", e);
      }
    });
  };

  const hideActiveCallModal = () => {
    if (activeCallModalOverlay) {
      activeCallModalOverlay.remove();
      activeCallModalOverlay = null;
    }
  };

  const stopStreaming = () => {
    try {
      micProcessor && micProcessor.disconnect();
      micSource && micSource.disconnect();
      micAudioContext && micAudioContext.close();
    } catch {}
    micProcessor = null;
    micSource = null;
    micAudioContext = null;

    try { localStream?.getTracks().forEach((t) => t.stop()); } catch {}
    localStream = null;

    playTime = 0;
  };

  const startStreaming = async (other) => {
    currentSessionId = other;

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      micAudioContext = new AudioContext({ sampleRate: 44100 });
      micSource = micAudioContext.createMediaStreamSource(localStream);
      micProcessor = micAudioContext.createScriptProcessor(2048, 1, 1);

      micSource.connect(micProcessor);
      micProcessor.connect(micAudioContext.destination);

      micProcessor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);

        // Float32 -> PCM16
        const pcm16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm16[i] = (s * 0x7fff) | 0;
        }

        delegate.sendAudio(pcm16);
      };

      console.log("Micrófono transmitiendo audio...");
    } catch (err) {
      console.error("Error abriendo micrófono:", err);
      alert("No se pudo acceder al micrófono");
    }
  };

  // Playback audio llamada (PCM16 little-endian)
  const convertPCM16BytesToFloat32 = (bytesU8) => {
    const u8 = bytesU8 instanceof Uint8Array ? bytesU8 : new Uint8Array(bytesU8);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const len = Math.floor(u8.byteLength / 2);
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const s = dv.getInt16(i * 2, true);
      out[i] = s / 32768;
    }
    return out;
  };

  const playCallChunk = (bytes) => {
    try {
      if (!playCtx) playCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });

      const floatArray = convertPCM16BytesToFloat32(bytes);
      const buffer = playCtx.createBuffer(1, floatArray.length, 44100);
      buffer.getChannelData(0).set(floatArray);

      const src = playCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(playCtx.destination);

      const now = playCtx.currentTime;
      if (playTime < now) playTime = now;
      src.start(playTime);
      playTime += buffer.duration;
    } catch (e) {
      console.error("playCallChunk error:", e);
    }
  };

  // ===== Callbacks ICE =====
  delegate.onIncoming(async (caller) => {

    const overlay = document.createElement("div");
    overlay.classList.add("incoming-call-overlay");

    const modal = document.createElement("div");
    modal.classList.add("incoming-call-modal");

    const text = document.createElement("p");
    text.classList.add("call-text");
    text.textContent = `${caller} te está llamando`;

    const btnContainer = document.createElement("div");
    btnContainer.classList.add("button-container");

    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = "Aceptar";
    acceptBtn.classList.add("btn", "accept");

    const rejectBtn = document.createElement("button");
    rejectBtn.textContent = "Rechazar";
    rejectBtn.classList.add("btn", "reject");

    btnContainer.appendChild(acceptBtn);
    btnContainer.appendChild(rejectBtn);

    modal.appendChild(text);
    modal.appendChild(btnContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cleanup = () => overlay.remove();

    acceptBtn.addEventListener("click", async () => {
      cleanup();
      try {
        await ensureIceReady();
        await delegate.acceptCall(caller);

        showActiveCallModal(caller);
        await startStreaming(caller);
      } catch (e) {
        console.error("acceptCall error:", e);
      }
    });

    rejectBtn.addEventListener("click", async () => {
      cleanup();
      try {
        await ensureIceReady();
        await delegate.rejectCall(caller);
      } catch (e) {
        console.error("rejectCall error:", e);
      }
    });
  });

  delegate.onAccepted(async (other) => {
    if (other !== contact) return;
    showActiveCallModal(other);
    await startStreaming(other);
  });

  delegate.onRejected((other) => {
    if (other !== contact) return;
    alertBox.style.display = "none";
    append("system", "Llamada rechazada.");
  });

  delegate.onEnded((whoHungUp) => {
    // llega al otro lado con "fromUser"
    hideActiveCallModal();
    stopStreaming();
    currentSessionId = null;
    append("system", `Llamada terminada (colgó: ${whoHungUp}).`);
  });

  delegate.onAudio((pcmBytes) => playCallChunk(pcmBytes));

  delegate.onAudioMessage((bytes) => {
    try {
      const u8 =
        bytes instanceof Uint8Array ? bytes :
        Array.isArray(bytes) ? Uint8Array.from(bytes) :
        new Uint8Array(bytes);

      append("system", `[DEBUG] Nota recibida bytes=${u8.length}`);

      const blob = new Blob([u8], { type: "audio/webm" });
      const url = URL.createObjectURL(blob);

      appendVoice({ kind: "received", label: `🎙️ Nota de voz de ${contact}`, url });
    } catch (err) {
      console.error("Error renderizando nota de voz recibida:", err);
      append("error", "Llegó la nota pero falló al renderizar (mira consola).");
    }
  });

  // ===== Llamar =====
  callBtn.addEventListener("click", async () => {
    try {
      await ensureIceReady();
      await delegate.startCall(contact);
      currentSessionId = contact;

      alertBox.style.display = "block";
      alertBox.textContent = `Llamando a ${contact}...`;
    } catch (err) {
      console.error("Error al iniciar llamada:", err);
      alert("No se pudo iniciar la llamada: " + (err.message || err.toString()));
    }
  });

  // ===== Stream SSE (texto) =====
  try {
    if (window.__chatSSE && window.__chatSSE.username === username) {
      try { window.__chatSSE.es.close(); } catch {}
    }
  } catch {}

  const sseUrl = `http://localhost:3002/api/stream?username=${encodeURIComponent(username)}`;
  const es = new EventSource(sseUrl);
  window.__chatSSE = { es, username };

  es.onmessage = (ev) => {
    try {
      const payload = JSON.parse(ev.data);
      if (!payload) return;
      if (payload.hello) return append("system", `Conectado como ${payload.hello}`);
      if (payload.line) append("received", payload.line);
    } catch {}
  };

  es.addEventListener("error", () => append("error", "Stream desconectado."));
  es.addEventListener("close", () => append("system", "Conexión cerrada."));

  // ===== Enviar texto =====
  const inputContainer = document.createElement("div");
  inputContainer.classList.add("chat-input-container");

  const input = document.createElement("input");
  input.placeholder = "Escribe un mensaje...";
  input.classList.add("chat-input");

  const sendBtn = document.createElement("button");
  sendBtn.textContent = "Enviar";
  sendBtn.classList.add("btn");

  const doSend = async () => {
    const msg = input.value.trim();
    if (!msg) return;

    try {
      await sendMessage(username, contact, msg);
      append("sent", `(a ${contact}) ${msg}`);
      input.value = "";
      input.focus();
    } catch (err) {
      console.error("Error enviando mensaje:", err);
      append("error", "No se pudo enviar el mensaje.");
    }
  };

  sendBtn.addEventListener("click", doSend);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSend();
  });

  inputContainer.appendChild(input);
  inputContainer.appendChild(sendBtn);
  chatContainer.appendChild(inputContainer);

  app.appendChild(chatContainer);
};
