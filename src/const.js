/**
 * Error levels
 */
const ERROR_LEVEL = {
    'INFO': 'info',
    'WARN': 'warn',
    'ERROR': 'error'
};

/**
 * Error categories
 */
const ERROR_CATEGORY = {
    'JS': 'JS_ERROR',
    'RESOURCE': 'RESOURCE_LOAD_ERROR',
    'AJAX': 'HTTP_ERROR',
    'CUSTOM': 'CUSTOM_ERROR',
};

module.exports = {
    ERROR_LEVEL,
    ERROR_CATEGORY
};