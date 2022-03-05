import { describe, assert, expect, test, beforeEach } from 'vitest';
import { App, toKebabCase, toPascalCase } from '../index';
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

const initApp = (containerEl = document) => {
  const app = new App({
    importMethod: module => import('../examples/modules/' + module + '.js'),
  });
  app.init(containerEl);
  return app;
};

const initAppInitial = () => {
  const app = new App({
    importMethod: module => import('../examples/modules/' + module + '.js'),
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
  global.document = dom.window.document;
  global.window = global.document.defaultView;
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
  global.document = dom.window.document;
  global.window = global.document.defaultView;
};

//
//   Tests
//
//////////////////////////////////////////////////////////////////////

describe('App', () => {
  describe('init()', () => {
    let app;

    beforeEach(() => {
      getCommonDom();
      app = initApp();
    });

    test('creates app and initializes modules', async () => {
      assert.isArray(app.storage);
      assert.lengthOf(app.storage, 0);

      // Modules should be ready after a short wait
      const result = await app.modulesReady;
      // console.log(app);
      console.log(result);
      assert.lengthOf(app.storage, 3);
      assert.lengthOf(result, 3);
    });

    test('does not duplicate existing modules if called twice', async () => {
      // await app.modulesReady;
      // assert.lengthOf(app.storage, 3);

      // Run init() again
      // app.init();

      // await app.modulesReady;
      // assert.lengthOf(app.storage, 3);
    });
  });
});
