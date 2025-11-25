package client;

import Demo.Observer;
import Demo.SubjectPrx;
import com.zeroc.Ice.Current;

/**
 * ObserverI: Implementación del Observer para clientes Java.
 * Recibe notificaciones de llamadas y maneja audio.
 */
public class ObserverI implements Observer {

    private final String username;
    private SubjectPrx subject;
    private String currentSessionId;
    private Sender sender;

    public ObserverI(String username) {
        this.username = username;
        this.currentSessionId = null;
        this.sender = null;
    }

    public void setSubject(SubjectPrx subject) {
        this.subject = subject;
    }

    @Override
    public void notifyMessage(byte[] data, Current current) {
        System.out.println("[ObserverI " + username + "] notifyMessage recibido: " + data.length + " bytes");
        // Aquí iría la reproducción de audio (PlayertThread)
        try {
            if (sender != null && sender.isStreaming()) {
                System.out.println("[ObserverI " + username + "] Reproduciendo audio recibido");
                // PlayerThread.play(data);
            }
        } catch (Exception e) {
            System.out.println("[ObserverI " + username + "] Error reproduciendo audio: " + e.getMessage());
        }
    }

    @Override
    public void onCallStarted(String sessionId, String caller, String receiver, Current current) {
        System.out.println("[ObserverI " + username + "] onCallStarted: session=" + sessionId + " caller=" + caller + " receiver=" + receiver);
        
        this.currentSessionId = sessionId;
        
        // Iniciar envío de audio
        try {
            if (sender == null && subject != null) {
                System.out.println("[ObserverI " + username + "] Iniciando Sender para sessionId=" + sessionId);
                sender = new Sender(username, sessionId, subject);
                sender.setStreaming(true);
                sender.start();
                System.out.println("[ObserverI " + username + "] Sender iniciado");
            }
        } catch (Exception e) {
            System.out.println("[ObserverI " + username + "] Error iniciando Sender: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void onCallEnded(String sessionId, String caller, String receiver, Current current) {
        System.out.println("[ObserverI " + username + "] onCallEnded: session=" + sessionId + " caller=" + caller + " receiver=" + receiver);
        
        // Detener envío de audio
        if (sender != null) {
            sender.setStreaming(false);
            System.out.println("[ObserverI " + username + "] Sender detenido");
        }
        
        this.currentSessionId = null;
    }
}

