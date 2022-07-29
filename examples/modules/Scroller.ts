import { Modu, ModuOptions } from '../../index';

class Scroller extends Modu {
  constructor(m: ModuOptions) {
    super(m);
  }

  override init = () => {
    window.addEventListener('scroll', this.update);
  };

  update = () => {
    console.log('Window scroll', window.scrollY);
  };
}

export default Scroller;