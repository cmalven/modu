import { assert } from 'chai';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import { App } from '../dist/modu.es.js';
import { JSDOM } from 'jsdom';

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
            data-module-counter
            data-counter-min="-10"
            data-counter-max="10"
          >
            <button data-counter="less">Less</button>
            <button data-counter="more">More</button>
          </div>

          <!-- Display -->
          <div data-module-display>
            <p data-display="count">0</p>
          </div>
       </body>
     </html>`,
    { url: 'http://localhost' },
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

    it('creates app and initializes modules', () => {
      // assert.equal(typeof app.modulesReady, 'Promise');
      assert.isArray(app.storage);
      assert.lengthOf(app.storage, 0);

      // Modules should be ready after a short wait
      return app.modulesReady.then(result => {
        assert.lengthOf(app.storage, 2);
        assert.lengthOf(result, 2);
      });

    });

    it('does not duplicate existing modules if called twice', () => {
      return app.modulesReady.then(() => {
        assert.lengthOf(app.storage, 2);
        app.init();

        return app.modulesReady.then(() => {
          assert.lengthOf(app.storage, 2);
        });
      });
    });
  });
});
