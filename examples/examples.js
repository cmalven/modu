import './style.css';

import { App } from '../index';

const app = new App({
  importMethod: module => import('./modules/' + module + '.js'),
});
app.init();
