package client;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.TargetDataLine;

public class CallClient extends Thread {

    private SubjectImpl subjectImpl;
    private TargetDataLine mic;

    public CallClient(SubjectImpl s) {
        subjectImpl = s;
    }

    public void init() throws Exception {
        AudioFormat format = new AudioFormat(44100, 16, 1, true, true);


        DataLine.Info infoMic = new DataLine.Info(TargetDataLine.class, format);
        mic = (TargetDataLine) AudioSystem.getLine(infoMic);

        mic.open();

        mic.start();

    }

    @Override
    public void run() {
        while (true) {
            byte[] buffer = new byte[10240];

            int resp = mic.read(buffer, 0, buffer.length);
            if (resp > 0) {
                subjectImpl.notifyObs(buffer);
            }
        }
    }
}
