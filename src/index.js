const CONST = require('./const');
const CONFIG = require('./config');

class Logger {
    constructor() {
        this.isSendError = true;
    }

    /**
     * 初始化
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
     * 处理js异常
     * @param config
     */
    handleJsError(config) {
        let self = this;
        window.onerror = function (msg, url, line, col, error) {
            if (error && error.stack) {
                self.isSendError && config.sendError({
                    title: msg,
                    msg: error.stack,
                    category: CONST.ERROR_CATEGORY.JS,
                    level: CONST.ERROR_LEVEL.ERROR
                });
            } else if (typeof msg === 'string') {
                self.isSendError && config.sendError({
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
     * 处理Promise异常
     * @param config
     */
    handlePromiseRejectError(config) {
        let self = this;
        window.addEventListener('unhandledrejection', function (event) {
            if (event) {
                self.isSendError && config.sendError({
                    title: 'unhandledrejection',
                    msg: event.reason,
                    category: CONST.ERROR_CATEGORY.JS,
                    level: CONST.ERROR_LEVEL.ERROR
                });
            }
        }, true);
    }

    /**
     * 处理资源加载异常
     * @param config
     */
    handleResourceError(config) {
        let self = this;
        window.addEventListener('error', function (event) {
            if (event) {
                let target = event.target || event.srcElement;
                let isElementTarget = target instanceof HTMLScriptElement || target instanceof HTMLLinkElement || target instanceof HTMLImageElement;
                if (!isElementTarget) return; // js错误已由handleJsError处理
                self.isSendError && config.sendError({
                    title: target.nodeName,
                    msg: target.src || target.href,
                    category: CONST.ERROR_CATEGORY.RESOURCE,
                    level: CONST.ERROR_LEVEL.ERROR
                });
            }
        }, true);
    }

    /**
     * 处理Ajax异常
     * @param config
     */
    handleAjaxError(config) {
        let self = this;
        // 处理fetch
        if (window.fetch) {
            let oldFetch = window.fetch;
            window.fetch = function () {
                return oldFetch.apply(this, arguments)
                    .then(res => {
                        if (!res.ok) {
                            self.isSendError && config.sendError({
                                title: arguments[0],
                                msg: JSON.stringify(res),
                                category: CONST.ERROR_CATEGORY.AJAX,
                                level: CONST.ERROR_LEVEL.ERROR
                            });
                        }
                        return res;
                    })
                    .catch(error => {
                        self.isSendError && config.sendError({
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
        // 处理XMLHttpRequest
        if (window.XMLHttpRequest) {
            let xmlhttp = window.XMLHttpRequest;
            let oldSend = xmlhttp.prototype.send;
            let handleEvent = function (event) {
                if (event && event.currentTarget && event.currentTarget.status !== 200) {
                    self.isSendError && config.sendError({
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
     * 处理控制台报错
     * @param config
     */
    handleConsoleError(config) {
        if (!window.console || !window.console.error) return;
        let self = this;
        let oldConsoleError = window.console.error;
        window.console.error = function () {
            self.isSendError && config.sendError({
                title: 'consoleError',
                msg: JSON.stringify(arguments.join(',')),
                category: CONST.ERROR_CATEGORY.JS,
                level: CONST.ERROR_LEVEL.ERROR
            });
            oldConsoleError && oldConsoleError.apply(window, arguments);
        };
    }

    /**
     * 开始异常处理
     */
    startSendError() {
        this.isSendError = true;
    }

    /**
     * 停止异常处理
     */
    stopSendError() {
        this.isSendError = false;
    }
};

module.exports = Logger;