import { Modu, ModuOptions } from '../../index';

class Counter extends Modu {
  moreEl: Element | null;
  lessEl: Element | null;
  handleLess: () => void;
  handleMore: () => void;
  count: number;
  min: number;
  max: number;

  constructor(m: ModuOptions) {
    super(m);

    this.count = 0;
    this.min = Number(this.getData('min'));
    this.max = Number(this.getData('max'));
    this.lessEl = this.get('less');
    this.moreEl = this.get('more');

    this.handleLess = () => this.change(-1);
    this.handleMore = () => this.change(1);
  }

  /**
   * Will automatically be called when the module is loaded
   */
  override init() {
    this.lessEl?.addEventListener('click', this.handleLess);
    this.moreEl?.addEventListener('click', this.handleMore);
  }

  change = (change: -1 | 1) => {
    this.count += change;
    if (this.count < this.min) this.count = this.min;
    if (this.count > this.max) this.count = this.max;

    // Broadcast the change in case any other modules are interested
    this.emit('change', this.count);
  };

  /**
   * Will automatically be called when the module (or entire app) is destroyed.
   */
  override cleanup = () => {
    this.lessEl?.removeEventListener('click', this.handleLess);
    this.moreEl?.removeEventListener('click', this.handleMore);
  };
}

export default Counter;
