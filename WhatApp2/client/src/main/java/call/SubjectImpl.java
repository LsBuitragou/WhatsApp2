package call;

import java.util.HashMap;
import java.util.Map;

import com.zeroc.Ice.Current;

import Demo.ObserverPrx;
import Demo.Subject;

public class SubjectImpl implements Subject {

    private final Map<String, ObserverPrx> observers = new HashMap<>();
    private final Map<String, String> activeCalls = new HashMap<>();

    private static final int MAX_VOICE_NOTE_BYTES = 6 * 1024 * 1024;

    @Override
    public synchronized void attachObserver(ObserverPrx obs, String userId, Current c) {
        ObserverPrx proxy = obs.ice_fixed(c.con);
        observers.put(userId, proxy);

        System.out.println("[SERVER] Usuario conectado: " + userId);
        System.out.println("[SERVER] Conectados ahora: " + observers.keySet());

        if (c.con != null) {
            c.con.setCloseCallback(con -> {
                synchronized (SubjectImpl.this) {
                    System.out.println("[SERVER] Usuario desconectado: " + userId);
                    observers.remove(userId);

                    // limpieza defensiva si estaba en llamada
                    String other = activeCalls.remove(userId);
                    if (other != null) activeCalls.remove(other);

                    System.out.println("[SERVER] Conectados ahora: " + observers.keySet());
                }
            });
        }
    }

    // === Audio llamada en vivo ===
    @Override
    public synchronized void sendAudio(String fromUser, byte[] data, Current c) {
        String target = activeCalls.get(fromUser);
        int size = (data != null ? data.length : 0);

        if (target == null || data == null || data.length == 0) return;

        ObserverPrx prx = observers.get(target);
        if (prx == null) {
            System.out.println("[SERVER] CALL target no conectado: " + target);
            return;
        }

        prx.notifyAudioAsync(data).whenComplete((ok, ex) -> {
            if (ex != null) {
                System.err.println("[SERVER] ERROR notifyAudioAsync(CALL) from=" + fromUser + " to=" + target + " ex=" + ex);
            }
        });
    }

    // === Nota de voz 1-a-1 ===
    @Override
    public synchronized void sendAudioMessage(String fromUser, String toUser, byte[] data, Current c) {
        int size = (data != null ? data.length : 0);
        System.out.println("[SERVER] sendAudioMessage(VOICE) from=" + fromUser + " to=" + toUser + " bytes=" + size);
        System.out.println("[SERVER] Conectados: " + observers.keySet());

        if (toUser == null || toUser.isEmpty()) return;
        if (data == null || data.length == 0) return;

        if (data.length > MAX_VOICE_NOTE_BYTES) {
            System.out.println("[SERVER] VOICE rechazada por tamaño (> " + MAX_VOICE_NOTE_BYTES + " bytes)");
            return;
        }

        ObserverPrx dest = observers.get(toUser);
        if (dest == null) {
            System.out.println("[SERVER] VOICE destino NO conectado: " + toUser);
            return;
        }

        dest.notifyAudioMessageAsync(data).whenComplete((ok, ex) -> {
            if (ex != null) {
                System.err.println("[SERVER] ERROR notifyAudioMessageAsync(VOICE) to=" + toUser + " ex=" + ex);
            } else {
                System.out.println("[SERVER] VOICE enviada a " + toUser);
            }
        });
    }

    @Override
    public synchronized String startCall(String fromUser, String toUser, Current c) {
        System.out.println("[SERVER] startCall: " + fromUser + " -> " + toUser);
        System.out.println("[SERVER] Conectados: " + observers.keySet());

        ObserverPrx dest = observers.get(toUser);
        if (dest == null) {
            System.out.println("[SERVER] startCall: destino NO conectado -> " + toUser);
            return "Usuario no conectado";
        }

        dest.incomingCallAsync(fromUser).whenComplete((ok, ex) -> {
            if (ex != null) System.err.println("[SERVER] ERROR incomingCallAsync to=" + toUser + " ex=" + ex);
        });

        return "OK";
    }

    @Override
    public synchronized void acceptCall(String fromUser, String toUser, Current c) {
        // En tu flujo: acceptCall(caller, acceptor)
        System.out.println("[SERVER] acceptCall: caller=" + fromUser + " acceptor=" + toUser);

        ObserverPrx caller = observers.get(fromUser);
        if (caller == null) {
            System.out.println("[SERVER] acceptCall: caller NO conectado -> " + fromUser);
            return;
        }

        caller.callAcceptedAsync(toUser).whenComplete((ok, ex) -> {
            if (ex != null) System.err.println("[SERVER] ERROR callAcceptedAsync to=" + fromUser + " ex=" + ex);
        });

        activeCalls.put(fromUser, toUser);
        activeCalls.put(toUser, fromUser);
    }

    @Override
    public synchronized void rejectCall(String fromUser, String toUser, Current c) {
        // En tu flujo: rejectCall(caller, rejecter)
        System.out.println("[SERVER] rejectCall: caller=" + fromUser + " rejecter=" + toUser);

        // ✅ FIX (bug de tu compañera): notificar al CALLER (fromUser), no al rejecter
        ObserverPrx caller = observers.get(fromUser);
        if (caller != null) {
            caller.callRejectedAsync(toUser).whenComplete((ok, ex) -> {
                if (ex != null) System.err.println("[SERVER] ERROR callRejectedAsync to=" + fromUser + " ex=" + ex);
            });
        } else {
            System.out.println("[SERVER] rejectCall: caller NO conectado -> " + fromUser);
        }
    }

    @Override
    public synchronized void endCall(String fromUser, String toUser, Current c) {
        System.out.println("[SERVER] endCall: " + fromUser + " -> " + toUser);

        String activeWith = activeCalls.get(fromUser);
        if (activeWith == null || !activeWith.equals(toUser)) {
            System.out.println("[SERVER] No existe llamada activa entre " + fromUser + " y " + toUser);
            return;
        }

        ObserverPrx a = observers.get(fromUser);
        if (a != null) {
            a.CallEndedAsync(fromUser).whenComplete((ok, ex) -> {
                if (ex != null) System.err.println("[SERVER] ERROR CallEndedAsync to=" + fromUser + " ex=" + ex);
            });
        }

        ObserverPrx b = observers.get(toUser);
        if (b != null) {
            b.CallEndedAsync(fromUser).whenComplete((ok, ex) -> {
                if (ex != null) System.err.println("[SERVER] ERROR CallEndedAsync to=" + toUser + " ex=" + ex);
            });
        }

        activeCalls.remove(fromUser);
        activeCalls.remove(toUser);
    }

    @Override
    public synchronized String[] getConnectedUsers(Current current) {
        return observers.keySet().toArray(new String[0]);
    }
}
