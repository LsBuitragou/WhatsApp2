package client;

import java.util.Map;
import java.util.UUID;
import java.util.HashMap;

import com.zeroc.Ice.Current;

import Demo.ObserverPrx;
import Demo.Subject;
import call.CallSession;
/**
 * SubjectImpl maneja llamadas 1-a-1 sin CallManager.
 * Mantiene un registro de observers por usuario y un mapa simple de sesiones activas.
 */
public class SubjectImpl implements Subject {

    // Observers registrados por usuario
    private final Map<String, ObserverPrx> observerRegistry = new HashMap<>();
    
    // Sesiones activas: sessionId -> {caller, receiver}
    private final Map<String, CallSession> activeSessions = new HashMap<>();

    @Override
    public void attachObserver(ObserverPrx obs, String username, Current current) {
        if (username == null || username.trim().isEmpty()) {
            System.out.println("[Subject] ERROR: username es null o vacío en attachObserver");
            throw new IllegalArgumentException("Username cannot be null or empty");
        }

        ObserverPrx proxy = obs.ice_fixed(current.con);
        observerRegistry.put(username, proxy);
        System.out.println("[Subject] Registrado observer para usuario: '" + username + "'");

        if (current.con != null) {
            current.con.setCloseCallback(c -> {
                observerRegistry.remove(username);
                System.out.println("[Subject] Usuario desconectado: " + username);
            });
        }
    }

    @Override
    public String startCall(String callerUsername, String receiverUsername, Current current) {
        System.out.println("[Subject] startCall: " + callerUsername + " -> " + receiverUsername);

        ObserverPrx caller = lookup(callerUsername);
        ObserverPrx receiver = lookup(receiverUsername);

        if (caller == null) {
            System.out.println("[Subject] ERROR: caller observer not found: " + callerUsername);
            throw new IllegalArgumentException("Caller observer not found: " + callerUsername);
        }

        if (receiver == null) {
            System.out.println("[Subject] ERROR: receiver observer not found: " + receiverUsername);
            throw new IllegalArgumentException("Receiver observer not found: " + receiverUsername);
        }

        // Crear sesión 1-a-1 con información de caller/receiver
        CallSession session = new CallSession(callerUsername, caller, receiverUsername, receiver);
        activeSessions.put(session.getSessionId(), session);

        System.out.println("[Subject] Sesión creada: " + session.getSessionId() + " (" + callerUsername + " -> " + receiverUsername + ")");

        return session.getSessionId();
    }

    @Override
    public void sendAudio(String sessionId, String senderUsername, byte[] audio, Current current) {
        CallSession session = activeSessions.get(sessionId);
        if (session == null) {
            System.out.println("[Subject] Sesión no encontrada: " + sessionId);
            return;
        }

        // Enviar audio al otro participante usando el senderUsername para enrutar
        try {
            if (senderUsername != null && senderUsername.equals(session.getCaller())) {
                session.getReceiverProxy().notifyMessage(audio);
            } else {
                session.getCallerProxy().notifyMessage(audio);
            }
        } catch (Exception e) {
            System.out.println("[Subject] Error enviando audio a receiver: " + e.getMessage());
        }
    }

    @Override
    public void endCall(String sessionId, Current current) {
        System.out.println("[Subject] endCall: " + sessionId);

        CallSession session = activeSessions.remove(sessionId);
        if (session == null) {
            System.out.println("[Subject] Sesión no encontrada: " + sessionId);
            return;
        }
        // Notificar a ambos observadores con la información de caller/receiver
        try {
            session.notifyEnd();
            System.out.println("[Subject] Notificado END a participantes: " + session.getCaller() + ", " + session.getReceiver());
        } catch (Exception e) {
            System.out.println("[Subject] Error notificando END a participantes: " + e.getMessage());
        }
    }

    private ObserverPrx lookup(String username) {
        return observerRegistry.get(username);
    }
}
