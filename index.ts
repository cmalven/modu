/**
 * Converts name of a module to kebab case
 * @param {string} name
 */
export const toKebabCase = (name: string): string => {
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
export const toPascalCase = (name: string): string => {
  return toKebabCase(name)
    .split('-')
    .map(word => {
      return word.slice(0, 1).toUpperCase() + word.slice(1);
    })
    .join('');
};

type ModuOptions = {
  name: string,
  key?: string,
  el: Element,
  app: App,
}

type ModuEventListener = {
  module: string,
  event: string,
  callback?: (data?: any) => void,
  key?: string,
}

interface ModuConstructable {
  new (options: ModuOptions): Modu;
}

type AppOptions = {
  importMethod: (module: {}) => {};
  initialModules?: {};
}

type StoredModu = {
  name: string;
  key?: string;
  el: Element;
  module: Modu
}

class Modu {
  name: string;
  key?: string;
  el: Element;
  elementPrefix: string;
  dataPrefix: string;
  app: App;
  eventListeners: ModuEventListener[];
  [methodKey: string]: any; // Necessary  to access arbitrary methods in `.call()`

  constructor(options: ModuOptions) {
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
  get(name: string): Element | null {
    return this.el.querySelector(`[${this.elementPrefix}="${name}"]`);
  }

  /**
   * Returns all child elements of the module that match the passed name
   * @param {string} name
   * @returns {NodeListOf<ElementTagNameMap[string]> | NodeListOf<Element> | NodeListOf<SVGElementTagNameMap[string]>}
   */
  getAll(name: string): NodeList {
    return this.el.querySelectorAll(`[${this.elementPrefix}="${name}"]`);
  }

  /**
   * Retrieve the value of a data attribute stored on the modules element
   * @param {string} name      The name identifier for the value to get
   * @param {Element} el   An optional child element to get the value on
   * @returns {string}
   */
  getData(name: string, el: Element = null) {
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
  emit(event: string, data: any) {
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
  on(module: string, event: string, callback: (arg?: any) => any, key: string | null = null) {
    this.eventListeners.push({
      module,
      event,
      callback,
      key,
    });
  }

  /**
   * Calls a method on another module
   * @param {string} moduleName                      The PascalCase name of the module to call
   * @param {string} method                          The name of the method to call
   * @param {Object | string | number} params        Optional parameters to pass to the method. If an array is passed, each item in the array will be passed as a separate parameter. To pass an array as the only parameter, wrap it in double brackets, e.g. [[1, 2]]
   * @param {string} key                             An optional key to scope the module to
   */
  call(moduleName: string, method: string, params: object | [] | string | number = null, key: string | null = null) {
    // Get all modules that match the name and key
    const modules = this.app.getModulesByName(moduleName, key);
    let results: any[] = [];

    // Call the method on each module
    modules.forEach(({ module }) => {
      // Module can't call a method on itself
      if (module.el === this.el && module.name === this.name) return;

      const moduleMethod = module[method];
      if (typeof moduleMethod !== 'function') {
        return console.error(`Failed to call non-existent method "${method}" on module "${module.name}"`);
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
  getSelector(name: string) {
    return `[${this.elementPrefix}="${name}"]`;
  }
}

class App {
  storage: StoredModu[] = [];
  prefix = 'data-module-';
  modulesReady: Promise<any[]> = null;
  initialModules: {[key: string]: ModuConstructable} = {};
  importMethod: (name: string) => Promise<any>;

  constructor(options: AppOptions) {
    const defaultOptions = {
      initialModules: {},
    };
    Object.assign(this, defaultOptions, options);

    // Error if no import method is set
    if (typeof options.importMethod !== 'function') {
      console.error('Modu.App() is missing an "importMethod" option which is used to determine how to import modules.');
    }
  }

  /**
   * Initializes all modules that have a DOM element in the passed container
   * @param {Element} containerEl    The HTML element to initialize modules within
   */
  init(containerEl: Element | Document = document) {
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
   * @param {Element} containerEl    The HTML element to destroy modules within
   */
  destroyModules(containerEl: Element | Document = document) {
    const elements = this.getModuleElements(containerEl);

    // Init modules for all elements
    this.destroyModulesForElements(elements);
  }

  getModuleElements(containerEl: Element | Document = document): Element[] {
    const allElements = containerEl.querySelectorAll('*');
    return Array.from(allElements).filter(el => {
      const names = this.getModuleNamesFromElement(el);

      // Move on if the element doesn't have a module name
      if (!names.length) return false;

      return true;
    });
  }

  initModulesForElements(elements: Element[]) {
    const modulePromises = elements.map(el => {
      return this.initModules(el);
    });

    this.modulesReady = Promise.allSettled(modulePromises);
  }

  destroyModulesForElements(elements: Element[]) {
    let modulesToDestroy: StoredModu[] = [];

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

  initModules(element: Element) {
    let readyPromises: void[] = [];

    // Get all names for the element
    const names = this.getModuleNamesFromElement(element);
    names.forEach(({ name, key }) => {
      // Look for an existing module already created for this element
      const existingModules = this.getModulesForElement(element, name);
      if (existingModules.length) return readyPromises.push(new Promise(res => res()));

      const promise = new Promise((res, rej) => {
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
      readyPromises.push(promise);
    });

    return Promise.all(readyPromises);
  };

  addModule(ImportedModule: ModuConstructable, details: {element: Element, name: string, key?: string }) {
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

  getModuleNamesFromElement(element: Element) {
    let results: { name: string, key?: string }[] = [];

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

  getModulesForElement(element: Element, name: string = null): StoredModu[] {
    return this.storage.filter(module => {
      const isSameElement = module.el === element;
      const isSameName = name ? module.name === name : true;
      return isSameElement && isSameName;
    });
  }

  getModulesByName(name: string, key: string = null): StoredModu[] {
    return this.storage.filter(mod => {
      const isSameName = toKebabCase(name) === toKebabCase(mod.name);
      const isSameKey = key ? mod.key === key : true;
      return isSameName && isSameKey;
    });
  }
}

export { Modu, App };