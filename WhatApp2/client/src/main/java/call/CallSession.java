
package call;

import Demo.ObserverPrx;
import java.util.HashSet;
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
        participants.add(observer);
        observer.onCallStarted(sessionId);
    }

    public void removeParticipant(ObserverPrx observer) {
        participants.remove(observer);
    }

    public Set<ObserverPrx> getParticipants() {
        return participants;
    }
}

