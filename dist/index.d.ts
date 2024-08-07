/**
 * @module
 *
 * Modu provides a simple system for working with DOM-based modules that is powerful and flexible.
 *
 * https://modu.malven.co
 *
 * ```ts
 * import { App } from '@malven/modu';
 *
 * const app = new App({
 *   importMethod: module => import(`./modules/${module}.js`),
 * });
 * app.init();
 * ```
 */
/**
 * Converts name of a module to kebab case
 * @param {string} name
 */
export declare const toKebabCase: (name: string) => string;
/**
 * Converts all casings of a module name to be consistent
 * @param {string} name
 */
export declare const toPascalCase: (name: string) => string;
export declare type ModuOptions = {
    name: string;
    key?: string;
    el: Element;
    app: App;
};
declare type CallbackData = unknown[] | unknown;
declare type ModuEventListener = {
    module: string;
    event: string;
    callback: (data?: CallbackData) => void;
    key?: string;
};
interface ModuConstructable {
    new (m: ModuOptions): Modu;
}
interface ImportedModuModule {
    default: ModuConstructable;
}
declare type AppInitialModules = {
    [key: string]: ModuConstructable;
};
declare type AppImportMethod = (name: string) => Promise<ImportedModuModule>;
declare type AppOptions = {
    importMethod: AppImportMethod;
    initialModules?: AppInitialModules;
};
declare type StoredModu = {
    name: string;
    key?: string;
    el: Element;
    module: Modu;
};
declare type ModuleNames = {
    name: string;
    key?: string;
}[];
declare class Modu {
    name: string;
    key?: string;
    el: Element;
    app: App;
    /** @ignore */
    elementPrefix: string;
    /** @ignore */
    dataPrefix: string;
    /** @ignore */
    eventListeners: ModuEventListener[];
    /** @ignore */
    [methodKey: string]: unknown;
    constructor(options: ModuOptions);
    /**
     * Returns the first child element of the module that matches the passed name
     * @param {string} name
     * @returns {HTMLElement | null}
     */
    get(name: string): Element | null;
    /**
     * Returns all child elements of the module that match the passed name
     * @param {string} name
     * @returns {NodeListOf<ElementTagNameMap[string]> | NodeListOf<Element> | NodeListOf<SVGElementTagNameMap[string]>}
     */
    getAll(name: string): NodeListOf<Element>;
    /**
     * Retrieve the value of a data attribute stored on the modules element
     * @param {string} name      The name identifier for the value to get
     * @param {Element} el   An optional child element to get the value on
     * @returns {string}
     */
    getData(name: string, el?: Element | null): string | number | boolean | null;
    /**
     * Broadcast an event that can be listened for by other modules using `.on()`
     * @param {string} event         The name of the event
     * @param {any} data             Any data to associate, will be passed to the callback of `.on()`
     */
    emit(event: string, data: CallbackData): void;
    /**
     * Add a listener for events fired in another module using `.emit()`
     * @param {string} module        The pascal-cased name of the module to listen to
     * @param {string} event         The name of the event to listen for
     * @param {function} callback    The callback function to fire when the event is heard. Will receive any event data as the first and only parameter.
     * @param {string} key           An optional key to scope events to
     */
    on(module: string, event: string, callback: (arg?: CallbackData) => CallbackData, key?: string): void;
    /**
     * Remove a listener for events fired in another module using `.emit()`
     * @param {string} module        The pascal-cased name of the module to listen to
     * @param {string} event         The name of the event to listen for
     * @param {function} callback    The callback function to fire when the event is heard. Will receive any event data as the first and only parameter.
     * @param {string} key           An optional key to scope events to
     */
    off(module: string, event: string, callback: (arg?: CallbackData) => CallbackData, key?: string): void;
    /**
     * Calls a method on another module
     * @param {string} moduleName                      The PascalCase name of the module to call
     * @param {string} method                          The name of the method to call
     * @param {Object | string | number} params        Optional parameters to pass to the method. If an array is passed, each item in the array will be passed as a separate parameter. To pass an array as the only parameter, wrap it in double brackets, e.g. [[1, 2]]
     * @param {string} key                             An optional key to scope the module to
     */
    call(moduleName: string, method: string, params?: CallbackData, key?: string): unknown;
    /**
     * Returns a DOM selector for an element name contained within the module.
     * @param {string} name
     * @returns {string}
     */
    getSelector(name: string): string;
    /**
     * Automatically called when the module is ready. Do not call directly.
     */
    init(): void;
    /**
     * Automatically called when the module is destroyed. Do not call directly.
     * Useful for tearing down event listeners, preventing memory leaks,
     * and any other cleanup that needs to happen when the module is no longer used.
     */
    cleanup(): void;
    /** @ignore */
    static convertStringValue(value: string | null): string | number | boolean | null;
}
declare class App {
    /** Prefix used to identify Modu modules in markup. Example: `<button data-module-button>Click Me</button>` */
    prefix: string;
    /** A promise that resolves when all modules on the page are ready to initialize. */
    modulesReady: Promise<unknown[]> | null;
    /** Any modules to automatically load with the initial bundle. All others will be imported dynamically. */
    initialModules: AppInitialModules;
    /** Method used for dynamic module imports. */
    importMethod: AppImportMethod;
    /** @ignore */
    storage: StoredModu[];
    constructor(options: AppOptions);
    /**
       * Initializes all modules that have a DOM element in the passed-in container
       * @param {Element} containerEl    The HTML element to initialize modules within
       */
    init(containerEl?: Element | Document | null): void;
    /**
       * Destroy the app and all modules
       */
    destroy(): void;
    /**
       * Destroys all modules that have a DOM element in the passed-in container
       * @param {Element} containerEl    The HTML element to destroy modules within
       */
    destroyModules(containerEl?: Element | Document | null): void;
    /** @ignore */
    getModuleElements(containerEl?: Element | Document): Element[];
    /** @ignore */
    initModulesForElements(elements: Element[]): void;
    /** @ignore */
    destroyModulesForElements(elements: Element[]): void;
    /** @ignore */
    initModules(element: Element): Promise<(void | Modu)[]>;
    /** @ignore */
    addModule(ImportedModule: ModuConstructable, details: {
        element: Element;
        name: string;
        key?: string;
    }): Modu;
    /** @ignore */
    getModuleNamesFromElement(element: Element): ModuleNames;
    /** @ignore */
    getModulesForElement(element: Element, name?: string): StoredModu[];
    /** @ignore */
    getModulesByName(name: string, key?: string): StoredModu[];
}
export { Modu, App };
