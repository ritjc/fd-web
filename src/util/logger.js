import colors from 'colors'
import { isPlainObject } from 'lodash'

colors.setTheme({
	info: 'green',
	help: 'cyan',
	warn: 'yellow',
	debug: 'blue',
	error: 'red',
})

function genLog(type, args) {
	return colors[type](
		args
			.map((info) => (isPlainObject(info) ? JSON.stringify(info) : info))
			.join(' ')
	)
}

const logger = {
	log: console.log,
	info: function (...args) {
		this.log(genLog('info', args))
	},
	error: function (...args) {
		this.log(genLog('error', args))
	},
	warn: function (...args) {
		this.log(genLog('warn', args))
	},
	help: function (...args) {
		this.log(genLog('help', args))
	},
}

export default logger
