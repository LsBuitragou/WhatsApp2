
package call;

import Demo.ObserverPrx;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import java.util.UUID;

/**
 * Representa una llamada activa entre uno o más clientes.
 */
public class CallSession {

    private final String sessionId;
    private final String caller;
    private final String receiver;
    private final ObserverPrx callerProxy;
    private final ObserverPrx receiverProxy;
    private boolean active;

    public CallSession(String caller, ObserverPrx callerProxy, String receiver, ObserverPrx receiverProxy) {
        this.sessionId = UUID.randomUUID().toString();
        this.caller = caller;
        this.receiver = receiver;
        this.callerProxy = callerProxy;
        this.receiverProxy = receiverProxy;
        this.active = true;

        // notify both participants about the started call, include caller/receiver info
        try {
            callerProxy.onCallStartedAsync(sessionId, caller, receiver);
        } catch (Exception e) {
            try { callerProxy.onCallStarted(sessionId, caller, receiver); } catch (Exception ex) {}
        }

        try {
            receiverProxy.onCallStartedAsync(sessionId, caller, receiver);
        } catch (Exception e) {
            try { receiverProxy.onCallStarted(sessionId, caller, receiver); } catch (Exception ex) {}
        }
    }

    public String getSessionId() { return sessionId; }
    public String getCaller() { return caller; }
    public String getReceiver() { return receiver; }
    public ObserverPrx getCallerProxy() { return callerProxy; }
    public ObserverPrx getReceiverProxy() { return receiverProxy; }

    public boolean isActive() { return active; }
    public void endSession() { this.active = false; }

    public void notifyEnd() {
        try {
            callerProxy.onCallEndedAsync(sessionId, caller, receiver);
        } catch (Exception e) {
            try { callerProxy.onCallEnded(sessionId, caller, receiver); } catch (Exception ex) {}
        }
        try {
            receiverProxy.onCallEndedAsync(sessionId, caller, receiver);
        } catch (Exception e) {
            try { receiverProxy.onCallEnded(sessionId, caller, receiver); } catch (Exception ex) {}
        }
    }

}

