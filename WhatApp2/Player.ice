module Demo {
    sequence<byte> Bytes;
    sequence<string> stringSeq;

    interface Observer {
        void notifyAudio(Bytes data);
        void notifyAudioMessage(Bytes data);

        void incomingCall(string sender);
        void callAccepted(string sender);
        void callRejected(string sender);
        void CallEnded(string sender);
    };

    interface Subject {
        void attachObserver(Observer* objs, string username);

        void sendAudio(string sender, Bytes data);
        void sendAudioMessage(string sender, string receiver, Bytes data);
        stringSeq getConnectedUsers();
        string startCall(string sender, string receiver);
        void acceptCall(string sender, string receiver);
        void rejectCall(string sender, string receiver);
        void endCall(string sender, string receiver);
    };
}