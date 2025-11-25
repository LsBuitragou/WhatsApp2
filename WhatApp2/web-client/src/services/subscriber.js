
class Subscriber extends Demo.Observer {
    constructor(delegate) {
        super();
        this.delegate = delegate;
    }

    notifyMessage(bytes) {
       const ctx = new AudioContext();
    const buffer = ctx.createBuffer(1, bytes.length, ctx.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < bytes.length; i++) {
        channel[i] = bytes[i] / 0x7FFF;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
    }

    onCallStarted(sessionId) {
        console.log("Llamada entrante:", sessionId);
        window.renderChatPage_showIncomingCallUI(sessionId);
        window.renderChatPage_openMicrophone(sessionId);
    }

    onCallEnded(sessionId) {
        console.log("Llamada finalizada:", sessionId);

        if (window.localStream) {
            window.localStream.getTracks().forEach(t => t.stop());
            window.localStream = null;
        }

        if (window.renderChatPage_onCallEndedUI) {
            window.renderChatPage_onCallEndedUI();
        }
    }
}

export default Subscriber;