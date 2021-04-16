import { Modu } from '../../index';

class Resizer extends Modu {
  constructor(m) {
    super(m);
  }

  init = () => {
    window.addEventListener('resize', this.update);
  }

  update = () => {
    console.log('Window width', window.innerWidth);
  }

  cleanup = () => {}
}

export default Resizer;