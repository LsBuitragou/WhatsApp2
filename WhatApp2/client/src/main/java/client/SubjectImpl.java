package client;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import com.zeroc.Ice.Current;
import Demo.ObserverPrx;
import Demo.Subject;
import call.CallManager;
import call.CallSession;

public class SubjectImpl implements Subject {

    // Observers registrados por usuario
    private final List<ObserverPrx> globalObservers = new ArrayList<>();
    private final CallManager callManager = new CallManager();
    private final Map<String, ObserverPrx> observerRegistry = new HashMap<>();

    @Override
    public void attachObserver(ObserverPrx obs, String username, Current current) {

        ObserverPrx proxy = obs.ice_fixed(current.con);

        observerRegistry.put(username, proxy);

        System.out.println("Registrado observer para usuario: " + username);

        if (current.con != null) {
            current.con.setCloseCallback(c -> {
                observerRegistry.remove(username);
                System.out.println("Usuario desconectado: " + username);
            });
        }
    }

    @Override
    public String startCall(String callerUsername, String receiverUsername, Current current) {

        ObserverPrx caller = lookup(callerUsername);
        ObserverPrx receiver = lookup(receiverUsername);

        if (caller == null) {
            System.out.println("startCall failed: caller observer not found: " + callerUsername);
            throw new IllegalArgumentException("Caller observer not found: " + callerUsername);
        }

        if (receiver == null) {
            System.out.println("startCall failed: receiver observer not found: " + receiverUsername);
            throw new IllegalArgumentException("Receiver observer not found: " + receiverUsername);
        }

        CallSession session = callManager.createCall(caller, receiver);
        return session.getSessionId();
    }

    @Override
    public void sendAudio(String sessionId, byte[] audio, Current current) {
        CallSession session = callManager.getSession(sessionId);
        if (session == null) return;

        for (ObserverPrx ob : session.getParticipants()) {
            ob.notifyMessageAsync(audio);  // ← Usa tu playback existente
        }
    }

    @Override
    public void endCall(String sessionId, Current current) {
    System.out.println("[Subject] Finalizando llamada con sessionId = " + sessionId);

    // 1. Quitar la sesión del mapa de llamadas
    CallSession session=callManager.getSession(sessionId);
    callManager.endCall(sessionId);

    // 2. Notificar a ambos usuarios
    if (session.getFirstParticipant() != null)
        session.getFirstParticipant().onCallEnded(sessionId);

    if (session.getSecondParticipant() != null)
        session.getSecondParticipant().onCallEnded(sessionId);

    System.out.println("Llamada finalizada exitosamente.");
}

    public void notifyObs(byte[] data) {
        for (ObserverPrx ob : globalObservers) {
            ob.notifyMessageAsync(data);
        }
    }

    private ObserverPrx lookup(String username) {
    return observerRegistry.get(username);
    }

    public void sendAudio(String sessionId, byte[] audio) {
    Set<ObserverPrx> mySet = callManager.getSession(sessionId).getParticipants();
    Iterator<ObserverPrx> iterator = mySet.iterator();

    iterator.next();
    ObserverPrx other = iterator.next();
    other.notifyMessage(audio);
    }
}
