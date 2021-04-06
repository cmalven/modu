import { Modu } from '../../index';

class Display extends Modu {
  constructor(m) {
    super(m);

    this.countEl = this.get('count');
  }

  init = () => {
    console.log('Display Init');

    // Listen for count to change in `Counter` and update the value
    this.on('Counter', 'change', (newValue) => {
      this.countEl.innerHTML = newValue;
    });
  }

  destroy = () => {
    console.log('Destroy Display');
  }
}

export default Display;
