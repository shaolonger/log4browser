/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
    captureJsError: true, // 是否监控js运行时异常
    captureResourceError: true, // 是否监控资源加载异常
    captureAjaxError: true, // 是否监控ajax异常
    captureConsoleError: false, // 是否监控控制台异常
    autoReport: true, // 是否自动上报异常日志
};

module.exports = {
    DEFAULT_CONFIG
};