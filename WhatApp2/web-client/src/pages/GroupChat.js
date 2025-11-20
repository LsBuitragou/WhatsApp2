// web-client/src/pages/GroupChat.js
import renderUserBar from "../components/UserBar.js";
import { sendGroupMessage, joinGroup } from "../services/GroupService.js";

export const renderGroupChatPage = (username, group) => {
  const app = document.getElementById("app");
  if (!app) {
    console.error("[GroupChat] #app no encontrado");
    return;
  }
  if (!group) {
    console.error("[GroupChat] group vacío");
    app.innerHTML = "<div style='color:red;padding:16px;'>Grupo inválido.</div>";
    return;
  }
  app.innerHTML = "";

  try {
    // Barra superior
    const userbar = renderUserBar({ name: username });
    app.appendChild(userbar);

    // Contenedor principal
    const chatContainer = document.createElement("div");
    chatContainer.classList.add("chat-container");
    app.appendChild(chatContainer);

    // Título
    const title = document.createElement("h3");
    title.classList.add("chat-title");
    title.textContent = `Grupo: ${group}`;
    chatContainer.appendChild(title);

    // Área mensajes
    const messagesDiv = document.createElement("div");
    messagesDiv.classList.add("messages");
    chatContainer.appendChild(messagesDiv);

    const append = (kind, text) => {
      const div = document.createElement("div");
      div.classList.add("msg", kind); // 'sent' | 'received' | 'system' | 'error'
      div.textContent = text;
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    // Auto-join (silencioso)
    (async () => {
      try {
        const r = await joinGroup(username, group);
        console.log("[GroupChat] join resp:", r);
        append("system", `Te uniste a ${group}.`);
      } catch (e) {
        console.warn("[GroupChat] join falló (posible ya unido):", e);
        append("system", `Intento de unión a ${group}…`);
      }
    })();

    // ==== SSE (recibir y filtrar por grupo) ====
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const groupName = esc(group);
    const patterns = [
      new RegExp(`^\\[\\s*${groupName}\\s*\\]`, "i"),
      new RegExp(`^group\\s+${groupName}\\b`, "i"),
      new RegExp(`^${groupName}\\s*[|:\\-]`, "i"),
    ];
    const matchesGroup = (line) => patterns.some((re) => re.test(line));

    try {
      if (window.__groupSSE && window.__groupSSE.username === username) {
        window.__groupSSE.es.close();
      }
    } catch {}

    const es = new EventSource(
      `http://localhost:3002/api/stream?username=${encodeURIComponent(username)}`
    );
    window.__groupSSE = { es, username };

    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (!payload || !payload.line) return;
        const line = payload.line;
        if (matchesGroup(line)) append("received", line);
      } catch (e) {
        console.warn("[GroupChat] onmessage parse err:", e);
      }
    };
    es.addEventListener("error", () => append("error", "Stream desconectado."));
    es.addEventListener("close", () => append("system", "Conexión cerrada."));

    // Entrada y envío
    const input = document.createElement("input");
    input.classList.add("chat-input");
    input.placeholder = `Mensaje para ${group}…`;

    const sendBtn = document.createElement("button");
    sendBtn.textContent = "Enviar";
    sendBtn.classList.add("btn");

    const doSend = async () => {
      const msg = input.value.trim();
      if (!msg) return;
      sendBtn.disabled = true;
      try {
        const r = await sendGroupMessage(username, group, msg);
        console.log("[GroupChat] send resp:", r);
        append("sent", `[${group}] (yo) ${msg}`);
        input.value = "";
        input.focus();
      } catch (e) {
        console.error("[GroupChat] error envío:", e);
        append("error", "No se pudo enviar el mensaje.");
      } finally {
        sendBtn.disabled = false;
      }
    };

    sendBtn.addEventListener("click", doSend);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSend(); });

    const inputContainer = document.createElement("div");
      inputContainer.classList.add("chat-input-container");

    inputContainer.appendChild(input);
    inputContainer.appendChild(sendBtn);
    chatContainer.appendChild(inputContainer);
  } catch (e) {
    console.error("[GroupChat] excepción al renderizar:", e);
    const err = document.createElement("div");
    err.style.color = "red";
    err.style.padding = "16px";
    err.textContent = "Error al cargar el chat del grupo. Revisa la consola.";
    app.appendChild(err);
  }
};
