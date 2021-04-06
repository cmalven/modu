# Modu

`@malven/modu` provides a simple system for working with DOM-based modules that is powerful and flexible.

## Feature Highlights

- Modules are automatically initiated only if they exist on the current page.
- Modules are imported dynamically by default, meaning that the total JS load for each page is the minimum needed for that page's modules.
- Modules can call methods on other modules.
- Modules can listen for events on other modules.
- Modules can easily be destroyed and are expected to clean up after themselves, making them perfect for single-page sites.
- Modules can easily select scoped elements within them.
- Custom data for a module can be specified on the DOM element.

## Getting Started

As a tour of the library, let's walk through creating a simple `<Counter />` module.

### Install

```bash
npm i @malven/modu
```

### Create module markup

```html
<div
    data-module-counter
    data-counter-min="-10"
    data-counter-max="10"
>
    <button data-counter="less">Less</button>
    <button data-counter="more">More</button>

    <p data-counter="value">0</p>
</div>
```

### Create module js

Create each module in `/modules/Counter.js`. Files and class names can use whatever casing you want (pascal, camel, etc) and we'll still find the matching markup.

```js
import { modu } from '@malven/modu';

class Counter extends modu {
  constructor(m) {
    super(m);
    
    this.count = 0;
    this.min = this.getData('min');
    this.max = this.getData('max');
    this.lessEl = this.get('less');
    this.moreEl = this.get('more');
    this.valueEl = this.get('value');
  }

  /**
   * Will automatically be called when the module is loaded
   */
  init = () => {
    this.lessEl.addEventListener('click', this.change.bind(this, -1));
    this.moreEl.addEventListener('click', this.change.bind(this, 1));
  }
  
  change = (change) => {
    this.count += change;
    if (this.count < this.min) this.count = this.min;
    if (this.count < this.max) this.count = this.max;
  
    // Update the value
    this.valueEl.innerHTML = this.count;
    
    // Broadcast the change in case any other modules are interested
    this.emit('change', this.count);
  }

  /**
   * Will automatically be called when the module (or entire app) is destroyed.
   */
  destroy = () => {
    this.lessEl.removeEventListener('click', this.change.bind(this, -1));
    this.moreEl.removeEventListener('click', this.change.bind(this, 1));
  }
}
```

###  Add module to manifest

Add all modules to a manifest file in `/modules/index.js`

```js
export { default as Counter } from './Counter';
```

### Initiate modules

Finally, in your main `.js` file (e.g. `main.js`) create a module `app`.

```js
import { App } from '@malven/modu';
import * as modu from './modules';

const app = new App();
app.init(modu);
```