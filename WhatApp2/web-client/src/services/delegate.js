import Subscriber from "./subscriber.js";

class IceDelegate {
  constructor() {
    this.communicator = null;
    this.subject = null;

    this.name = null;
    this.currentCall = null;

    this.onAudioCallback = null;
    this.onAudioMessageCallback = null;
    this.onIncomingCall = null;
    this.onCallAccepted = null;
    this.onCallRejected = null;
    this.onCallEnded = null;

    this.subscriber = new Subscriber(this);

    this._adapter = null;
    this._callbackPrx = null;
    this._conn = null;
  }

  async init(username, callbacks = null) {
    // Permite init estilo colega: init(username, { notifyAudio, notifyAudioMessage, incomingCall, callAccepted, callRejected, callEnded })
    if (callbacks && typeof callbacks === "object") {
      if (callbacks.notifyAudio) this.onAudioCallback = callbacks.notifyAudio;
      if (callbacks.notifyAudioMessage) this.onAudioMessageCallback = callbacks.notifyAudioMessage;
      if (callbacks.incomingCall) this.onIncomingCall = callbacks.incomingCall;
      if (callbacks.callAccepted) this.onCallAccepted = callbacks.callAccepted;
      if (callbacks.callRejected) this.onCallRejected = callbacks.callRejected;
      if (callbacks.callEnded) this.onCallEnded = callbacks.callEnded;
    }

    if (this.subject && this.name === username) return;

    this.name = username;

    try {
      if (!this.communicator) this.communicator = Ice.initialize();

      const base = this.communicator.stringToProxy(`AudioService:ws -h localhost -p 9099`);
      this.subject = await Demo.SubjectPrx.checkedCast(base);
      if (!this.subject) throw new Error("No se pudo castear SubjectPrx");

      // Crear adapter callbacks
      const adapter = await this.communicator.createObjectAdapter("");
      const cbObj = adapter.addWithUUID(this.subscriber);
      const callbackPrx = Demo.ObserverPrx.uncheckedCast(cbObj);
      await adapter.activate();

      // ✅ CRÍTICO: bidirectional bien hecho (fuerza conexión real + setAdapter)
      await this.subject.ice_ping();
      const conn = await this.subject.ice_getConnection();
      conn.setAdapter(adapter);

      this._adapter = adapter;
      this._callbackPrx = callbackPrx;
      this._conn = conn;

      // Registrar observer en server
      await this.subject.attachObserver(callbackPrx, this.name);

      console.log("[Delegate] Registrado como:", this.name);
    } catch (err) {
      console.error("[Delegate] Error inicializando:", err);
      this.subject = null;
      throw err;
    }
  }

  async getUsers() {
    if (!this.subject) return [];
    return await this.subject.getConnectedUsers();
  }

  async startCall(target) {
    if (!this.subject) throw new Error("Delegate no inicializado");
    await this.subject.startCall(this.name, target);
    this.currentCall = target;
  }

  async acceptCall(fromUser) {
    if (!this.subject) throw new Error("Delegate no inicializado");
    await this.subject.acceptCall(fromUser, this.name);
    this.currentCall = fromUser;
  }

  async rejectCall(fromUser) {
    if (!this.subject) throw new Error("Delegate no inicializado");
    await this.subject.rejectCall(fromUser, this.name);
  }

  async endCall(target) {
    if (!this.subject || !target) return;
    await this.subject.endCall(this.name, target);
    if (this.currentCall === target) this.currentCall = null;
  }

  // === CALL audio ===
  async sendAudio(pcm16) {
    if (!this.subject || !this.currentCall) return;

    // ✅ Si viene Int16Array => mandar BYTES reales (little-endian)
    let data;
    if (pcm16 instanceof Int16Array) {
      data = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
    } else if (pcm16 instanceof Uint8Array) {
      data = pcm16;
    } else if (pcm16?.buffer instanceof ArrayBuffer) {
      data = new Uint8Array(pcm16.buffer);
    } else {
      data = Uint8Array.from(pcm16);
    }

    await this.subject.sendAudio(this.name, data);
  }

  // === VOICE NOTE ===
  async sendAudioMessage(byteArray, receiver) {
    if (!this.subject) return;

    const data =
      byteArray instanceof Uint8Array
        ? byteArray
        : byteArray?.buffer instanceof ArrayBuffer
          ? new Uint8Array(byteArray.buffer)
          : Uint8Array.from(byteArray);

    await this.subject.sendAudioMessage(this.name, receiver, data);
  }

  // === Setters estilo tu UI ===
  onAudio(cb) { this.onAudioCallback = cb; }
  onAudioMessage(cb) { this.onAudioMessageCallback = cb; }
  onIncoming(cb) { this.onIncomingCall = cb; }
  onAccepted(cb) { this.onCallAccepted = cb; }
  onRejected(cb) { this.onCallRejected = cb; }
  onEnded(cb) { this.onCallEnded = cb; }
}

export default new IceDelegate();
