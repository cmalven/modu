import { Modu, ModuOptions } from '../../index';

class Display extends Modu {
  countEl: Element | null;

  constructor(m: ModuOptions) {
    super(m);

    this.countEl = this.get('count');
  }

  override init = () => {
    // Listen for count to change in `Counter` and update the value
    this.on('Counter', 'change', this.update);
  };

  update = (newValue: number) => {
    if (this.countEl) this.countEl.innerHTML = String(newValue);
    return true;
  };
}

export default Display;
