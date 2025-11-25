module Demo {
    sequence<byte> Bytes;

    interface Observer {
        void notifyMessage(Bytes data);
        // now include caller and receiver so observers know the two participants
        void onCallStarted(string sessionId, string caller, string receiver);
        void onCallEnded(string sessionId, string caller, string receiver);
    };

    interface Subject {
        void attachObserver(Observer* objs, string username);
        // include sender so server knows who is sending audio for routing
        void sendAudio(string sessionId, string sender, Bytes data);
        string startCall(string caller, string receiver);
        void endCall(string sessionId);
    };
}