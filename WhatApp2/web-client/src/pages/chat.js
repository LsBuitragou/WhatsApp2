import renderUserBar from "../components/UserBar.js";
import { sendMessage, startCall } from "../services/UserService.js";

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
  call.classList.add("Btn");
  call.classList.add("callBtn");
  title.textContent = `Chat con ${contact}`;
  title.classList.add("chat-title");
  chatContainer.appendChild(title);
  chatContainer.appendChild(call);

  // Área de mensajes
  const messagesDiv = document.createElement("div");
  messagesDiv.classList.add("messages");
  chatContainer.appendChild(messagesDiv);

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
        await doCall(from, to);
        alert("Llamada iniciada!");
    } catch {
        alert("No se pudo iniciar la llamada");
    }};


  callBtn.addEventListener("click", doCall);

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

  app.appendChild(chatContainer);
};
