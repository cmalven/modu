import { Modu } from '../../index';

class Display extends Modu {
  constructor(m: Modu) {
    super(m);

    this.countEl = this.get('count');
  }

  init = () => {
    // Listen for count to change in `Counter` and update the value
    this.on('Counter', 'change', this.update);
  };

  update = (newValue: number) => {
    this.countEl.innerHTML = newValue;
    return true;
  };
}

export default Display;
