package call;

import java.util.HashMap;
import java.util.Map;
import Demo.ObserverPrx;

/**
 * Administra todas las llamadas activas en el servidor.
 */
public class CallManager {

    private final Map<String, CallSession> activeCalls;

    public CallManager() {
        this.activeCalls = new HashMap<>();
    }

    // Crear una nueva llamada entre dos usuarios
    public CallSession createCall(ObserverPrx initiator, ObserverPrx receiver) {
        if (initiator == null) {
            throw new IllegalArgumentException("Initiator observer is null");
        }

        if (receiver == null) {
            throw new IllegalArgumentException("Receiver observer is null");
        }

        if (findCallByParticipant(initiator) != null){
            throw new IllegalStateException("Initiator already in call");
        }
    
        if (findCallByParticipant(receiver) != null){
            throw new IllegalStateException("Receiver already in call");
        }
    
        // We don't have usernames here; create CallSession with placeholders for caller/receiver
        CallSession session = new CallSession("unknownCaller", initiator, "unknownReceiver", receiver);
        activeCalls.put(session.getSessionId(), session);
        return session;
    }

    // Terminar una llamada
    public void endCall(String sessionId) {
        CallSession session = activeCalls.get(sessionId);
        if (session != null) {
            session.endSession();
            activeCalls.remove(sessionId);
        }
    }

    // Buscar llamada en la que participa un usuario
    public CallSession findCallByParticipant(ObserverPrx participant) {
        for (CallSession session : activeCalls.values()) {
            if ((session.getCallerProxy() != null && session.getCallerProxy().equals(participant) ||
                 session.getReceiverProxy() != null && session.getReceiverProxy().equals(participant)) && session.isActive()) {
                return session;
            }
        }
        return null;
    }

    // Obtener todas las llamadas activas
    public Map<String, CallSession> getActiveCalls() {
        return activeCalls;
    }

    public CallSession getSession(String sessionId) {
    return activeCalls.get(sessionId);
}
}

