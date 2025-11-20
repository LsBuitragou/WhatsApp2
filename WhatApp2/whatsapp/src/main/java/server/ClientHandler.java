package server;

import java.io.*;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketAddress;

public class ClientHandler implements Runnable {

    private final Socket socket;
    private final GroupManager manager;
    private String username;

    public ClientHandler(Socket socket, GroupManager manager) {
        this.socket = socket;
        this.manager = manager;
    }

    @Override
    public void run() {
        try (
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true)
        ) {
            // pedir username
            username = in.readLine();

            // registrar usuario con UserSession
            UserSession session = new UserSession(username, out);
            manager.registerUser(username, session);

            // ✅ ENVIAR CONFIRMACIÓN AL PROXY
            out.println("OK: User " + username + " registered");
            out.flush();

            String line;
            while ((line = in.readLine()) != null) {

                // ---------- TEXTO ----------
                if (line.startsWith("/msg ")) {
                    String[] parts = line.split(" ", 3);
                    if (parts.length >= 3) {
                        manager.sendPrivateMessage(username, parts[1], parts[2]);
                        out.println("OK: message sent to " + parts[1]);
                    } else {
                        out.println("ERR: usage /msg <user> <message>");
                    }
                } else if (line.startsWith("/create ")) {
                    manager.createGroup(line.split(" ", 2)[1]);
                } else if (line.startsWith("/join ")) {
                    manager.addUserToGroup(line.split(" ", 2)[1], username);
                } else if (line.startsWith("/group ")) {
                    String[] parts = line.split(" ", 3);
                    if (parts.length >= 3) {
                        manager.sendGroupMessage(username, parts[1], parts[2]);
                    }

                // ---------- NOTAS DE VOZ (Base64 en línea) ----------
                } else if (line.startsWith("/voice ")) {
                    // /voice <user> <base64>
                    String[] parts = line.split(" ", 3);
                    if (parts.length == 3) {
                        String toUser = parts[1];
                        String b64 = parts[2];
                        manager.sendPrivateMessage(username, toUser, "[VoiceMsg] " + b64);
                    } else {
                        out.println("Usage: /voice <user> <base64>");
                    }
                } else if (line.startsWith("/voicegroup ")) {
                    // /voicegroup <group> <base64>
                    String[] parts = line.split(" ", 3);
                    if (parts.length == 3) {
                        String group = parts[1];
                        String b64 = parts[2];
                        manager.sendGroupMessage(username, group, "[VoiceMsg] " + b64);
                    } else {
                        out.println("Usage: /voicegroup <group> <base64>");
                    }

                } else {
                    out.println("Unknown command.");
                }

                // ---------- LLAMADAS UDP ----------
                if (line.startsWith("/call ")) {
                    try {
                        // Extraer el puerto UDP que envió el cliente
                        int udpPort = Integer.parseInt(line.split(" ", 2)[1]);
                        // Dirección IP del cliente conectado por TCP
                        InetAddress ip = socket.getInetAddress();
                        // Construir la dirección UDP completa (IP + puerto UDP)
                        SocketAddress udpAddr = new InetSocketAddress(ip, udpPort);
                        // Obtener la sesión del usuario
                        UserSession session1 = manager.getUserSession(username);
                        if (session1 != null) {
                            session1.setUdpAddress(udpAddr);
                            out.println("UDP address registered: " + udpAddr);
                        }
                    } catch (Exception ex) {
                        out.println("Usage: /call <udp_port>");
                    }
                }

                else if (line.startsWith("/callto ")) {
                    try {
                        String targetUser = line.split(" ", 2)[1]; // Usuario al que quiero llamar
                        UserSession callerSession = manager.getUserSession(username); // Yo (quien llama)
                        UserSession targetSession = manager.getUserSession(targetUser); // El destinatario
                    
                        if (callerSession == null || callerSession.getUdpAddress() == null) {
                            out.println("You must register your UDP port first with /call <udp_port>");
                            return;
                        }
                    
                        if (targetSession == null || targetSession.getUdpAddress() == null) {
                            out.println("User " + targetUser + " is not available for calls.");
                            return;
                        }
                    
                        // Notificar al que llama
                        out.println("Calling " + targetUser + " at " + targetSession.getUdpAddress());
                    
                        // Notificar al destinatario
                        targetSession.sendMessage("Incoming call from " + username + " at " + callerSession.getUdpAddress());
                    
                        // 🔊 Iniciar el cliente UDP en un hilo separado para manejar el audio
                        new Thread(() -> {
                            try {
                                InetSocketAddress callerAddr = (InetSocketAddress) callerSession.getUdpAddress();
                                UDPClient.startCall("127.0.0.1", 9876, callerAddr.getPort());
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }).start();
                    
                    } catch (Exception ex) {
                        out.println("Usage: /callto <username>");
                    }
                }

                else if (line.startsWith("/callgroup ")) {
                    String groupName = line.split(" ", 2)[1];
                    manager.startGroupCall(username, groupName);
                }
                else if (line.startsWith("/joincall ")) {
                    String groupName = line.split(" ", 2)[1];
                    UserSession userSession = manager.getUserSession(username);
                                
                    if (userSession == null || userSession.getUdpAddress() == null) {
                        out.println("You must register your UDP port first with /call <udp_port>");
                        continue;
                    }
                
                    // Verifica que el grupo exista
                    if (!manager.groupExists(groupName)) {
                        out.println("Group " + groupName + " does not exist.");
                        continue;
                    }
                
                    // Agrega el usuario a la llamada grupal activa
                    manager.addUserToGroupCall(username, groupName);
                
                    // Notifica a todos los demás miembros activos de la llamada
                    manager.broadcastToGroup(groupName, " " + username + " joined the group call.");
                
                    out.println("📞 You joined the group call: " + groupName);
                
                    // 🔊 Inicia automáticamente el cliente UDP para escuchar y enviar audio
                    new Thread(() -> {
                        try {
                            InetSocketAddress udpAddr = (InetSocketAddress) userSession.getUdpAddress();
                            // Se conecta al servidor UDP (el puerto 9876)
                            UDPClient.startCall("127.0.0.1", 9876, udpAddr.getPort());
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }).start();
                }
                else if (line.startsWith("/exit")) {
                    UDPClient.stopCall();
                    System.out.println("📴 Has salido de la llamada.");
                    continue;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (username != null) {
                manager.removeUser(username);
            }
            try { socket.close(); } catch (IOException ignored) {}
        }
    }
}