import renderUserBar from "../components/UserBar.js";
import { sendMessage, startCall } from "../services/UserService.js";
import delegate from "../services/delegate.js";

export const renderChatPage = (username, contact) => {

  
  const app = document.getElementById("app");
  app.innerHTML = "";

  // Estado de la llamada
  let currentSessionId = null;
  let localStream = null;

  // Barra superior del usuario
  const userbar = renderUserBar({ name: username });
  app.appendChild(userbar);

  // Contenedor principal del chat
  const chatContainer = document.createElement("div");
  chatContainer.classList.add("chat-container");

  // Título
  const title = document.createElement("h3");
  const call = document.createElement("button");
  call.classList.add("btn");
  call.textContent = "Llamar";
  title.textContent = `Chat con ${contact}`;
  title.classList.add("chat-title");
  chatContainer.appendChild(title);
  chatContainer.appendChild(call);

  // Área de mensajes
  const messagesDiv = document.createElement("div");
  messagesDiv.classList.add("messages");
  chatContainer.appendChild(messagesDiv);

  // Llamada activada
  const callDiv = document.createElement("div");
  callDiv.classList.add("callBox");
  const callStatus = document.createElement("p");
  callStatus.textContent = "Llamada en curso...";
  const hangupBtn = document.createElement("button");
  hangupBtn.textContent = "Colgar";
  hangupBtn.classList.add("btn");
  callDiv.appendChild(callStatus);
  callDiv.appendChild(hangupBtn);
  callDiv.style.display = "none"; // Oculta por defecto
  chatContainer.appendChild(callDiv);

  // ---- util de render ----
  const append = (kind, text) => {
    const div = document.createElement("div");
    div.classList.add("msg", kind); // sent | received | system | error
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };
  
  const doCall = async () => {
  const from = localStorage.getItem("username");
  const to = contact;

  try {
    await startCall(from, to);
    currentSessionId = to;
    alert("Llamando a " + to + "...");
  } catch (err) {
    console.error("Error al iniciar llamada:", err);
    alert("No se pudo iniciar la llamada: " + (err.message || err.toString()));
  }
  };

const showIncomingCallModal = (caller) => {
  return new Promise((resolve, reject) => {

    // Overlay
    const overlay = document.createElement("div");
    overlay.classList.add("incoming-call-overlay");

    // Modal
    const modal = document.createElement("div");
    modal.classList.add("incoming-call-modal");

    // Texto
    const text = document.createElement("p");
    text.classList.add("call-text");
    text.textContent = `${caller} te está llamando`;

    // Botones
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

    const cleanup = () => {
      acceptBtn.removeEventListener("click", onAccept);
      rejectBtn.removeEventListener("click", onReject);
      overlay.remove();
    };

    const onAccept = () => {
      cleanup();
      resolve(true);
      currentSessionId = caller;
      delegate.acceptCall(caller);
    };

    const onReject = () => {
      cleanup();
      resolve(false);
      delegate.rejectCall(caller);
    };

    acceptBtn.addEventListener("click", onAccept);
    rejectBtn.addEventListener("click", onReject);
  });
};

delegate.onAccepted(async (fromUser) => {
  if (fromUser !== contact) return;

  console.log("Llamada aceptada, abriendo micrófono...");

  callDiv.style.display = "flex";
  callStatus.textContent = "Llamada en curso...";

  try {
    // 1. Abrir micrófono
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 2. Capturar audio en chunks
    const audioContext = new AudioContext({ sampleRate: 44100 });
    const source = audioContext.createMediaStreamSource(localStream);

    const processor = audioContext.createScriptProcessor(2048, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);

      // Convert Float32 → PCM16
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        pcm16[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
      }

      // 3. Enviar audio al otro usuario
      delegate.sendAudio(pcm16);
    };

    console.log("Micrófono transmitiendo audio...");
  } catch (err) {
    console.error("Error abriendo micrófono:", err);
    alert("No se pudo acceder al micrófono");
  }
});


  // Reproducción local de audio entrante (callback para delegate)
  const playAudioLocal = (arrayBuffer) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
      const floatArray = convertPCM16ToFloat32(arrayBuffer);
      const audioBuffer = ctx.createBuffer(1, floatArray.length, 44100);
      audioBuffer.getChannelData(0).set(floatArray);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.error('playAudioLocal error', err);
    }
  };

  const convertPCM16ToFloat32 = (arrayBuffer) => {
    const buffer = arrayBuffer instanceof ArrayBuffer ? arrayBuffer : arrayBuffer.buffer;
    const view = new DataView(buffer);
    const float32Array = new Float32Array(buffer.byteLength / 2);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = view.getInt16(i * 2, false);
      float32Array[i] = sample / 32768;
    }
    return float32Array;
  };

  delegate.onAudio((pcm16) => playAudioLocal(pcm16));

  const endCall = async () => {
    try {
        console.log("Finalizando llamada...");

        // 1. Avisar al otro usuario que colgaste
        if (currentSessionId && delegate?.subject) {
            await delegate.subject.endCall(currentSessionId);
        }

        // 2. Apagar micrófono y liberar recursos
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }

        // 3. Detener audio entrante (si existe cola o buffer)
        if (audioPlayer && audioPlayer.stop) {
            audioPlayer.stop();
        }
        if (bufferQueue) bufferQueue = [];
        isPlaying = false;

        // 4. Ocultar UI de llamada
        callDiv.style.display = "none";

        // 5. Limpiar ID de sesión
        currentSessionId = null;

        console.log("Llamada finalizada correctamente.");
    } catch (err) {
        console.error("Error al finalizar llamada:", err);
    }
};


  call.addEventListener("click", doCall);
  hangupBtn.addEventListener("click", endCall);


  // ===== Stream SSE =====
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
      if (payload.hello) {
        append("system", `Conectado como ${payload.hello}`);
        return;
      }
      if (payload.line) {
        append("received", payload.line);
      }
    } catch {}
  };

  es.addEventListener("error", () => append("error", "Stream desconectado."));
  es.addEventListener("close", () => append("system", "Conexión cerrada."));

  // Caja de envío de mensaje
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

  delegate.onIncoming((caller) => {
  showIncomingCallModal(caller);
  });


  app.appendChild(chatContainer);
};

