import * as UTILS from './utils';
import {
    DEFAULT_CONFIG
} from './config';
import {
    ERROR_LEVEL,
    ERROR_TYPE
} from './const';

const DEVICE_INFO = UTILS.getDeviceInfo();

const getLogBasicInfo = () => {
    const ipInfo = UTILS.getIpInfo();
    const basicInfo = {
        happenTime: UTILS.getCurrentTime(),
        deviceName: DEVICE_INFO.deviceName,
        os: DEVICE_INFO.os,
        osVersion: DEVICE_INFO.osVersion,
        browserName: DEVICE_INFO.browserName,
        browserVersion: DEVICE_INFO.browserVersion,
        netType: UTILS.getNetworkType(),
        ip_address: ipInfo.cip,
        address: ipInfo.cname
    };
    const locationInfo = UTILS.getLocationInfo();
    return {
        ...basicInfo,
        ...locationInfo
    };
};

const getErrorMessageAndStack = (projectIdentifier, errorType, errorMessage, errorStack) => {
    return Object.assign({}, getLogBasicInfo(), {
        projectIdentifier,
        logType: ERROR_TYPE.JS_ERROR,
        errorType,
        errorMessage,
        errorStack,
        level: ERROR_LEVEL.ERROR
    });
};

class Log4Browser {
    constructor() {
        UTILS.setIpInfo();
    }

    /**
     * The init method
     * @param config
     */
    init(config) {
        this.config = Object.assign({}, DEFAULT_CONFIG, config);
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
        window.onerror = (message, source, lineno, colno, error) => {
            let errorType = '';
            let errorMessage = '';
            let errorStack = '';
            if (error && error instanceof Error) {
                errorType = error.name || '';
                errorMessage = error.message || message || '';
                errorStack = error.stack || '';
            } else {
                errorType = 'Others';
                errorMessage = message || '';
                errorStack = '';
            }
            config.isAutoHandle && config.errorHandler(getErrorMessageAndStack(
                config.projectIdentifier, errorType, errorMessage, errorStack
            ));
        };
    }

    /**
     * Handle Promise errors
     * @param config
     */
    handlePromiseRejectError(config) {
        window.onunhandledrejection = event => {
            const errorType = 'UncaughtInPromiseError';
            let errorMessage = '';
            let errorStack = '';
            if (typeof event.reason === 'object') {
                errorMessage = event.reason.message;
                errorStack = event.reason.stack;
            } else {
                errorMessage = event.reason;
                errorStack = '';
            }
            config.isAutoHandle && config.errorHandler(getErrorMessageAndStack(
                config.projectIdentifier, errorType, errorMessage, errorStack
            ));
        }
    }

    /**
     * Handle Resource errors
     * @param config
     */
    handleResourceError(config) {
        window.addEventListener('error', event => {
            const target = event.target || event.srcElement;
            const isElementTarget = target instanceof HTMLScriptElement || target instanceof HTMLLinkElement || target instanceof HTMLImageElement;
            if (!isElementTarget) return; // JS errors has been captured by handleJsError method
            const typeName = event.target.localName;
            let resourceUrl = '';
            if (typeName === 'link') {
                resourceUrl = event.target.href;
            } else if (typeName === 'script') {
                resourceUrl = event.target.src;
            } else if (typeName === 'img') {
                resourceUrl = event.target.src;
            }
            config.isAutoHandle && config.errorHandler(Object.assign({}, getLogBasicInfo(), {
                projectIdentifier: config.projectIdentifier,
                logType: ERROR_TYPE.RESOURCE_LOAD_ERROR,
                resourceUrl,
                resourceType: typeName,
                status: '0',
                level: ERROR_LEVEL.ERROR
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
                                logType: ERROR_TYPE.HTTP_ERROR,
                                httpUrlComplete: arguments[0],
                                httpUrlShort: arguments[0],
                                status: res,
                                statusText: res,
                                level: ERROR_LEVEL.ERROR
                            }));
                        }
                        return res;
                    })
                    .catch(error => {
                        config.isAutoHandle && config.errorHandler(Object.assign({}, getLogBasicInfo(), {
                            projectIdentifier: config.projectIdentifier,
                            logType: ERROR_TYPE.HTTP_ERROR,
                            httpUrlComplete: arguments[0],
                            httpUrlShort: arguments[0],
                            status: error.message,
                            statusText: error.stack,
                            level: ERROR_LEVEL.ERROR
                        }));
                    })
            }
        }
        // XMLHttpRequest
        if (window.XMLHttpRequest) {
            let xmlhttp = window.XMLHttpRequest;
            let oldOpen = xmlhttp.prototype.open;
            let oldSend = xmlhttp.prototype.send;
            let handleEvent = function (event) {
                if (event && event.currentTarget && event.currentTarget.status !== 200) {
                    config.isAutoHandle && config.errorHandler(Object.assign({}, getLogBasicInfo(), {
                        projectIdentifier: config.projectIdentifier,
                        logType: ERROR_TYPE.HTTP_ERROR,
                        httpUrlComplete: event.target.responseURL || this._url,
                        httpUrlShort: event.target.response || this._url,
                        status: event.target.status,
                        statusText: event.target.statusText,
                        level: ERROR_LEVEL.ERROR
                    }));
                }
            }
            xmlhttp.prototype.open = function (mothod, url, ...args) {
                this._url = url;
                return oldOpen.apply(this, [mothod, url].concat(args));
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
                logType: ERROR_TYPE.CUSTOM_ERROR,
                errorType: ERROR_TYPE.CUSTOM_ERROR,
                errorMessage,
                errorStack
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

export default Log4Browser;