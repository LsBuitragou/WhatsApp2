import Subscriber from './subscriber.js';
export class IceDelegatge {
  constructor() {
    this.communicator = Ice.initialize();
    this.callbacks = [];
    this.audioCallbacks = [];
    this.callCallbacks = [];
    this.subscriber = new Subscriber(this);
    this.username = null;
    this.subject = null;
  }
  async init(name) {

    if (name) {
      this.username = name;
    } else if (!this.username) {
      this.username = localStorage.getItem('username') || '';
    }

    console.log('[IceDelegate] init() called with username:', this.username);

    if (this.subject) {
      console.log('[IceDelegate] subject ya inicializado, saltando attachObserver');
      return;
    }
    const hostname = 'localhost';

    const proxySubject = this.communicator.stringToProxy(
      `Subject:ws -h ${hostname} -p 9099`
    );

    this.subject = await Demo.SubjectPrx.checkedCast(proxySubject);
    console.log('[IceDelegate] SubjectPrx obtenido:', this.subject);

    const adapter = await this.communicator.createObjectAdapter('');
    
    const conn = this.subject.ice_getCachedConnection();
    conn.setAdapter(adapter);
    

    const callbackPrx = Demo.ObserverPrx.uncheckedCast(
      adapter.addWithUUID(this.subscriber)
    );
    console.log('[IceDelegate] ObserverPrx creado, llamando attachObserver con username:', this.username);

    await this.subject.attachObserver(callbackPrx, this.username);
    console.log('[IceDelegate] attachObserver completado exitosamente');
  }

  subscribe(callback){
    // backward compat: subscribe -> audio callbacks
    this.audioCallbacks.push(callback);
  }

  subscribeAudio(callback) {
    this.audioCallbacks.push(callback);
  }

  subscribeCall(callback) {
    this.callCallbacks.push(callback);
  }

  notify(bytes){
    this.audioCallbacks.forEach(calback => {
        try { calback(bytes); } catch(e) { console.error('delegate.notify audio cb error', e); }
    })
  }

  notifyCallStarted(sessionId, caller, receiver) {
    this.callCallbacks.forEach(calback => {
        try { calback(sessionId, caller, receiver); } catch(e) { console.error('delegate.notifyCallStarted cb error', e); }
    });
  }

  // Send audio bytes to the Subject via Ice
  async sendAudio(sessionId, sender, bytes) {
    try {
      if (!this.subject) {
        console.warn('[IceDelegate] subject not initialized when sending audio, initializing with username:', this.username);
        await this.init(this.username);
      }
      // Ensure bytes is Uint8Array
      const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      await this.subject.sendAudio(sessionId, sender, data);
    } catch (err) {
      console.error('[IceDelegate] Error sending audio via Ice:', err);
    }
  }

}
const intance = new IceDelegatge();
export default intance;
