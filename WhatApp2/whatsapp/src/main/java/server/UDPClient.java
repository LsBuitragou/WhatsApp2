
package server;

import java.net.*;
import javax.sound.sampled.*;

public class UDPClient {

    private static final int BUFFER_SIZE = 1024;
    private static volatile boolean inCall = false;

    // Recursos compartidos (estáticos para que stopCall pueda cerrarlos)
    private static DatagramSocket socket;
    private static TargetDataLine mic;
    private static SourceDataLine speakers;
    private static Thread sendThread;
    private static Thread receiveThread;

    public static void startCall(String remoteIP, int remotePort, int localPort) {
        if (inCall) {
            System.out.println("Ya hay una llamada en curso.");
            return;
        }

        try {
            InetAddress remoteAddress = InetAddress.getByName(remoteIP);
            socket = new DatagramSocket(localPort);
            inCall = true;

            // ---- Envío ----
            sendThread = new Thread(() -> {
                try {
                    AudioFormat format = getAudioFormat();
                    mic = (TargetDataLine) AudioSystem.getTargetDataLine(format);
                    mic.open(format);
                    mic.start();

                    byte[] buffer = new byte[BUFFER_SIZE];
                    while (inCall && !Thread.currentThread().isInterrupted()) {
                        int bytesRead = mic.read(buffer, 0, buffer.length);
                        if (bytesRead > 0) {
                            DatagramPacket packet = new DatagramPacket(buffer, bytesRead, remoteAddress, remotePort);
                            socket.send(packet);
                        }
                    }
                } catch (Exception e) {
                    if (inCall) e.printStackTrace();
                } finally {
                    if (mic != null) {
                        mic.stop();
                        mic.close();
                        mic = null;
                    }
                }
            });

            // ---- Recepción ----
            receiveThread = new Thread(() -> {
                try {
                    AudioFormat format = getAudioFormat();
                    speakers = (SourceDataLine) AudioSystem.getSourceDataLine(format);
                    speakers.open(format);
                    speakers.start();

                    byte[] buffer = new byte[BUFFER_SIZE];
                    while (inCall && !Thread.currentThread().isInterrupted()) {
                        DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                        socket.receive(packet);
                        speakers.write(packet.getData(), 0, packet.getLength());
                    }
                } catch (Exception e) {
                    if (inCall) e.printStackTrace();
                } finally {
                    if (speakers != null) {
                        speakers.drain();
                        speakers.stop();
                        speakers.close();
                        speakers = null;
                    }
                }
            });

            sendThread.start();
            receiveThread.start();

            System.out.println("Llamada iniciada: " + localPort + " ⇄ " + remoteIP + ":" + remotePort);

        } catch (Exception e) {
            e.printStackTrace();
            stopCall();
        }
    }

    private static AudioFormat getAudioFormat() {
        return new AudioFormat(16000.0f, 16, 1, true, true);
    }

    public static void stopCall() {
        inCall = false;

        // cerrar socket (despierta el receive)
        if (socket != null && !socket.isClosed()) {
            socket.close();
            socket = null;
        }

        // interrumpir hilos
        if (sendThread != null) {
            sendThread.interrupt();
            sendThread = null;
        }
        if (receiveThread != null) {
            receiveThread.interrupt();
            receiveThread = null;
        }

        // las líneas se cierran en los finally de cada hilo, pero asegurar cierre por si acaso
        try {
            if (mic != null) {
                mic.stop();
                mic.close();
                mic = null;
            }
        } catch (Exception ignored) {}

        try {
            if (speakers != null) {
                speakers.drain();
                speakers.stop();
                speakers.close();
                speakers = null;
            }
        } catch (Exception ignored) {}

        System.out.println("Llamada finalizada.");
    }
}
