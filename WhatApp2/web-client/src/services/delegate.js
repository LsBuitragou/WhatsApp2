import Subscriber from './subscriber.js';



export class IceDelegatge {
  constructor() {
    this.communicator = Ice.initialize();
    this.callbacks = [];
    this.subscriber = new Subscriber(this)
  }
  async init(username) {
    if (this.subject) {
      return;
    }

    this.username = username; 
    const hostname = '192.168.131.139';

    const proxySubject = this.communicator.stringToProxy(
      `Subject:ws -h ${hostname} -p 9099`
    );

    this.subject = await Demo.SubjectPrx.checkedCast(proxySubject);

    const adapter = await this.communicator.createObjectAdapter('');
    
    const conn = this.subject.ice_getCachedConnection();
    conn.setAdapter(adapter);
    

    const callbackPrx = Demo.ObserverPrx.uncheckedCast(
      adapter.addWithUUID(this.subscriber)
    );
    
    await this.subject.attachObserver(callbackPrx,username);
    
  }

  subscribe(callback){
    this.callbacks.push(callback);
  }

  notify(bytes){
    this.callbacks.forEach(calback => {
        calback(bytes)
    })
  }


}
const intance = new IceDelegatge();
export default intance;
