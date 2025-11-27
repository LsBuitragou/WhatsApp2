class Subscriber extends Demo.Observer {
  constructor(delegate) {
    super();
    this.delegate = delegate;
  }

  notifyAudio(bytes) {
    // bytes suele llegar como Uint8Array/Array
    const u8 =
      bytes instanceof Uint8Array ? bytes :
      Array.isArray(bytes) ? Uint8Array.from(bytes) :
      new Uint8Array(bytes);

    if (this.delegate.onAudioCallback) this.delegate.onAudioCallback(u8);
  }

  notifyAudioMessage(bytes) {
    const u8 =
      bytes instanceof Uint8Array ? bytes :
      Array.isArray(bytes) ? Uint8Array.from(bytes) :
      new Uint8Array(bytes);

    if (this.delegate.onAudioMessageCallback) this.delegate.onAudioMessageCallback(u8);
  }

  incomingCall(sender) {
    if (this.delegate.onIncomingCall) this.delegate.onIncomingCall(sender);
  }

  callAccepted(sender) {
    if (this.delegate.onCallAccepted) this.delegate.onCallAccepted(sender);
  }

  callRejected(sender) {
    if (this.delegate.onCallRejected) this.delegate.onCallRejected(sender);
  }

  CallEnded(sender) {
    if (this.delegate.onCallEnded) this.delegate.onCallEnded(sender);
  }
}

export default Subscriber;
