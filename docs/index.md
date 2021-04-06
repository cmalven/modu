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
<!-- We'll create one module to change the count… -->
<div
    data-module-counter
    data-counter-min="-10"
    data-counter-max="10"
>
    <button data-counter="less">Less</button>
    <button data-counter="more">More</button>
</div>

<!-- …and another module to display it -->
<div data-module-display>
    <p data-display="value">0</p>
</div>
```

### Create module js

Create each module in `/modules/`. Files and class names can use pascal or camel case and we'll still find the matching markup.

`/modules/Counter.js`

```js
import { Modu } from '@malven/modu';

class Counter extends Modu {
  constructor(m) {
    super(m);
    
    this.count = 0;
    this.min = this.getData('min');
    this.max = this.getData('max');
    this.lessEl = this.get('less');
    this.moreEl = this.get('more');
    
    this.handleLess = this.change.bind(this, -1);
    this.handleMore = this.change.bind(this, 1);
  }

  /**
   * Will automatically be called when the module is loaded
   */
  init = () => {
    this.lessEl.addEventListener('click', this.handleLess);
    this.moreEl.addEventListener('click', this.handleMore);
  }
  
  change = (change) => {
    this.count += change;
    if (this.count < this.min) this.count = this.min;
    if (this.count < this.max) this.count = this.max;
    
    // Broadcast the change in case any other modules are interested
    this.emit('change', this.count);
  }

  /**
   * Will automatically be called when the module (or entire app) is destroyed.
   */
  destroy = () => {
    this.lessEl.removeEventListener('click', this.handleLess);
    this.moreEl.removeEventListener('click', this.handleMore);
  }
}

export default Counter;
```

`/modules/Display.js`

```js
import { Modu } from '@malven/modu';

class Display extends Modu {
  constructor(m) {
    super(m);
    
    this.countEl = this.get('count');
  }
  
  init = () => {
    // Listen for count to change in `Counter` and update the value
    this.on('Counter', 'change', (newValue) => {
      this.countEl.innerHTML = newValue;
    });
  }
  
  destroy = () => {}
}

export default Display;
```

###  Add module to manifest

Add all modules to a manifest file in `/modules/index.js`

```js
export { default as Counter } from './Counter';
export { default as Display } from './Display';
```

### Initiate modules

Finally, in your main `.js` file (e.g. `main.js`) create a module `app`.

```js
import { App } from '@malven/modu';
import * as modu from './modules';

const app = new App();
app.init(modu);
```