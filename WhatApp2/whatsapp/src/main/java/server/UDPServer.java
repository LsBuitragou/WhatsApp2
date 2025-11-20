package server;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.*;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class UDPServer {

private static final int PORT = 9876; // Puerto fijo para llamadas UDP
private static final int BUFFER_SIZE = 1024;

private final GroupManager groupManager;

public UDPServer(GroupManager groupManager) {
    this.groupManager = groupManager;
}

public void start() {
    try (DatagramSocket socket = new DatagramSocket(PORT)) {
        System.out.println("Servidor UDP corriendo en el puerto " + PORT);

        ExecutorService pool = Executors.newFixedThreadPool(10);

        // Hilo para recibir y reenviar paquetes de audio
        Thread receiveThread = new Thread(() -> {
            byte[] buffer = new byte[BUFFER_SIZE];

            while (!socket.isClosed()) {
                try {
                    DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                    socket.receive(packet);

                    SocketAddress senderAddress = packet.getSocketAddress();
                    UserSession sender = groupManager.findUserByUdpAddress(senderAddress);
                    if (sender == null) continue;

                    // 1️ Caso: llamada privada
                    UserSession target = groupManager.getActiveCallPartner(sender);
                    if (target != null && target.getUdpAddress() != null) {
                        forwardPacket(socket, pool, packet, target);
                        continue;
                    }

                    String activeGroup = groupManager.getActiveGroupCallName(sender);
                    if (activeGroup != null) {
                        Set<String> activeMembers = groupManager.getActiveCallMembers(activeGroup);
                        for (String member : activeMembers) {
                            if (member.equals(sender.getUsername())) continue; // No reenvía al emisor

                            UserSession memberSession = groupManager.getUserSession(member);
                            if (memberSession != null && memberSession.getUdpAddress() != null) {
                                forwardPacket(socket, pool, packet, memberSession);
                            }
                        }
                    }

                } catch (Exception e) {
                    if (!socket.isClosed()) e.printStackTrace();
                }
            }
        });

        receiveThread.start();

        // Comando de cierre manual desde consola
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        while (true) {
            String command = reader.readLine();
            if (command != null && command.equalsIgnoreCase("exit")) {
                socket.close();
                pool.shutdownNow();
                break;
            }
        }

    } catch (Exception e) {
        e.printStackTrace();
    }
}

/**
 * Reenvía un paquete UDP a un usuario destino.
 */
private void forwardPacket(DatagramSocket socket, ExecutorService pool, DatagramPacket original, UserSession target) {
    pool.execute(() -> {
        try {
            DatagramPacket forwardPacket = new DatagramPacket(
                original.getData(),
                original.getLength(),
                ((InetSocketAddress) target.getUdpAddress()).getAddress(),
                ((InetSocketAddress) target.getUdpAddress()).getPort()
            );
            socket.send(forwardPacket);
        } catch (Exception e) {
            e.printStackTrace();
        }
    });
}


}
