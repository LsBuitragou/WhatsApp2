
class Subscriber extends Demo.Observer {
    constructor(delegate) {
        super();
        this.delegate = delegate;
    }

    notifyMessage(bytes) {
        try {
            console.log('[Subscriber] notifyMessage recibido, bytes:', bytes ? bytes.length : 0);
            if (this.delegate && this.delegate.notify) {
                this.delegate.notify(bytes);
            }
        } catch (err) {
            console.error('[Subscriber] Error en notifyMessage:', err);
        }
    }

    onCallStarted(sessionId, caller, receiver) {
        try {
            console.log('[Subscriber] onCallStarted recibido con sessionId:', sessionId, 'caller:', caller, 'receiver:', receiver);
            if (this.delegate && this.delegate.notifyCallStarted) {
                this.delegate.notifyCallStarted(sessionId, caller, receiver);
            }
            if (window.renderChatPage_showIncomingCallUI) {
                window.renderChatPage_showIncomingCallUI(sessionId, caller, receiver);
            }
        } catch (err) {
            console.error('[Subscriber] Error en onCallStarted:', err);
        }
    }

    onCallEnded(sessionId, caller, receiver) {
        try {
            console.log('[Subscriber] onCallEnded recibido con sessionId:', sessionId, 'caller:', caller, 'receiver:', receiver);
            if (this.delegate && this.delegate.notifyCallEnded) {
                this.delegate.notifyCallEnded(sessionId, caller, receiver);
            }
            if (window.renderChatPage_onCallEndedUI) {
                window.renderChatPage_onCallEndedUI();
            }
        } catch (err) {
            console.error('[Subscriber] Error en onCallEnded:', err);
        }
    }
}

export default Subscriber;