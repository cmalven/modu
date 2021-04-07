/**
 * Converts name of a module to kebab case
 * @param {string} name
 */
const toKebabCase = (name) => {
  const upper = /(?:(?<!\p{Uppercase_Letter})\p{Uppercase_Letter}|\p{Uppercase_Letter}(?!\p{Uppercase_Letter}))/gu;
  return name.replace(upper, '-$&').replace(/^-/, '').toLowerCase();
};

/**
 * Converts all all casings of a module name to be consistent
 * @param {string} name
 */
const toPascalCase = (name) => {
  return name.replace(/(\w)(\w*)/g,
    function(g0, g1, g2) { return g1.toUpperCase() + g2.toLowerCase(); });
};

class Modu {
  constructor(options) {
    this.name = options.name;
    this.elementPrefix = 'data-' + options.name;
    this.dataPrefix = 'data-' + options.name + '-';
    this.key = options.key;
    this.el = options.el;
    this.eventListeners = [];
    this.app = options.app;
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
   * @param {string} name
   * @returns {string}
   */
  getData(name) {
    return this.el.getAttribute(this.dataPrefix + name);
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
      if (module.el === this.el) return;

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
}

class App {
  constructor(options = {}) {
    const {
      moduleDir = './modules/',
    } = options;

    this.storage = [];
    this.prefix = 'data-module-';
    this.moduleDir = moduleDir;
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
      const { name, key } = this.getModuleNameFromElement(el);

      // Move on if the element doesn't have a module name
      if (!name) return false;

      // Move on if we already have this module initialized with the same key
      if (key) {
        if (this.getModulesByName(name, key).length) {
          console.warn(`A ${toPascalCase(name)} module with the key "${key}" already exists.`);
          return false;
        }
      }

      return true;
    });
  }

  initModulesForElements(elements) {
    elements.forEach(el => {
      this.initModule(el);
    });
  }

  destroyModulesForElements(elements) {
    let indexesToDestroy = [];

    elements.forEach((el, idx) => {
      const module = this.getModuleForElement(el);

      // Destroy the module
      module.module.destroy();

      // Add to the indexes to destroy
      indexesToDestroy.push(idx);
    });

    // Remove from list of app modules
    let idx = indexesToDestroy.length;
    while (idx--) {
      this.storage.splice(idx, 1);
    }
  }

  initModule(element) {
    // Dynamically import the element
    const { name, key } = this.getModuleNameFromElement(element);
    const pascalName = toPascalCase(name);
    const importPath = `${this.moduleDir}/${pascalName}.js`;
    import(/* @vite-ignore */ importPath).then(({ default: Mod }) => {
      // Foo can be used here with `new Foo()`
      const module = new Mod({
        el: element,
        app: this,
        name,
        key,
      });

      this.storage.push({
        module: module,
        el: element,
        key: key,
      });

      // Initiate the module
      module.init();
    }).catch(() => console.error(`An error occurred while loading the module "${pascalName}"`));
  }

  getModuleNameFromElement(element) {
    let result = { name: null, key: null };

    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith(this.prefix)) {
        result = { name: attr.name.replace(this.prefix, ''), key: attr.value };
      }
    });

    return result;
  }

  getModuleForElement(element) {
    return this.storage.find(module => {
      return module.el === element;
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