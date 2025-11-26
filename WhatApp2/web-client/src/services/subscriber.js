
class Subscriber extends Demo.Observer {
    constructor(delegate) {
        super();
        this.delegate = delegate;
    }

     notifyAudio(bytes) {
        console.log("[Subscriber] Audio recibido:", bytes.length);
        if (this.delegate.onAudioCallback)
            this.delegate.onAudioCallback(bytes);
    }

    notifyAudioMessage(bytes) {
        console.log("[Subscriber] AudioMessage recibido:", bytes.length);
        if (this.delegate.onAudioMessageCallback)
            this.delegate.onAudioMessageCallback(bytes);
    }

    incomingCall(sender) {
        console.log("[Subscriber] Llamada entrante de:", sender);
        if (this.delegate.onIncomingCall)
            this.delegate.onIncomingCall(sender);
    }

    callAccepted(sender) {
        console.log("[Subscriber] Llamada aceptada por:", sender);
        if (this.delegate.onCallAccepted)
            this.delegate.onCallAccepted(sender);
    }

    callRejected(sender) {
        console.log("[Subscriber] Llamada rechazada por:", sender);
        if (this.delegate.onCallRejected)
            this.delegate.onCallRejected(sender);
    }

    CallEnded(sender) { 
        console.log("[Subscriber] Llamada colgada por:", sender);
        if (this.delegate.onCallEnded)
            this.delegate.onCallEnded(sender);
    }
}

export default Subscriber;