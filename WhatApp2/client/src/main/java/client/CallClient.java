package client;

import Demo.ObserverPrx;
import Demo.SubjectPrx;
import java.util.Arrays;

import javax.sound.sampled.*;

public class CallClient {

    private static final int BUFFER_SIZE = 1024;
    private volatile boolean inCall = false;

    private TargetDataLine mic;
    private SourceDataLine speakers;
    private Thread sendThread;

    private SubjectPrx subject;
    private ObserverPrx selfObserverPrx;

    private String currentSessionId;
    private String callerUsername;

    public CallClient(ObserverPrx selfObserverPrx, String callerUsername) {
        this.selfObserverPrx = selfObserverPrx;
        this.callerUsername = callerUsername;
    }

    public void startCall(String receiverUsername) {
        if (inCall) {
            System.out.println("Ya hay una llamada activa.");
            return;
        }

        try {
            currentSessionId = subject.startCall(callerUsername, receiverUsername);

            System.out.println("Llamada iniciada con " + receiverUsername +
                               ". Sesión: " + currentSessionId);

            inCall = true;

            startMicCapture();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void startMicCapture() {
        sendThread = new Thread(() -> {
            try {
                AudioFormat format = getAudioFormat();
                mic = (TargetDataLine) AudioSystem.getTargetDataLine(format);
                mic.open(format);
                mic.start();

                byte[] buffer = new byte[BUFFER_SIZE];

                while (inCall && !Thread.currentThread().isInterrupted()) {
                    int bytes = mic.read(buffer, 0, buffer.length);
                    if (bytes > 0) {
                        byte[] chunk = Arrays.copyOf(buffer, bytes);
                        subject.sendAudio(currentSessionId, chunk);
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

        sendThread.start();
    }


    public void playIncomingAudio(byte[] data) {
        try {
            if (speakers == null) {
                AudioFormat format = getAudioFormat();
                speakers = (SourceDataLine) AudioSystem.getSourceDataLine(format);
                speakers.open(format);
                speakers.start();
            }

            speakers.write(data, 0, data.length);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void stopCall() {
        if (!inCall) return;

        inCall = false;

        // Avisar al servidor ICE
        if (currentSessionId != null) {
            try {
                subject.endCall(currentSessionId);
            } catch (Exception ignored) {}
        }

        currentSessionId = null;

        if (sendThread != null) {
            sendThread.interrupt();
            sendThread = null;
        }

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

    private AudioFormat getAudioFormat() {
        return new AudioFormat(16000.0f, 16, 1, true, true);
    }
}
