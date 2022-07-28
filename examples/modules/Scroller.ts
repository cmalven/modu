import { Modu } from '../../index';

class Scroller extends Modu {
  constructor(m: Modu) {
    super(m);
  }

  init = () => {
    window.addEventListener('scroll', this.update);
  };

  update = () => {
    console.log('Window scroll', window.scrollY);
  };
}

export default Scroller;