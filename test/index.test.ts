import { describe, assert, it, expect, vi, beforeEach } from 'vitest';
import { Modu, App, toKebabCase, toPascalCase } from '../index';
import { JSDOM } from 'jsdom';
import * as initialModules from '../examples/modules/initial';

/*
test('Math.sqrt()', () => {
  expect(Math.sqrt(4)).toBe(2);
  expect(Math.sqrt(144)).toBe(12);
  expect(Math.sqrt(2)).toBe(Math.SQRT2);
});

test('JSON', () => {
  const input = {
    foo: 'hello',
    bar: 'world',
  };

  const output = JSON.stringify(input);

  expect(output).eq('{"foo":"hello","bar":"world"}');
  assert.deepEqual(JSON.parse(output), input, 'matches original');
});
 */


const globalAny: any = global;

const initApp = (containerEl = document) => {
  const app = new App({
    importMethod: module => import(`../examples/modules/${module}.ts`),
  });
  app.init(containerEl);
  return app;
};

const initAppInitial = () => {
  const app = new App({
    importMethod: module => import(`../examples/modules/${module}.ts`),
    initialModules,
  });
  app.init();
  return app;
};

//
//   Generate Markup
//
//////////////////////////////////////////////////////////////////////

const getCountersMarkup = () => {
  return `
      <!-- Counter -->
    <div class="test-container-1">
      <div
        data-module-counter="main"
        data-counter-min="-10"
        data-counter-max="10"
      >
        <button data-counter="less" data-counter-child-value="test">Less</button>
        <button data-counter="more">More</button>
      </div>
    </div>

    <div class="test-container-2">
      <!-- Display (One) -->
      <div data-module-display="main">
        <p data-display="count">0</p>
      </div>

      <!-- Display (Two) -->
      <div data-module-display>
        <p data-display="count">0</p>
      </div>
    </div>
  `;
};

const getCommonDom = () => {
  const dom = new JSDOM(
    `<html>
       <body>
         ${getCountersMarkup()}
       </body>
     </html>`,
    { url: 'http://localhost' },
  );
  globalAny.document = dom.window.document;
  globalAny.window = global.document.defaultView;
};

const getBodyDom = (markup = '') => {
  const dom = new JSDOM(
    `<html>
       <body
         data-module-resizer
         data-module-scroller
       >
       ${markup}
       </body>
     </html>`,
    { url: 'http://localhost' },
  );
  globalAny.document = dom.window.document;
  globalAny.window = global.document.defaultView;
};

//
//   Tests
//
//////////////////////////////////////////////////////////////////////

describe('App', () => {
  describe('init()', () => {
    let app: App;

    beforeEach(() => {
      getCommonDom();
      app = initApp();
    });

    it('creates app and initializes modules', async () => {
      assert.isArray(app.storage);
      assert.lengthOf(app.storage, 0);

      // Modules should be ready after a short wait
      const result = await app.modulesReady;
      assert.lengthOf(app.storage, 3);
      if (result?.length) assert.lengthOf(result, 3);
    });

    it('does not duplicate existing modules if called twice', async () => {
      await app.modulesReady;
      assert.lengthOf(app.storage, 3);

      // Run init() again
      app.init();

      await app.modulesReady;
      assert.lengthOf(app.storage, 3);
    });
  });

  describe('init() with initial modules', () => {
    let app: App;

    beforeEach(() => {
      getCommonDom();
      app = initAppInitial();
    });

    it('immediately initializes initial modules', async () => {
      assert.lengthOf(app.storage, 1);

      // Modules should be ready after a short wait
      const result = await app.modulesReady;
      assert.lengthOf(app.storage, 3);
      if (result?.length) assert.lengthOf(result, 3);
    });
  });

  describe('destroy()', () => {
    let app: App;

    beforeEach(() => {
      getCommonDom();
      app = initApp();
    });

    it('destroys the app and all modules', async () => {
      await app.modulesReady;
      assert.lengthOf(app.storage, 3);
      app.destroy();
      assert.lengthOf(app.storage, 0);
    });
  });
});

