var path = require('path')
var main = require('./dist/main')

var Service = main.Service
var config = main.config

new Service(
	Object.assign(config, {
		port: 8081,
		dir: path.resolve(process.cwd(), 'public'),
		writable: true,
	})
).startService()
