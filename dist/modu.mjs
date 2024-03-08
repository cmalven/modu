var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
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
  // Necessary because module could have any method that is accessed via `.call()`
  constructor(options) {
    __publicField(this, "name");
    __publicField(this, "key");
    __publicField(this, "el");
    __publicField(this, "elementPrefix");
    __publicField(this, "dataPrefix");
    __publicField(this, "app");
    __publicField(this, "eventListeners", []);
    this.name = options.name;
    this.el = options.el;
    this.app = options.app;
    this.key = options.key;
    this.elementPrefix = "data-" + options.name;
    this.dataPrefix = "data-" + options.name + "-";
  }
  /**
   * Returns the first child element of the module that matches the passed name
   * @param {string} name
   * @returns {HTMLElement | null}
   */
  get(name) {
    return this.el.querySelector(`[${this.elementPrefix}="${name}"]`);
  }
  /**
   * Returns all child elements of the module that match the passed name
   * @param {string} name
   * @returns {NodeListOf<ElementTagNameMap[string]> | NodeListOf<Element> | NodeListOf<SVGElementTagNameMap[string]>}
   */
  getAll(name) {
    return this.el.querySelectorAll(`[${this.elementPrefix}="${name}"]`);
  }
  /**
   * Retrieve the value of a data attribute stored on the modules element
   * @param {string} name      The name identifier for the value to get
   * @param {Element} el   An optional child element to get the value on
   * @returns {string}
   */
  getData(name, el) {
    const searchElement = el ? el : this.el;
    const value = searchElement.getAttribute(this.dataPrefix + name);
    return Modu.convertStringValue(value);
  }
  /**
   * Broadcast an event that can be listened for by other modules using `.on()`
   * @param {string} event         The name of the event
   * @param {any} data             Any data to associate, will be passed to the callback of `.on()`
   */
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
  /**
   * Add a listener for events fired in another module using `.emit()`
   * @param {string} module        The pascal-cased name of the module to listen to
   * @param {string} event         The name of the event to listen for
   * @param {function} callback    The callback function to fire when the event is heard. Will receive any event data as the first and only parameter.
   * @param {string} key           An optional key to scope events to
   */
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
  /**
   * Calls a method on another module
   * @param {string} moduleName                      The PascalCase name of the module to call
   * @param {string} method                          The name of the method to call
   * @param {Object | string | number} params        Optional parameters to pass to the method. If an array is passed, each item in the array will be passed as a separate parameter. To pass an array as the only parameter, wrap it in double brackets, e.g. [[1, 2]]
   * @param {string} key                             An optional key to scope the module to
   */
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
      if (params !== null && !Array.isArray(params)) {
        params = [params];
      }
      results.push(moduleMethod.apply(module, params));
    });
    return results.length === 1 ? results[0] : results;
  }
  /**
   * Returns a DOM selector for an element name contained within the module.
   * @param {string} name
   * @returns {string}
   */
  getSelector(name) {
    return `[${this.elementPrefix}="${name}"]`;
  }
  /** @private */
  static convertStringValue(value) {
    if (value === null || value === "") {
      return null;
    }
    if (value && value.toLowerCase() === "true") {
      return true;
    }
    if (value && value.toLowerCase() === "false") {
      return false;
    }
    if (value && !isNaN(Number(value)) && value !== "") {
      return Number(value);
    }
    return value;
  }
}
class App {
  constructor(options) {
    __publicField(this, "storage", []);
    __publicField(this, "prefix", "data-module-");
    __publicField(this, "modulesReady", null);
    __publicField(this, "initialModules", {});
    __publicField(this, "importMethod");
    var _a;
    this.initialModules = (_a = options.initialModules) != null ? _a : {};
    this.importMethod = options.importMethod;
    if (typeof options.importMethod !== "function") {
      console.error('Modu.App() is missing an "importMethod" option which is used to determine how to import modules.');
    }
  }
  /**
   * Initializes all modules that have a DOM element in the passed-in container
   * @param {Element} containerEl    The HTML element to initialize modules within
   */
  init(containerEl = document) {
    if (!containerEl)
      return console.warn("Modu.App.init() was passed an invalid container element.");
    const elements = this.getModuleElements(containerEl);
    this.initModulesForElements(elements);
  }
  /**
   * Destroy the app and all modules
   */
  destroy() {
    this.destroyModules();
  }
  /**
   * Destroys all modules that have a DOM element in the passed-in container
   * @param {Element} containerEl    The HTML element to destroy modules within
   */
  destroyModules(containerEl = document) {
    if (!containerEl)
      return console.warn("Modu.App.destroyModules() was passed an invalid container element.");
    const elements = this.getModuleElements(containerEl);
    this.destroyModulesForElements(elements);
  }
  /** @private */
  getModuleElements(containerEl = document) {
    const allElements = containerEl.querySelectorAll("*");
    return Array.from(allElements).filter((el) => {
      const names = this.getModuleNamesFromElement(el);
      if (!names.length)
        return false;
      return true;
    });
  }
  /** @private */
  initModulesForElements(elements) {
    const modulePromises = elements.map((el) => {
      return this.initModules(el);
    });
    this.modulesReady = Promise.allSettled(modulePromises);
  }
  /** @private */
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
  /** @private */
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
  /** @private */
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
  /** @private */
  getModuleNamesFromElement(element) {
    const results = [];
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.startsWith(this.prefix)) {
        results.push({
          name: attr.name.replace(this.prefix, ""),
          key: attr.value.length ? attr.value : void 0
        });
      }
    });
    return results;
  }
  /** @private */
  getModulesForElement(element, name) {
    return this.storage.filter((module) => {
      const isSameElement = module.el === element;
      const isSameName = name ? module.name === name : true;
      return isSameElement && isSameName;
    });
  }
  /** @private */
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