describe('Modu', () => {
  describe('creation', () => {
    let app: App;

    beforeEach(() => {
      getCommonDom();
      app = initApp();
    });

    it('has expected details', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0];
      const displayOne = app.getModulesByName('display')[0];
      const displayTwo = app.getModulesByName('display')[1];

      // Inspect counter
      assert.equal(counter.name, 'counter');
      assert.equal(counter.key, 'main', 'counter should have a key');
      assert.equal(counter.module.elementPrefix, 'data-counter', 'has correct element prefix');
      assert.equal(counter.module.dataPrefix, 'data-counter-', 'has correct data prefix');
      assert.lengthOf(counter.module.app.storage, 3, '`app` property on module has correct number of modules');

      // Inspect displays
      assert.equal(displayOne.key, 'main', 'display one should have a key');
      assert.equal(displayTwo.key, undefined, 'display two should not have a key');
    });
  });

  describe('creation with multiple containers', () => {
    let app: App;

    beforeEach(() => {
      getBodyDom(getCountersMarkup());
      app = initApp();
    });

    it('has expected details', async () => {
      await app.modulesReady;
      // eslint-disable-next-line max-nested-callbacks
      expect(app.storage.map(mod => mod.name)).to.include.members([
        'counter',
        'display',
        'display',
        'resizer',
        'scroller',
      ], '`app` has correct combination of modules');

      // Destroy the first container
      app.destroyModules(document.querySelector('.test-container-1'));
      // eslint-disable-next-line max-nested-callbacks
      expect(app.storage.map(mod => mod.name)).to.include.members([
        'display',
        'display',
        'resizer',
        'scroller',
      ], '`app` has correct combination of modules after destroying first container');

      // Destroy the second container
      app.destroyModules(document.querySelector('.test-container-2'));
      // eslint-disable-next-line max-nested-callbacks
      expect(app.storage.map(mod => mod.name)).to.include.members([
        'resizer',
        'scroller',
      ], '`app` has correct combination of modules after destroying second container');

      // Re-Add the second container
      app.init(document.querySelector('.test-container-2'));
      await app.modulesReady;
      // eslint-disable-next-line max-nested-callbacks
      expect(app.storage.map(mod => mod.name)).to.include.members([
        'resizer',
        'scroller',
        'display',
        'display',
      ], '`app` has correct combination of modules after re-initializing second container');
    });
  });

  describe('creating multiple modules per element', () => {
    let app: App;

    beforeEach(() => {
      getBodyDom();
      app = initApp();
    });

    it('can create multiple components on one element', async () => {
      await app.modulesReady;
      const resizer = app.getModulesByName('resizer')[0].module;
      const scroller = app.getModulesByName('scroller')[0].module;

      assert.typeOf(resizer, 'object');
      assert.typeOf(scroller, 'object');
    });
  });

  describe('get() and getAll()', () => {
    let app: App;

    beforeEach(() => {
      getCommonDom();
      app = initApp();
    });

    it('get elements', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;

      // Retrieve one element
      const lessEl = counter.get('less');
      const moreEl = counter.get('more');
      assert.equal(lessEl?.tagName, 'BUTTON', 'less is an button element');
      assert.equal(moreEl?.tagName, 'BUTTON', 'more is an button element');

      // Retrieve all elements
      const lessEls = counter.getAll('less');
      assert.lengthOf(lessEls, 1, 'should be only one less el');
      assert.equal(lessEls[0].tagName, 'BUTTON', 'less is an button element');
    });
  });

  describe('getData();', () => {
    let app: App;

    beforeEach(() => {
      getCommonDom();
      app = initApp();
    });

    it('get data', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;
      const min = counter.getData('min');
      const max = counter.getData('max');
      assert.equal(min, -10);
      assert.equal(max, 10);

      // Get a value on a child element
      const lessEl = counter.get('less');
      const childValue = counter.getData('child-value', lessEl);
      assert.equal(childValue, 'test');
    });

    it('fails to get data', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;
      const val = counter.getData('foo');
      assert.equal(val, null);

      // Get a value on a child element
      const lessEl = counter.get('less');
      const childValue = counter.getData('foo', lessEl);
      assert.equal(childValue, null);
    });
  });

  describe('on() and emit()', () => {
    let app: App;

    beforeEach(() => {
      getCommonDom();
      app = initApp();
    });

    it('broadcasting and listening for events', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;
      const display = app.getModulesByName('display')[0].module;

      const callbackStub = vi.fn();
      display.on('Counter', 'change', callbackStub);

      counter.emit('change', 1);
      counter.emit('change', 2);
      expect(callbackStub).toHaveBeenCalledTimes(2);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Seem to be inaccurate type definitions for vitest
      assert.deepEqual(callbackStub.mock.calls, [[1], [2]]);
    });

    it('does not respond to events emitted by itself', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;

      const callbackStub = vi.fn();
      counter.on('Counter', 'change', callbackStub);

      counter.emit('change', 33);
      expect(callbackStub).not.toHaveBeenCalled();
    });
  });

  describe('on() and emit() on same element', () => {
    let app: App;

    beforeEach(() => {
      getBodyDom();
      app = initApp();
    });

    it('different modules on same element can communicate', async () => {
      await app.modulesReady;
      const resizer = app.getModulesByName('resizer')[0].module;
      const scroller = app.getModulesByName('scroller')[0].module;

      const callbackStub = vi.fn();
      scroller.on('Resizer', 'update', callbackStub);

      resizer.emit('update', 'hello');
      resizer.emit('update', 'modu');
      expect(callbackStub).toHaveBeenCalledTimes(2);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Seem to be inaccurate type definitions for vitest
      assert.deepEqual(callbackStub.mock.calls, [['hello'], ['modu']]);
    });
  });

  describe('call()', () => {
    let app: App;

    beforeEach(() => {
      getCommonDom();
      app = initApp();
    });

    it('calling methods', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;
      const displayOne = app.getModulesByName('display')[0].module;
      const displayTwo = app.getModulesByName('display')[1].module;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Seem to be inaccurate type definitions for vitest
      const displayOneMethod = vi.spyOn(displayOne, 'update');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Seem to be inaccurate type definitions for vitest
      const displayTwoMethod = vi.spyOn(displayTwo, 'update');

      // Counter calls all displays
      const result1 = counter.call('Display', 'update', 33);
      const result2 = counter.call('Display', 'update', 66, 'main');

      // Returns values
      assert.deepEqual(result1, [true, true]);
      assert.deepEqual(result2, true);

      expect(displayOneMethod).toHaveBeenCalledTimes(2);
      expect(displayTwoMethod).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Seem to be inaccurate type definitions for vitest
      assert.deepEqual(displayOneMethod.mock.calls, [[33], [66]]);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Seem to be inaccurate type definitions for vitest
      assert.deepEqual(displayTwoMethod.mock.calls, [[33]]);
    });

    it('calling invalid methods', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;
      console.error = vi.fn();
      counter.call('Display', 'foo');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Seem to be inaccurate type definitions for vitest
      expect(console.error.mock.calls[0][0]).toBe('Failed to call non-existent method "foo" on module "display"');
    });

    it('does not call methods on itself', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Seem to be inaccurate type definitions for vitest
      const counterMethod = vi.spyOn(counter, 'change');

      // Counter calls all displays
      counter.call('Counter', 'change', 'counter was updated');

      expect(counterMethod).not.toHaveBeenCalled();
    });
  });

  describe('getSelector()', () => {
    let app: App;

    beforeEach(() => {
      getCommonDom();
      app = initApp();
    });

    it('returns the selector for an element', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;
      const display = app.getModulesByName('display')[0].module;
      const counterLessSel = counter.getSelector('less');
      const counterMoreSel = counter.getSelector('more');
      const displayCountSel = display.getSelector('count');

      assert.equal(counterLessSel, '[data-counter="less"]');
      assert.equal(counterMoreSel, '[data-counter="more"]');
      assert.equal(displayCountSel, '[data-display="count"]');
    });
  });

  describe('static convertStringValue()', () => {
    it('returns a string as is', async () => {
      assert.equal(Modu.convertStringValue('my special string'), 'my special string');
    });

    it('converts a boolean string to a boolean', async () => {
      assert.equal(Modu.convertStringValue('true'), true);
      assert.equal(Modu.convertStringValue('false'), false);
    });

    it('converts a number string to a number', async () => {
      assert.equal(Modu.convertStringValue('0'), 0);
      assert.equal(Modu.convertStringValue('100'), 100);
    });

    it('returns a null value as is', async () => {
      assert.equal(Modu.convertStringValue(null), null);
    });

    it('returns an empty value as null', async () => {
      assert.equal(Modu.convertStringValue(''), null);
    });
  });
});

describe('Utils', () => {
  const kebabName = 'some-name';
  const pascalName = 'SomeName';
  const camelName = 'someName';
  const snakeName = 'some_name';

  describe('toKebabCase()', () => {
    it('converts kebab-case', () => {
      assert.equal(toKebabCase(kebabName), kebabName);
    });

    it('converts PascalCase', () => {
      assert.equal(toKebabCase(pascalName), kebabName);
    });

    it('converts camelCase', () => {
      assert.equal(toKebabCase(camelName), kebabName);
    });

    it('converts snake_case', () => {
      assert.equal(toKebabCase(snakeName), kebabName);
    });
  });

  describe('toPascalCase()', () => {
    it('converts kebab-case', () => {
      assert.equal(toPascalCase(kebabName), pascalName);
    });

    it('converts PascalCase', () => {
      assert.equal(toPascalCase(pascalName), pascalName);
    });

    it('converts camelCase', () => {
      assert.equal(toPascalCase(camelName), pascalName);
    });

    it('converts snake_case', () => {
      assert.equal(toPascalCase(snakeName), pascalName);
    });
  });
});

