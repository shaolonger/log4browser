const moment = require('moment');
const UTILS = require('./utils');
const CONST = require('./const');
const CONFIG = require('./config');
const DEVICE_INFO = UTILS.getDeviceInfo();

const getLogBasicInfo = () => {
    return {
        happenTime: moment().format('YYYY-MM-DD HH:mm:ss'),
        deviceName: DEVICE_INFO.deviceName,
        os: DEVICE_INFO.os,
        osVersion: DEVICE_INFO.osVersion,
        browserName: DEVICE_INFO.browserName,
        browserVersion: DEVICE_INFO.browserVersion
    };
};

const getErrorMessageAndStack = (projectIdentifier, originErrorMsg, originErrorStack) => {
    const errorMessage = originErrorMsg ? originErrorMsg : '';
    const errorStack = originErrorStack ? originErrorStack : '';
    let errorType = "";
    if (errorMessage) {
        if (typeof errorStack === 'string') {
            errorType = errorStack.split(": ")[0].replace('"', "");
        } else {
            const errorStackStr = JSON.stringify(errorStack)
            errorType = errorStackStr.split(": ")[0].replace('"', "");
        }
    }
    return Object.assign({}, getLogBasicInfo(), {
        projectIdentifier,
        logType: CONST.ERROR_TYPE.JS_ERROR,
        errorType,
        errorMessage,
        errorStack,
        level: CONST.ERROR_LEVEL.ERROR
    });
};

class Logger {
    constructor() {
    }

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
        window.onerror = function (originErrorMsg, source, lineno, colno, error) {
            const originErrorStack = error ? error.stack : null;
            config.isAutoHandle && config.errorHandler(getErrorMessageAndStack(
                config.projectIdentifier, originErrorMsg, originErrorStack
            ));
        };
    }

    /**
     * Handle Promise errors
     * @param config
     */
    handlePromiseRejectError(config) {
        window.onunhandledrejection = function (event) {
            let originErrorMsg = "";
            let originErrorStack = "";
            if (typeof event.reason === "object") {
                originErrorMsg = event.reason.message;
                originErrorStack = event.reason.stack;
            } else {
                originErrorMsg = event.reason;
                originErrorStack = "";
            }
            config.isAutoHandle && config.errorHandler(getErrorMessageAndStack(
                config.projectIdentifier, originErrorMsg, "UncaughtInPromiseError: " + originErrorStack
            ));
        }
    }

    /**
     * Handle Resource errors
     * @param config
     */
    handleResourceError(config) {
        window.addEventListener('error', function (event) {
            const target = event.target || event.srcElement;
            const isElementTarget = target instanceof HTMLScriptElement || target instanceof HTMLLinkElement || target instanceof HTMLImageElement;
            if (!isElementTarget) return; // JS errors has been captured by handleJsError method
            const typeName = event.target.localName;
            let resourceUrl = "";
            if (typeName === "link") {
                resourceUrl = event.target.href;
            } else if (typeName === "script") {
                resourceUrl = event.target.src;
            } else if (typeName === "img") {
                resourceUrl = event.target.src;
            }
            config.isAutoHandle && config.errorHandler(Object.assign({}, getLogBasicInfo(), {
                projectIdentifier: config.projectIdentifier,
                logType: CONST.ERROR_TYPE.RESOURCE_LOAD_ERROR,
                resourceUrl,
                resourceType: typeName,
                status: '0',
                level: CONST.ERROR_LEVEL.ERROR
            }));
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
                            config.isAutoHandle && config.errorHandler(Object.assign({}, getLogBasicInfo(), {
                                projectIdentifier: config.projectIdentifier,
                                logType: CONST.ERROR_TYPE.HTTP_ERROR,
                                httpUrlComplete: arguments[0],
                                httpUrlShort: arguments[0],
                                status: res,
                                statusText: res,
                                level: CONST.ERROR_LEVEL.ERROR
                            }));
                        }
                        return res;
                    })
                    .catch(error => {
                        config.isAutoHandle && config.errorHandler(Object.assign({}, getLogBasicInfo(), {
                            projectIdentifier: config.projectIdentifier,
                            logType: CONST.ERROR_TYPE.HTTP_ERROR,
                            httpUrlComplete: arguments[0],
                            httpUrlShort: arguments[0],
                            status: error.message,
                            statusText: error.stack,
                            level: CONST.ERROR_LEVEL.ERROR
                        }));
                    })
            }
        }
        // XMLHttpRequest
        if (window.XMLHttpRequest) {
            let xmlhttp = window.XMLHttpRequest;
            let oldSend = xmlhttp.prototype.send;
            let handleEvent = function (event) {
                if (event && event.currentTarget && event.currentTarget.status !== 200) {
                    config.isAutoHandle && config.errorHandler(Object.assign({}, getLogBasicInfo(), {
                        projectIdentifier: config.projectIdentifier,
                        logType: CONST.ERROR_TYPE.HTTP_ERROR,
                        httpUrlComplete: event.target.responseURL,
                        httpUrlShort: event.target.response,
                        status: event.target.status,
                        statusText: event.target.statusText,
                        level: CONST.ERROR_LEVEL.ERROR
                    }));
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
        const oldConsoleError = window.console.error;
        window.console.error = function (otherErrorMsg) {
            const errorMessage = (arguments[0] && arguments[0].message) || otherErrorMsg;
            const errorStack = arguments[0] && arguments[0].stack;
            config.isAutoHandle && config.errorHandler(Object.assign({}, getLogBasicInfo(), {
                projectIdentifier: config.projectIdentifier,
                logType: CONST.ERROR_TYPE.CUSTOM_ERROR,
                errorType: CONST.ERROR_TYPE.CUSTOM_ERROR,
                errorMessage, errorStack
            }));
            return oldConsoleError.apply(window.console, arguments);
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