import { Modu } from '../../index';

class Scroller extends Modu {
  constructor(m: Modu) {
    super(m);
  }

  override init = () => {
    window.addEventListener('scroll', this.update);
  }

  update = () => {
    console.log('Window scroll', window.scrollY);
  }

  override cleanup = () => {}
}

export default Scroller;