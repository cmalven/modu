import { Modu } from '../../index';

class Display extends Modu {
  constructor(m) {
    super(m);

    this.countEl = this.get('count');
  }

  init = () => {
    // Listen for count to change in `Counter` and update the value
    this.on('Counter', 'change', this.update);
  }

  update = newValue => {
    this.countEl.innerHTML = newValue;
    return true;
  }

  cleanup = () => {}
}

export default Display;
