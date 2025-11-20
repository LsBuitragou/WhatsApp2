package server;

import java.io.PrintWriter;
import java.net.SocketAddress;

/**
 * Representa una sesión de usuario en el servidor.
 * Puede usarse tanto para conexiones TCP (mensajes, audios)
 * como para llamadas vía UDP (dirección de red).
 */
public class UserSession {
    private final String username;
    private final PrintWriter writer;  // para TCP
    private SocketAddress udpAddress;  // para UDP (llamadas)
    private String inCallWith;
    
    public UserSession(String username, PrintWriter writer) {
        this.username = username;
        this.writer = writer;
    }

    public String getUsername() {
        return username;
    }

    public PrintWriter getWriter() {
        return writer;
    }

    public SocketAddress getUdpAddress() {
        return udpAddress;
    }

    public void setUdpAddress(SocketAddress udpAddress) {
        this.udpAddress = udpAddress;
    }

    /** Enviar un mensaje al cliente vía TCP */
    public void sendMessage(String message) {
        if (writer != null) {
            writer.println(message);
            writer.flush();
        }
    }

    public String getInCallWith() {
        return inCallWith;
    }

    public void setInCallWith(String inCallWith) {
        this.inCallWith = inCallWith;
    }
}