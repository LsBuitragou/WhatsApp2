
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
    private final Set<ObserverPrx> participants;
    private boolean active;

    public CallSession() {
        this.sessionId = UUID.randomUUID().toString();
        this.participants = new HashSet<>();
        this.active = true;
    }

    public String getSessionId() {
        return sessionId;
    }

    public boolean isActive() {
        return active;
    }

    public void endSession() {
        this.active = false;
    }

    public void addParticipant(ObserverPrx observer) {
        if (observer == null) {
            throw new IllegalArgumentException("Cannot add null participant to CallSession");
        }
        participants.add(observer);
        try {
            // Notificar de forma asíncrona para evitar bloquear el hilo del servidor
            observer.onCallStartedAsync(sessionId);
        } catch (Exception e) {
            // Fallback: intentar notificación síncrona si la asíncrona falla
            try { observer.onCallStarted(sessionId); } catch (Exception ex) {}
        }
    }

    public void removeParticipant(ObserverPrx observer) {
        participants.remove(observer);
    }

    public Set<ObserverPrx> getParticipants() {
        return participants;
    }

    public ObserverPrx getFirstParticipant() {
        Set<ObserverPrx> mySet = participants;
        Iterator<ObserverPrx> iterator = mySet.iterator();

        return iterator.next();
    }

    public ObserverPrx getSecondParticipant() {
        Set<ObserverPrx> mySet = participants;
        Iterator<ObserverPrx> iterator = mySet.iterator();
        iterator.next();
        return iterator.next();
    }
}

