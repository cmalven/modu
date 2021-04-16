import { Modu } from '../../index';

class Scroller extends Modu {
  constructor(m) {
    super(m);
  }

  init = () => {
    window.addEventListener('scroll', this.update);
  }

  update = () => {
    console.log('Window scroll', window.scrollY);
  }

  cleanup = () => {}
}

export default Scroller;