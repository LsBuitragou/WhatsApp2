class Subscriber extends Demo.Observer {
    constructor(delegate) {
        super();
        this.delegate = delegate;
    }

    notifyMessage(msg) {
        this.delegate.notify(msg);
    }

    onCallStarted(sessionId) {
        console.log("Llamada iniciada:", sessionId);

    }

    onCallEnded(sessionId) {
        console.log("Llamada finalizada:", sessionId);
    
    }
}

export default Subscriber;