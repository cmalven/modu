---
title: Simple, flexible DOM-based modules
---

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
- Zero dependencies
- Less than [2kB (minified + gzipped)](https://bundlephobia.com/result?p=@malven/modu)

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
  cleanup = () => {
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
    this.on('Counter', 'change', this.update);
  }

  update = newValue => {
    this.countEl.innerHTML = newValue;
  }
  
  cleanup = () => {}
}

export default Display;
```

### Initiate modules

Finally, in your main `.js` file (e.g. `main.js`) create a module `App`. The only required option for `App` is `importMethod`, which tells Modu how to dynamically import modules and smooths over path issues in various dynamic import implementations (such as Webpack).

```js
import { App } from '@malven/modu';

const app = new App({
  importMethod: module => import('./modules/' + module + '.js'),
});
app.init();
```

## Details

### Keys

Every module can specify a `key` in the markup, which makes it possible to scope events and calls to that specific key.

```html
<button data-module-modal-trigger="main">Open Modal</button>

<div data-module-modal="main">
    <p>Modal content goes here.</p>
</div>
```

```js
// in /modules/Modal.js
// Only listen specifically for `click` events on a `ModalTrigger` that has a key of `main`
this.on('ModalTrigger', 'click', this.open, this.key); // `this.key` will be `main`
```

### Initial Modules

By default, Modu will automatically use _dynamic imports_ for all modules, which means they won't be included in the initial javascript bundle and will instead be loaded only if they're included on each page. This does mean that there may be a short delay between the time the page and main javascript bundle loads and the time each dynamically imported module is ready.

For modules that are critical to the initial load of the page, it might make sense to include these modules in the initial javascript bundle, and Modu allows you to specify which modules should be included this way through the `initialModules` option on `App`.

To take advantage of this, do the following:

- First, created an `initial.js` file inside of your `modules` directory. This file should import all modules that you want to be imported into the initial bundle:

```js
// in /modules/initial.js
export { default as Counter } from './Counter';
export { default as Display } from './Display';
```

- Next, import `initial.js` into your main javascript file and include it when creating `App`

```js
// in /main.js`
import * as initialModules from './modules/initial';

const app = new App({
  initialModules,
  importMethod: module => import('./modules/' + module + '.js'),
});
app.init();

```

## APIs

### App

An `App` helps orchestrate all collaboration between modules, including setup, teardown, and communication.

| Method      | Description | Example |
| ---------- | ----------- | --------- |
| `init(containerEl = document)` | Initializes all modules within a container | `app.init()` or `app.init(document.querySelector('.header')` |
| `destroyModules(containerEl = document)` | Destroys all modules within a container | `app.destroyModules()` or `app.destroyModules(document.querySelector('.header')` |
| `destroy()` | Completely destroys the app and all modules | `app.destroy()` |

### Module

An individual module should extend `Modu` and inherits all of its common behavior, including data access, DOM querying, event listening/emitting, and teardown.

| Method      | Description | Example |
| ---------- | ----------- | --------- |
| `get(name)` | Returns the first child element of the module that matches the passed name | `this.get('button')` |
| `getAll(name)` | Returns all child elements of the module that match the passed name | `this.getAll('button')` |
| `getData(name)` | Retrieve the value of a data attribute stored on the modules element | `this.getData('max')` |
| `on(module, event, callback, key = null)` | Add a listener for events fired in another module using `.emit()` | `this.on('Counter', 'change', (newValue) => {…})` or `this.on('Counter', 'change', (newValue) => {…}, 'one')` |
| `emit(event, data = null)` | Broadcast an event that can be listened for by other modules using `.on()` | `this.emit('change')` or `this.emit('change', { newValue: 10 })` |
| `call(module, method, params = null, key = null)` | Calls a method on another module | `this.call('Counter', 'change', 1, 'one')` or `this.call('Counter', 'change')` |
