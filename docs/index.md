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

The main identifier attribute for each module (e.g. `data-module-counter`) should always use a `kebab-case` version of the module name.

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

Create each module in `/modules/`. Module class names and file names should always be `PascalCase.`

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

### Initiate modules

Finally, in your main `.js` file (e.g. `main.js`) create a module `app`. The only required option for `App` is `moduleDir`, which tells Modu where to attempt to import modules from.

```js
import { App } from '@malven/modu';

const app = new App({ moduleDir: './src/scripts/modules/'});
app.init(modu);
```

## App api

An `App` helps orchestrate all collaboration between modules, including setup, teardown, and communication.

| Method      | Description | Example |
| ---------- | ----------- | --------- |
| `init` | Initializes all modules that have a matching DOM element in the passed container | `app.init()` or `app.init(document.querySelector('header')` |
| `destroyModules` | Destroys all modules that have a matching DOM element in the passed container | `app.destroyModules()` or `app.destroyModules(document.querySelector('header')` |
| `update` | **Not yet implemented.** Destroys all modules that no longer have a matching DOM element in the passed container, and initializes all modules that do | `app.update()` or `app.update(document.querySelector('header')` |
| `destroy` | **Not yet implemented.** Completely destroys the app and all modules | `app.destroy()` |

## Module api

An individual module should extend `Modu` and inherits all of its common behavior, including data access, DOM querying, event listening/emitting, and teardown.

| Method      | Description | Example |
| ---------- | ----------- | --------- |
| `get` | Returns the first child element of the module that matches the passed name | `this.get('button')` |
| `getAll` | Returns all child elements of the module that match the passed name | `this.getAll('button')` |
| `getData` | Retrieve the value of a data attribute stored on the modules element | `this.getData('max')` |
| `on` | Add a listener for events fired in another module using `.emit()` | `this.on('Counter', 'change', (newValue) => {…})` or `this.on('Counter', 'change', (newValue) => {…}, 'one')` |
| `emit` | Broadcast an event that can be listened for by other modules using `.on()` | `this.emit('change')` or `this.emit('change', { newValue: 10 })` |
| `call` | **Not yet implemented.** Calls a method on another module | `this.call('button')` |
