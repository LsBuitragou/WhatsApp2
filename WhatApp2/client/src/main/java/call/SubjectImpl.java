package call;

import java.util.HashMap;
import java.util.Map;

import Demo.*;
import com.zeroc.Ice.Current;

public class SubjectImpl implements Subject {

    private Map<String, ObserverPrx> observers = new HashMap<>();
    private Map<String, String> activeCalls = new HashMap<>();


    @Override
    public synchronized void attachObserver(ObserverPrx obs,String userId, Current c) {

        ObserverPrx proxy = obs.ice_fixed(c.con);
        observers.put(userId, proxy);

        System.out.println("[SERVER] Usuario conectado: " + userId);

        if (c.con != null) {
            c.con.setCloseCallback(con -> {
                System.out.println("[SERVER] Usuario desconectado: " + userId);
                observers.remove(userId);
            });
        }
    }
    
    @Override
    public synchronized void sendAudio(String fromUser, byte[] data, Current c) {
        String target = activeCalls.get(fromUser);
        System.out.println("[SERVER] sendAudio de " + fromUser + " a " + target 
                        + " | Tamaño del buffer: " + (data != null ? data.length : 0));
        if (target == null) return;

        ObserverPrx prx = observers.get(target);
        if (prx != null) {
            try {
                prx.notifyAudioAsync(data);
                System.out.println("[SERVER] Audio enviado correctamente a " + target);
            } catch (Exception e) {
                System.err.println("[SERVER] Error enviando audio a " + target + ": " + e);
            }
        } else {
            System.out.println("[SERVER] No se encontró proxy para " + target);
        }
    }



    @Override
    public synchronized void sendAudioMessage(String fromUser, String toUser, byte[] data, Current c) {
        ObserverPrx dest = observers.get(toUser);
        if (dest != null) {
            dest.notifyAudioMessageAsync(data);
        }
    }
        @Override
        public synchronized String startCall(String fromUser, String toUser, Current c) {
            System.out.println("[SERVER] startCall: " + fromUser + " llamando a " + toUser);
            System.out.println("AAAAAAAAAAAAAAAA");
            ObserverPrx dest = observers.get(toUser);
            if(dest==null){
                 System.out.println("EEEEEEEEEEEEEEEEEEE");
            }
            if (dest != null) {
                dest.incomingCallAsync(fromUser);
                System.out.println("IIIIIIIIIIIIIIIIIIIIIIIIIIII");
                System.out.println("[SERVER] Notificación de llamada enviada a " + toUser);
                return "";
            }
            return ""; // PlaceholderQ
        }


    @Override
    public synchronized void acceptCall(String fromUser, String toUser, Current c) {
        System.out.println("[SERVER] acceptCall: " + fromUser + " -> " + toUser);
        ObserverPrx caller = observers.get(fromUser);
        if (caller != null) {
            caller.callAcceptedAsync(toUser);
            System.out.println("[SERVER] Llamada aceptada enviada a " + fromUser);
            // Marcar la llamada activa
            activeCalls.put(fromUser, toUser);
            activeCalls.put(toUser, fromUser);
        }
    }

    @Override
    public synchronized void rejectCall(String fromUser, String toUser, Current c) {
        System.out.println("[SERVER] rejectCall: " + fromUser + " -> " + toUser);
        ObserverPrx caller = observers.get(toUser);
        if (caller != null) {
        caller.callRejectedAsync(fromUser);
        System.out.println("[SERVER] Notificado: " + toUser + " fue informado del rechazo por " + fromUser);
    }
    }

    @Override
    public synchronized void endCall(String fromUser, String toUser, Current c) {
         System.out.println("[SERVER] colgó : " + fromUser + " -> " + toUser);

    // 0. Validar si existe la llamada activa
    String activeWith = activeCalls.get(fromUser);
    if (activeWith == null || !activeWith.equals(toUser)) {
        System.out.println("[SERVER] No existe una llamada activa entre "
            + fromUser + " y " + toUser);
        return;
    }

    // 1. Notificar al que colgó (opcional)
    ObserverPrx caller = observers.get(fromUser);
    if (caller != null) {
        try {
            caller.CallEndedAsync(fromUser);
        } catch (Exception e) {
            System.out.println("[SERVER] No se pudo notificar al caller: " + e);
        }
    }

    // 2. Notificar al receptor
    ObserverPrx receiver = observers.get(toUser);
    if (receiver != null) {
        try {
            receiver.CallEndedAsync(fromUser);  // avisamos quién colgó
        } catch (Exception e) {
            System.out.println("[SERVER] No se pudo notificar al receptor: " + e);
        }
    }

    // 3. Limpiar relación en activeCalls
    activeCalls.remove(fromUser);
    activeCalls.remove(toUser);

    System.out.println("[SERVER] Notificación de colgado enviada y llamada limpiada.");
    }

    @Override
    public String[] getConnectedUsers(Current current) {
          System.out.println("[SERVER] Enviando lista de usuarios conectados...");
    return observers.keySet().toArray(new String[0]);
}
}
