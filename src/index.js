const CONST = require('./const');
const CONFIG = require('./config');

class Logger {
    constructor() {}

    /**
     * The init method
     * @param config
     */
    init(config) {
        this.config = Object.assign({}, CONFIG.DEFAULT_CONFIG, config);
        if (this.config.captureJsError) {
            this.handleJsError(this.config);
            this.handlePromiseRejectError(this.config);
        }
        if (this.config.captureResourceError) {
            this.handleResourceError(this.config);
        }
        if (this.config.captureAjaxError) {
            this.handleAjaxError(this.config);
        }
        if (this.config.captureConsoleError) {
            this.handleConsoleError(this.config);
        }
    }

    /**
     * Handle JS errors
     * @param config
     */
    handleJsError(config) {
        window.onerror = function (msg, url, line, col, error) {
            if (error && error.stack) {
                config.isAutoHandle && config.errorHandler({
                    title: msg,
                    msg: error.stack,
                    category: CONST.ERROR_CATEGORY.JS,
                    level: CONST.ERROR_LEVEL.ERROR
                });
            } else if (typeof msg === 'string') {
                config.isAutoHandle && config.errorHandler({
                    title: msg,
                    msg: JSON.stringify({
                        resourceUrl: url,
                        rowNum: line,
                        colNum: col
                    }),
                    category: CONST.ERROR_CATEGORY.JS,
                    level: CONST.ERROR_LEVEL.ERROR
                });
            }
        };
    }

    /**
     * Handle Promise errors
     * @param config
     */
    handlePromiseRejectError(config) {
        window.addEventListener('unhandledrejection', function (event) {
            if (event) {
                config.isAutoHandle && config.errorHandler({
                    title: 'unhandledrejection',
                    msg: event.reason,
                    category: CONST.ERROR_CATEGORY.JS,
                    level: CONST.ERROR_LEVEL.ERROR
                });
            }
        }, true);
    }

    /**
     * Handle Resource errors
     * @param config
     */
    handleResourceError(config) {
        window.addEventListener('error', function (event) {
            if (event) {
                let target = event.target || event.srcElement;
                let isElementTarget = target instanceof HTMLScriptElement || target instanceof HTMLLinkElement || target instanceof HTMLImageElement;
                if (!isElementTarget) return; // JS errors has been captured by handleJsError method
                config.isAutoHandle && config.errorHandler({
                    title: target.nodeName,
                    msg: target.src || target.href,
                    category: CONST.ERROR_CATEGORY.RESOURCE,
                    level: CONST.ERROR_LEVEL.ERROR
                });
            }
        }, true);
    }

    /**
     * Handle Ajax errors
     * @param config
     */
    handleAjaxError(config) {
        // fetch
        if (window.fetch) {
            let oldFetch = window.fetch;
            window.fetch = function () {
                return oldFetch.apply(this, arguments)
                    .then(res => {
                        if (!res.ok) {
                            config.isAutoHandle && config.errorHandler({
                                title: arguments[0],
                                msg: JSON.stringify(res),
                                category: CONST.ERROR_CATEGORY.AJAX,
                                level: CONST.ERROR_LEVEL.ERROR
                            });
                        }
                        return res;
                    })
                    .catch(error => {
                        config.isAutoHandle && config.errorHandler({
                            title: arguments[0],
                            msg: JSON.stringify({
                                message: error.message,
                                stack: error.stack
                            }),
                            category: CONST.ERROR_CATEGORY.AJAX,
                            level: CONST.ERROR_LEVEL.ERROR
                        });
                        throw error;
                    })
            }
        }
        // XMLHttpRequest
        if (window.XMLHttpRequest) {
            let xmlhttp = window.XMLHttpRequest;
            let oldSend = xmlhttp.prototype.send;
            let handleEvent = function (event) {
                if (event && event.currentTarget && event.currentTarget.status !== 200) {
                    config.isAutoHandle && config.errorHandler({
                        title: event.target.responseURL,
                        msg: JSON.stringify({
                            response: event.target.response,
                            responseURL: event.target.responseURL,
                            status: event.target.status,
                            statusText: event.target.statusText
                        }),
                        category: CONST.ERROR_CATEGORY.AJAX,
                        level: CONST.ERROR_LEVEL.ERROR
                    });
                }
            }
            xmlhttp.prototype.send = function () {
                if (this['addEventListener']) {
                    this['addEventListener']('error', handleEvent);
                    this['addEventListener']('load', handleEvent);
                    this['addEventListener']('abort', handleEvent);
                } else {
                    let oldStateChange = this['onreadystatechange'];
                    this['onreadystatechange'] = function (event) {
                        if (this.readyState === 4) {
                            handleEvent(event);
                        }
                        oldStateChange && oldStateChange.apply(this, arguments);
                    };
                }
                return oldSend.apply(this, arguments);
            }
        }
    }

    /**
     * Handle console errors
     * @param config
     */
    handleConsoleError(config) {
        if (!window.console || !window.console.error) return;
        let oldConsoleError = window.console.error;
        window.console.error = function () {
            config.isAutoHandle && config.errorHandler({
                title: 'consoleError',
                msg: JSON.stringify(arguments.join(',')),
                category: CONST.ERROR_CATEGORY.JS,
                level: CONST.ERROR_LEVEL.ERROR
            });
            oldConsoleError && oldConsoleError.apply(window, arguments);
        };
    }

    /**
     * Switch isAutoHandle
     * @param isAutoHandle
     */
    setIsAutoHandle(isAutoHandle) {
        this.config.isAutoHandle = !!isAutoHandle;
    }
};

module.exports = Logger;