package client;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.HashMap;

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
        CallSession session = callManager.createCall(caller, receiver);

        for (ObserverPrx ob : session.getParticipants()) {
            ob.onCallStartedAsync(session.getSessionId());
        }

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
        CallSession session = callManager.getSession(sessionId);
        if (session == null) return;

        for (ObserverPrx ob : session.getParticipants()) {
            ob.onCallEndedAsync(sessionId);
        }

        callManager.endCall(sessionId);
    }

    public void notifyObs(byte[] data) {
        for (ObserverPrx ob : globalObservers) {
            ob.notifyMessageAsync(data);
        }
    }

    private ObserverPrx lookup(String username) {
    return observerRegistry.get(username);
}
}
