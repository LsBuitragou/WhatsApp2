module Demo {
    sequence<byte> Bytes;

    interface Observer {
        void notifyMessage(Bytes data);
        void onCallStarted(string sessionId);
        void onCallEnded(string sessionId);
    };

    interface Subject {
        void attachObserver(Observer* objs, string username);
        string startCall(string caller, string receiver);
        void sendAudio(string sessionId, Bytes audio);
        void endCall(string sessionId);
    };
}