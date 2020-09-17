// rollup.config.js
export default {
    input: 'src/index.js',
    output: {
        file: 'dist/log4browser.js',
        format: 'umd',
        name: 'Log4Browser'
    }
};