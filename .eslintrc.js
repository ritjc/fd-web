module.exports = {
	root: true,
	env: {
		commonjs: true,
		es6: true,
		node: true,
	},
	parserOptions: {
		ecmaVersion: 9,
		sourceType: 'module',
	},
	extends: ['eslint:recommended'],
	rules: {
		semi: ['error', 'never'],
		'no-console': 'off',
		'require-atomic-updates': 'off',
	},
}
