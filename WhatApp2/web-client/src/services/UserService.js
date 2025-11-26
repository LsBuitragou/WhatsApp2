
import delegate from './delegate.js';

const onLogin = async (username) => {
  try {
    const response = await fetch("http://localhost:3002/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const data = await response.json();
    console.log("Usuario creado:", data);
    await delegate.init(username);
    delegate.onIncoming((from) => alert(`${from} te está llamando`));
    delegate.onAccepted((from) => alert(`${from} aceptó tu llamada`));
    delegate.onRejected((from) => alert(`${from} rechazó tu llamada`));
    delegate.onEnded((from) => alert(`${from} colgó`));
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("No se pudo crear el usuario.");
  }
};

const sendMessage = async (from, to, msg) => {
  try {
    const response = await fetch("http://localhost:3002/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: String(from),
        to: String(to),
        msg: msg
      }),
    });

    const data = await response.json();
    console.log("Mensaje enviado:", data);
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("No se pudo enviar el mensaje.");
  }
};

const startCall = async (from, to) => {
  try {
    if (!delegate.subject || delegate.name !== from) {
      console.log('[UserService] Inicializando delegate con username:', from);
      await delegate.init(from);
    }

    await delegate.startCall(to);

    console.log(`[UserService] Llamada iniciada de ${from} a ${to}`);
    return true;

  } catch (err) {
    console.error("Error iniciando llamada en UserService:", err);
    throw err;
  }
};

const userServiceEndCall = async (sessionId) => {
    try {
        return await delegate.subject.endCall(sessionId);
    } catch (err) {
        console.error("[UserService] Error al terminar llamada:", err);
        throw err;
    }
};

export {onLogin, sendMessage, startCall, userServiceEndCall};
