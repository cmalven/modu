import { Modu } from '../../index';

class Resizer extends Modu {
  constructor(m: Modu) {
    super(m);
  }

  override init = () => {
    window.addEventListener('resize', this.update);
  }

  update = () => {
    console.log('Window width', window.innerWidth);
  }

  override cleanup = () => {}
}

export default Resizer;