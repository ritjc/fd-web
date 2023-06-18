import path from 'path'
import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import eslint from '@rollup/plugin-eslint'
import replace from '@rollup/plugin-replace'
import alias from '@rollup/plugin-alias'
import builtins from 'builtin-modules'
import copy from 'rollup-plugin-copy'
import { terser } from 'rollup-plugin-terser'

const isWatch = process.env.ROLLUP_WATCH

export default {
	input: 'src/main.js',
	output: {
		file: 'dist/main.js',
		format: 'cjs',
	},
	external: builtins,
	plugins: [
		copy({
			targets: [
				{
					src: 'src/views/*',
					dest: 'dist/views',
				},
			],
		}),
		resolve({
			preferBuiltins: true,
		}),
		alias({
			entries: [
				{
					find: '@',
					replacement: path.resolve(__dirname, './src'),
				},
			],
		}),
		json(),
		commonjs(),
		eslint({
			throwOnError: true,
			throwOnWarning: true,
			include: ['src/**'],
			exclude: ['node_modules/**'],
		}),
		babel({
			exclude: 'node_modules/**',
			babelHelpers: 'runtime',
		}),
		replace({
			include: 'src/main.js',
			exclude: 'node_modules/**',
			NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
			preventAssignment: true,
		}),
		!isWatch && terser(),
	],
}
