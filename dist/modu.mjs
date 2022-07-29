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
    this.eventListeners = [];
    this.name = options.name;
    this.el = options.el;
    this.app = options.app;
    this.elementPrefix = "data-" + options.name;
    this.dataPrefix = "data-" + options.name + "-";
  }
  get(name) {
    return this.el.querySelector(`[${this.elementPrefix}="${name}"]`);
  }
  getAll(name) {
    return this.el.querySelectorAll(`[${this.elementPrefix}="${name}"]`);
  }
  getData(name, el) {
    const searchElement = el ? el : this.el;
    return searchElement.getAttribute(this.dataPrefix + name);
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
  on(module, event, callback, key) {
    this.eventListeners.push({
      module,
      event,
      callback,
      key
    });
  }
  init() {
  }
  cleanup() {
  }
  call(moduleName, method, params = [], key) {
    const modules = this.app.getModulesByName(moduleName, key);
    const results = [];
    modules.forEach(({ module }) => {
      if (module.el === this.el && module.name === this.name)
        return;
      const moduleMethod = module[method];
      if (typeof moduleMethod !== "function") {
        return console.error(`Failed to call non-existent method "${method}" on module "${module.name}"`);
      }
      if (params !== null && params.constructor !== Array) {
        params = [params];
      }
      results.push(moduleMethod.apply(module, params));
    });
    return results.length === 1 ? results[0] : results;
  }
  getSelector(name) {
    return `[${this.elementPrefix}="${name}"]`;
  }
}
class App {
  constructor(options) {
    var _a;
    this.storage = [];
    this.prefix = "data-module-";
    this.modulesReady = null;
    this.initialModules = {};
    this.initialModules = (_a = options.initialModules) != null ? _a : {};
    this.importMethod = options.importMethod;
    if (typeof options.importMethod !== "function") {
      console.error('Modu.App() is missing an "importMethod" option which is used to determine how to import modules.');
    }
  }
  init(containerEl = document) {
    if (!containerEl)
      return console.warn("Modu.App.init() was passed an invalid container element.");
    const elements = this.getModuleElements(containerEl);
    this.initModulesForElements(elements);
  }
  destroy() {
    this.destroyModules();
  }
  destroyModules(containerEl = document) {
    if (!containerEl)
      return console.warn("Modu.App.destroyModules() was passed an invalid container element.");
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
        if (matchingModuleToDestroy.module.cleanup)
          matchingModuleToDestroy.module.cleanup();
        this.storage.splice(idx, 1);
      }
    }
  }
  initModules(element) {
    const readyPromises = [];
    const names = this.getModuleNamesFromElement(element);
    names.forEach(({ name, key }) => {
      const existingModules = this.getModulesForElement(element, name);
      if (existingModules.length) {
        readyPromises.push(new Promise((res) => res()));
        return;
      }
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
  addModule(ImportedModule, details) {
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
    if (module.init)
      module.init();
    return module;
  }
  getModuleNamesFromElement(element) {
    const results = [];
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
  getModulesForElement(element, name) {
    return this.storage.filter((module) => {
      const isSameElement = module.el === element;
      const isSameName = name ? module.name === name : true;
      return isSameElement && isSameName;
    });
  }
  getModulesByName(name, key) {
    return this.storage.filter((mod) => {
      const isSameName = toKebabCase(name) === toKebabCase(mod.name);
      const isSameKey = key ? mod.key === key : true;
      return isSameName && isSameKey;
    });
  }
}
export {
  App,
  Modu,
  toKebabCase,
  toPascalCase
};
