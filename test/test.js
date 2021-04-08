import {App} from '../dist/modu.es.js';
import {JSDOM} from 'jsdom';
import sinon from 'sinon';
import {assert, expect} from 'chai';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const initApp = () => {
  const app = new App({
    importMethod: module => import('../examples/modules/' + module + '.js'),
  });
  app.init();
  return app;
}

const getCounterDom = () => {
  const dom = new JSDOM(
    `<html>
       <body>
          <!-- Counter -->
          <div
            data-module-counter="main"
            data-counter-min="-10"
            data-counter-max="10"
          >
            <button data-counter="less">Less</button>
            <button data-counter="more">More</button>
          </div>

          <!-- Display (One) -->
          <div data-module-display="main">
            <p data-display="count">0</p>
          </div>

          <!-- Display (Two) -->
          <div data-module-display>
            <p data-display="count">0</p>
          </div>
       </body>
     </html>`,
    {url: 'http://localhost'},
  );
  global.window = dom.window;
  global.document = dom.window.document;
}

describe('App', () => {
  describe('init()', () => {
    let app;

    beforeEach(() => {
      getCounterDom();
      app = initApp();
    });

    it('creates app and initializes modules', async () => {
      assert.isArray(app.storage);
      assert.lengthOf(app.storage, 0);

      // Modules should be ready after a short wait
      const result = await app.modulesReady;
      assert.lengthOf(app.storage, 3);
      assert.lengthOf(result, 3);
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

  describe('destroy()', () => {
    let app;

    beforeEach(() => {
      getCounterDom();
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
    let app;

    beforeEach(() => {
      getCounterDom();
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
      assert.equal(displayTwo.key, '', 'display two should not have a key');
    });
  });

  describe('get() and getAll()', () => {
    let app;

    beforeEach(() => {
      getCounterDom();
      app = initApp();
    });

    it('get elements', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;

      // Retrieve one element
      const lessEl = counter.get('less');
      const moreEl = counter.get('more');
      assert.equal(lessEl.tagName, 'BUTTON', 'less is an button element');
      assert.equal(moreEl.tagName, 'BUTTON', 'more is an button element');

      // Retrieve all elements
      const lessEls = counter.getAll('less');
      assert.lengthOf(lessEls, 1, 'should be only one less el');
      assert.equal(lessEls[0].tagName, 'BUTTON', 'less is an button element');
    });
  });

  describe('getData();', () => {
    let app;

    beforeEach(() => {
      getCounterDom();
      app = initApp();
    });

    it('get data', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;
      const min = counter.getData('min');
      const max = counter.getData('max');

      assert.equal(min, '-10');
      assert.equal(max, '10');
    });
  });

  describe('on() and emit()', () => {
    let app;

    beforeEach(() => {
      getCounterDom();
      app = initApp();
    });

    it('broadcasting and listening for events', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;
      const display = app.getModulesByName('display')[0].module;

      const callbackStub = sinon.stub();
      display.on('Counter', 'change', callbackStub);

      counter.emit('change', 'hello');
      counter.emit('change', 'modu');
      expect(callbackStub).calledTwice;
      assert.deepEqual(callbackStub.args, [['hello'], ['modu']]);
    });
  });

  describe('call()', () => {
    let app;

    beforeEach(() => {
      getCounterDom();
      app = initApp();
    });

    it('calling methods', async () => {
      await app.modulesReady;
      const counter = app.getModulesByName('counter')[0].module;
      const displayOne = app.getModulesByName('display')[0].module;
      const displayTwo = app.getModulesByName('display')[1].module;

      const displayOneMethod = sinon.spy(displayOne, 'update');
      const displayTwoMethod = sinon.spy(displayTwo, 'update');

      // Counter calls all displays
      counter.call('Display', 'update', 'all displays');
      counter.call('Display', 'update', 'main display', 'main');

      expect(displayOneMethod).calledTwice;
      expect(displayTwoMethod).calledOnce;
      assert.deepEqual(displayOneMethod.args, [['all displays'], ['main display']]);
      assert.deepEqual(displayTwoMethod.args, [['all displays']]);
    });
  });
});