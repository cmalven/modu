import './style.css';

import { App } from '../index';

const app = new App({
  moduleDir: './examples/modules/',
});
app.init();

window.setTimeout(() => {
  app.destroyModules();
}, 2000);
