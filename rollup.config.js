// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/log4browser.js',
        format: 'umd',
        name: 'Log4Browser'
    },
    plugins: [
        resolve(),
        babel({
            babelHelpers: 'bundled'
        }),
        commonjs()
    ]
};