package client;

import Demo.SubjectPrx;
import javax.sound.sampled.*;

public class Sender extends Thread {

    private final String userId;
    private final String sessionId;
    private final SubjectPrx subject;
    private final TargetDataLine mic;
    private boolean streaming = false;

    public Sender(String userId, String sessionId, SubjectPrx subject) throws Exception {
        this.userId = userId;
        this.sessionId = sessionId;
        this.subject = subject;

        AudioFormat format = new AudioFormat(44100, 16, 1, true, true);
        DataLine.Info infoMic = new DataLine.Info(TargetDataLine.class, format);
        mic = (TargetDataLine) AudioSystem.getLine(infoMic);
        mic.open(format);
        mic.start();
    }

    @Override
    public void run() {
        byte[] buffer = new byte[10240];
        while (true) {
            if (streaming) {
                int n = mic.read(buffer, 0, buffer.length);
                if (n > 0) {
                    byte[] copy = new byte[n];
                    System.arraycopy(buffer, 0, copy, 0, n);
                    // Send audio with sessionId, sender (userId), and audio data
                    subject.sendAudioAsync(sessionId, userId, copy);
                }
            } else {
                try { Thread.sleep(50); } catch (InterruptedException e) {
                    break;
                }
            }
        }
        mic.stop();
        mic.close();
    }

    public void setStreaming(boolean streaming) {
        this.streaming = streaming;
    }

    public boolean isStreaming() {
        return streaming;
    }
}
