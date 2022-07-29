import { Modu, ModuOptions } from '../../index';

class Resizer extends Modu {
  constructor(m: ModuOptions) {
    super(m);
  }

  override init() {
    window.addEventListener('resize', this.update);
  }

  update = () => {
    console.log('Window width', window.innerWidth);
  };
}

export default Resizer;