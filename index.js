/**
 * Converts name of a module to kebab case
 * @param {string} name
 */
export const toKebabCase = (name) => {
  return name
    .split('')
    .map((letter) => {
      if (/[A-Z]/.test(letter)) {
        return ` ${letter.toLowerCase()}`;
      }
      return letter;
    })
    .join('')
    .trim()
    .replace(/[_\s]+/g, '-');
};

/**
 * Converts all all casings of a module name to be consistent
 * @param {string} name
 */
export const toPascalCase = (name) => {
  return toKebabCase(name)
    .split('-')
    .map(word => {
      return word.slice(0, 1).toUpperCase() + word.slice(1);
    })
    .join('');
};

class Modu {
  constructor(options) {
    Object.assign(this, {
      ...options,
      eventListeners: [],
      elementPrefix: 'data-' + options.name,
      dataPrefix: 'data-' + options.name + '-',
    });
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
   * @returns {NodeListOf<HTMLElementTagNameMap[string]> | NodeListOf<Element> | NodeListOf<SVGElementTagNameMap[string]>}
   */
  getAll(name) {
    return this.el.querySelectorAll(`[${this.elementPrefix}="${name}"]`);
  }

  /**
   * Retrieve the value of a data attribute stored on the modules element
   * @param {string} name      The name identifier for the value to get
   * @param {HTMLElement} el   An optional child element to get the value on
   * @returns {string}
   */
  getData(name, el = null) {
    const searchElement = el ? el : this.el;
    return searchElement.getAttribute(this.dataPrefix + name);
  }

  init() {}

  /**
   * This should contain any cleanup code necessary when the module is removed.
   * It will be called automatically when certain `App` methods are called.
   */
  cleanup() {}

  /**
   * Broadcast an event that can be listened for by other modules using `.on()`
   * @param {string} event         The name of the event
   * @param {any} data             Any data to associate, will be passed to the callback of `.on()`
   */
  emit(event, data) {
    this.app.storage.forEach(({ module }) => {
      const allListeners = module.eventListeners;

      // Move on if no event listeners
      if (!allListeners.length) return;

      // If the module is the same as this one, ignore it
      if (module.name === this.name && module.el === this.el) return;

      // Find all matching listeners and fire callbacks
      allListeners.forEach(listener => {
        if (listener.module !== toPascalCase(this.name)) return;
        if (listener.event !== event) return;
        if (listener.key && listener.key !== this.key) return;

        // Fire the callback
        listener.callback(data);
      });
    });
  }

  /**
   * Add a listener for events fired in another module using `.emit()`
   * @param {string} module        The pascal-cased name of the module to listen to
   * @param {string} event         The name of the event to listen for
   * @param {function} callback    The callback function to fire when the even is heard. Will receive any event data as the first and only parameter.
   * @param {string} key         An optional key to scope events to
   */
  on(module, event, callback, key = null) {
    this.eventListeners.push({
      module,
      event,
      callback,
      key,
    });
  }

  /**
   * Calls a method on another module
   * @param {string} module                          The PascalCase name of the module to call
   * @param {string} method                          The name of the method to call
   * @param {Object | string | number} params        Optional parameters to pass to the method. If an array is passed, each item in the array will be passed as a separate parameter. To pass an array as the only parameter, wrap it in double brackets, e.g. [[1, 2]]
   * @param {string} key                             An optional key to scope the module to
   */
  call(module, method, params = null, key = null) {
    // Get all modules that match the name and key
    const modules = this.app.getModulesByName(module, key);
    let results = [];

    // Call the method on each module
    modules.forEach(({ module }) => {
      // Module can't call a method on itself
      if (module.el === this.el && module.name === this.name) return;

      const moduleMethod = module[method];
      if (typeof moduleMethod !== 'function') {
        return console.error(`Failed to call non-existant method "${method}" on module "${module}"`);
      }

      // Always pass params as an array
      if (params !== null && params.constructor !== Array) {
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
}

class App {
  constructor(options = {}) {
    const {
      importMethod,
      initialModules = {},
    } = options;

    this.storage = [];
    this.modulesReady = null;
    this.initialModules = initialModules;
    this.prefix = 'data-module-';

    // Error if no import method is set
    if (typeof importMethod !== 'function') {
      console.error('Modu.App() is missing an "importMethod" option which is used to determine how to import modules.');
    }

    this.importMethod = importMethod;
  }

  /**
   * Initializes all modules that have a DOM element in the passed container
   * @param {HTMLElement} containerEl    The HTML element to initialize modules within
   */
  init(containerEl = document) {
    const elements = this.getModuleElements(containerEl);

    // Init modules for all elements
    this.initModulesForElements(elements);
  }

  /**
   * Destroy the app and all modules
   */
  destroy() {
    this.destroyModules();
  }

  /**
   * Destroys all modules that have a DOM element in the passed container
   * @param {HTMLElement} containerEl    The HTML element to destroy modules within
   */
  destroyModules(containerEl = document) {
    const elements = this.getModuleElements(containerEl);

    // Init modules for all elements
    this.destroyModulesForElements(elements);
  }

  getModuleElements(containerEl = document) {
    const allElements = containerEl.querySelectorAll('*');
    return Array.from(allElements).filter(el => {
      const names = this.getModuleNamesFromElement(el);

      // Move on if the element doesn't have a module name
      if (!names.length) return false;

      return true;
    });
  }

  initModulesForElements(elements) {
    const modulePromises = elements.map(el => {
      return this.initModules(el);
    });

    this.modulesReady = Promise.allSettled(modulePromises);
  }

  destroyModulesForElements(elements) {
    let modulesToDestroy = [];

    // Find matching modules for elements
    elements.forEach(el => {
      const modules = this.getModulesForElement(el);
      modulesToDestroy = modulesToDestroy.concat(modules);
    });

    // Cleanup modules and remove from app storage
    let idx = this.storage.length;
    while (idx--) {
      const currentModule = this.storage[idx];
      const matchingModuleToDestroy = modulesToDestroy.find(mod => {
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

    // Get all names for the element
    const names = this.getModuleNamesFromElement(element);
    names.forEach(({ name, key }) => {
      return new Promise((res, rej) => {
        // Look for an existing module already created for this element
        const existingModules = this.getModulesForElement(element, name);
        if (existingModules.length) return readyPromises.push(res());

        // Get the name of the module
        const pascalName = toPascalCase(name);

        // If the module is available in out list of "initial" modules,
        // then it is already imported and can be initiated right now
        const InitialModule = this.initialModules[pascalName];
        if (InitialModule) {
          const module = this.addModule(InitialModule, { element, name, key });
          return res(module);
        }

        // Dynamically import the element
        this.importMethod(pascalName).then(Mod => {
          const module = this.addModule(Mod.default, { element, name, key });
          res(module);
        }).catch((error) => {
          console.log(error);
          rej();
        });
      });
    });

    return Promise.all(readyPromises);
  }

  addModule(ImportedModule, details = {}) {
    const {
      element,
      name,
      key,
    } = details;

    const module = new ImportedModule({
      el: element,
      app: this,
      name,
      key,
    });

    this.storage.push({
      el: element,
      name,
      module,
      key,
    });

    // Initiate the module
    module.init();

    // Return the added module
    return module;
  }

  getModuleNamesFromElement(element) {
    let results = [];

    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith(this.prefix)) {
        results.push({
          name: attr.name.replace(this.prefix, ''),
          key: attr.value,
        });
      }
    });

    return results;
  }

  getModulesForElement(element, name = null) {
    return this.storage.filter(module => {
      const isSameElement = module.el === element;
      const isSameName = name ? module.name === name : true;
      return isSameElement && isSameName;
    });
  }

  getModulesByName(name, key = null) {
    return this.storage.filter(mod => {
      const isSameName = toKebabCase(name) === toKebabCase(mod.name);
      const isSameKey = key ? mod.key === key : true;
      return isSameName && isSameKey;
    });
  }
}

export { Modu, App };