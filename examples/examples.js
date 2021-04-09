import './style.css';

import * as initialModules from './modules/initial';
import { App } from '../index';

const app = new App({
  initialModules,
  importMethod: module => import('./modules/' + module + '.js'),
});
app.init();
