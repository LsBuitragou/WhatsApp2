import Subscriber from './subscriber.js';

class IceDelegate {
  constructor() {
    this.communicator = Ice.initialize();
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
  }

  async init(username) {
    this.name = username;
    if (this.subject) return;

    try {
      const proxy = this.communicator.stringToProxy(
        `AudioService:ws -h localhost -p 9099`
      );

      this.subject = await Demo.SubjectPrx.checkedCast(proxy);
      if (!this.subject) throw new Error("No se pudo castear SubjectPrx");

      const adapter = await this.communicator.createObjectAdapter("");
      const callbackPrx = Demo.ObserverPrx.uncheckedCast(
        adapter.addWithUUID(this.subscriber)
      );
      await adapter.activate();

      await this.subject.attachObserver(callbackPrx, this.name);

      console.log("[Delegate] Registrado como:", this.name);
    } catch (err) {
      console.error("[Delegate] Error inicializando:", err);
    }
  }

  async getUsers() {
    if (!this.subject) return [];
    return await this.subject.getConnectedUsers();
  }

  async startCall(target) {
    if (!this.subject) return;
    await this.subject.startCall(this.name, target);
    this.currentCall = target;
  }

  async acceptCall(fromUser) {
    if (!this.subject) return;
    await this.subject.acceptCall(fromUser, this.name);
    this.currentCall = fromUser;
  }

  async rejectCall(fromUser) {
    if (!this.subject) return;
    await this.subject.rejectCall(fromUser, this.name);
  }

  async endCall(target) {
    if (!this.subject || !target) return;
    await this.subject.endCall(this.name, target);

    if (this.currentCall === target)
      this.currentCall = null;
  }

  async sendAudio(byteArray) {
    if (!this.subject || !this.currentCall) return;

    const data = byteArray instanceof Uint8Array
      ? byteArray
      : Uint8Array.from(byteArray);

    await this.subject.sendAudio(this.name, data);
  }

  async sendAudioMessage(byteArray, receiver) {
    if (!this.subject) return;

    const data = byteArray instanceof Uint8Array
      ? byteArray
      : Uint8Array.from(byteArray);

    await this.subject.sendAudioMessage(this.name, receiver, data);
  }

  // === Callbacks que usará tu UI ===
  onAudio(cb) { this.onAudioCallback = cb; }
  onAudioMessage(cb) { this.onAudioMessageCallback = cb; }

  onIncoming(cb) { 
    this.onIncomingCall = cb;
  }

  onAccepted(cb) { this.onCallAccepted = cb; }
  onRejected(cb) { this.onCallRejected = cb; }
  onEnded(cb) { this.onCallEnded = cb; }
}

export default new IceDelegate();