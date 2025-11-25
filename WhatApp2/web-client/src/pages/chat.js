import renderUserBar from "../components/UserBar.js";
import { sendMessage, startCall } from "../services/UserService.js";
import delegate from "../services/delegate.js";

export const renderChatPage = (username, contact) => {
  const app = document.getElementById("app");
  app.innerHTML = "";

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

  //Llamada activada
  const callDiv = document.createElement("div");
  callDiv.classList.add("callBox");
  const callStatus = document.createElement("p");
  callStatus.textContent = "Llamada en curso...";
  const hangupBtn = document.createElement("button");
  hangupBtn.textContent = "Colgar";
  hangupBtn.classList.add("btn");
  callDiv.appendChild(callStatus);
  callDiv.appendChild(hangupBtn);
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
        alert("Llamada iniciada!");
    } catch (err) {
        console.error("Error al iniciar llamada:", err);
        alert("No se pudo iniciar la llamada: " + (err.message || err.toString()));
    }
  };

  const showIncomingCallUI = (sessionId) => {
    callDiv.classList.add("active");
    callStatus.textContent = "Llamada entrante...";
    callStatus.classList.add("active");
  };

 async function openMicrophone(sessionId) {
    window.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const ctx = new AudioContext({ sampleRate: 44100 });
    const mic = ctx.createMediaStreamSource(localStream);

    // ScriptProcessor (obsoleto, pero compatible y fácil)
    const processor = ctx.createScriptProcessor(2048, 1, 1);

    processor.onaudioprocess = (e) => {
        const float32 = e.inputBuffer.getChannelData(0);
        const pcm16 = float32ToPCM16(float32);
        delegate.subject.sendAudio(sessionId, pcm16);
    };

    mic.connect(processor);
    processor.connect(ctx.destination); // eco local opcional
}

function float32ToPCM16(float32) {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        pcm16[i] = float32[i] * 0x7fff;
    }
    return pcm16;
}

const endCall = async () => {
    try {
        console.log("Finalizando llamada en UI…");

        await userServiceEndCall(currentSessionId);

        // Apagas el micrófono y limpias MediaStream
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }

        // Ocultar UI
        callBox.classList.remove("active");
        callStatus.classList.remove("active");
        
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


  window.renderChatPage_showIncomingCallUI = showIncomingCallUI;
  window.renderChatPage_onCallEndedUI = onCallEndedUI;
  window.renderChatPage_openMicrophone = openMicrophone;
  window.renderChatPage_endCall = endCall;
  app.appendChild(chatContainer);
};

