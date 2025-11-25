import Subscriber from './subscriber.js';
export class IceDelegatge {
  constructor() {
    this.communicator = Ice.initialize();
    this.callbacks = [];
    this.subscriber = new Subscriber(this);
    this.username = null;
  }
  async init(name) {
    // Si se proporciona nombre, guardarlo; si no, usar el almacenado o el de localStorage
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
    this.callbacks.push(callback);
  }

  notify(bytes){
    this.callbacks.forEach(calback => {
        calback(bytes)
    })
  }
  
  notifyCallStarted(sessionId) {
    this.callbacks.forEach(calback => calback(sessionId));
  }

}
const intance = new IceDelegatge();
export default intance;
