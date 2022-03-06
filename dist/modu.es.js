var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
const toKebabCase = (name) => {
  return name.split("").map((letter) => {
    if (/[A-Z]/.test(letter)) {
      return ` ${letter.toLowerCase()}`;
    }
    return letter;
  }).join("").trim().replace(/[_\s]+/g, "-");
};
const toPascalCase = (name) => {
  return toKebabCase(name).split("-").map((word) => {
    return word.slice(0, 1).toUpperCase() + word.slice(1);
  }).join("");
};
class Modu {
  constructor(options) {
    Object.assign(this, __spreadProps(__spreadValues({}, options), {
      eventListeners: [],
      elementPrefix: "data-" + options.name,
      dataPrefix: "data-" + options.name + "-"
    }));
  }
  get(name) {
    return this.el.querySelector(`[${this.elementPrefix}="${name}"]`);
  }
  getAll(name) {
    return this.el.querySelectorAll(`[${this.elementPrefix}="${name}"]`);
  }
  getData(name, el = null) {
    const searchElement = el ? el : this.el;
    return searchElement.getAttribute(this.dataPrefix + name);
  }
  init() {
  }
  cleanup() {
  }
  emit(event, data) {
    this.app.storage.forEach(({ module }) => {
      const allListeners = module.eventListeners;
      if (!allListeners.length)
        return;
      if (module.name === this.name && module.el === this.el)
        return;
      allListeners.forEach((listener) => {
        if (listener.module !== toPascalCase(this.name))
          return;
        if (listener.event !== event)
          return;
        if (listener.key && listener.key !== this.key)
          return;
        listener.callback(data);
      });
    });
  }
  on(module, event, callback, key = null) {
    this.eventListeners.push({
      module,
      event,
      callback,
      key
    });
  }
  call(module, method, params = null, key = null) {
    const modules = this.app.getModulesByName(module, key);
    let results = [];
    modules.forEach(({ module: module2 }) => {
      if (module2.el === this.el && module2.name === this.name)
        return;
      const moduleMethod = module2[method];
      if (typeof moduleMethod !== "function") {
        return console.error(`Failed to call non-existent method "${method}" on module "${module2.name}"`);
      }
      if (params !== null && params.constructor !== Array) {
        params = [params];
      }
      results.push(moduleMethod.apply(module2, params));
    });
    return results.length === 1 ? results[0] : results;
  }
  getSelector(name) {
    return `[${this.elementPrefix}="${name}"]`;
  }
}
class App {
  constructor(options = {}) {
    const {
      importMethod,
      initialModules = {}
    } = options;
    this.storage = [];
    this.modulesReady = null;
    this.initialModules = initialModules;
    this.prefix = "data-module-";
    if (typeof importMethod !== "function") {
      console.error('Modu.App() is missing an "importMethod" option which is used to determine how to import modules.');
    }
    this.importMethod = importMethod;
  }
  init(containerEl = document) {
    const elements = this.getModuleElements(containerEl);
    this.initModulesForElements(elements);
  }
  destroy() {
    this.destroyModules();
  }
  destroyModules(containerEl = document) {
    const elements = this.getModuleElements(containerEl);
    this.destroyModulesForElements(elements);
  }
  getModuleElements(containerEl = document) {
    const allElements = containerEl.querySelectorAll("*");
    return Array.from(allElements).filter((el) => {
      const names = this.getModuleNamesFromElement(el);
      if (!names.length)
        return false;
      return true;
    });
  }
  initModulesForElements(elements) {
    const modulePromises = elements.map((el) => {
      return this.initModules(el);
    });
    this.modulesReady = Promise.allSettled(modulePromises);
  }
  destroyModulesForElements(elements) {
    let modulesToDestroy = [];
    elements.forEach((el) => {
      const modules = this.getModulesForElement(el);
      modulesToDestroy = modulesToDestroy.concat(modules);
    });
    let idx = this.storage.length;
    while (idx--) {
      const currentModule = this.storage[idx];
      const matchingModuleToDestroy = modulesToDestroy.find((mod) => {
        return mod.name === currentModule.name && mod.el === currentModule.el;
      });
      if (matchingModuleToDestroy) {
        matchingModuleToDestroy.module.cleanup();
        this.storage.splice(idx, 1);
      }
    }
  }
  initModules(element) {
    let readyPromises = [];
    const names = this.getModuleNamesFromElement(element);
    names.forEach(({ name, key }) => {
      const existingModules = this.getModulesForElement(element, name);
      if (existingModules.length)
        return readyPromises.push(new Promise((res) => res()));
      const promise = new Promise((res, rej) => {
        const pascalName = toPascalCase(name);
        const InitialModule = this.initialModules[pascalName];
        if (InitialModule) {
          const module = this.addModule(InitialModule, { element, name, key });
          return res(module);
        }
        this.importMethod(pascalName).then((Mod) => {
          const module = this.addModule(Mod.default, { element, name, key });
          res(module);
        }).catch((error) => {
          console.log(error);
          rej();
        });
      });
      readyPromises.push(promise);
    });
    return Promise.all(readyPromises);
  }
  addModule(ImportedModule, details = {}) {
    const {
      element,
      name,
      key
    } = details;
    const module = new ImportedModule({
      el: element,
      app: this,
      name,
      key
    });
    this.storage.push({
      el: element,
      name,
      module,
      key
    });
    module.init();
    return module;
  }
  getModuleNamesFromElement(element) {
    let results = [];
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.startsWith(this.prefix)) {
        results.push({
          name: attr.name.replace(this.prefix, ""),
          key: attr.value
        });
      }
    });
    return results;
  }
  getModulesForElement(element, name = null) {
    return this.storage.filter((module) => {
      const isSameElement = module.el === element;
      const isSameName = name ? module.name === name : true;
      return isSameElement && isSameName;
    });
  }
  getModulesByName(name, key = null) {
    return this.storage.filter((mod) => {
      const isSameName = toKebabCase(name) === toKebabCase(mod.name);
      const isSameKey = key ? mod.key === key : true;
      return isSameName && isSameKey;
    });
  }
}
export { App, Modu, toKebabCase, toPascalCase };
