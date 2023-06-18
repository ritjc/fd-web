import Koa from 'koa'
import koaEjs from 'koa-ejs'
import fs from 'fs-extra'
import koaStatic2 from 'koa-static2'
import logger from '@/util/logger'
import router from '@/service/router.js'
import config from '@/config/index.js'
import { getNetworkIp } from '@/util/network.js'
import { tempDir } from '../config'
import { deployViewsPath } from '@/config/index.js'
import { commonGetReqHandle } from '@/service/middleware.js'

/**
 * This is a class for the startup service
 */
export default class Service {
	constructor(option) {
		this.option = Object.assign({}, config, option)
	}

	startService() {
		const { port } = this.option
		logger.info('Configuration: ', this.option, '\r\n')
		try {
			const app = new Koa()
			koaEjs(app, {
				root: deployViewsPath,
				layout: false,
				viewExt: 'html',
				cache: false,
			})
			app.use(koaStatic2('__static__', deployViewsPath + '/public'))
			app.use(async (ctx, next) => {
				ctx.$option = this.option
				await next()
			})
			app.use(router.routes()).use(router.allowedMethods())
			app.use(commonGetReqHandle)
			app.on('error', (err /* , ctx */) => {
				logger.error(`server error:\r\n ${err}`)
			})
			app.listen(port, () => {
				logger.info(`Server Running , Access the server via: `)
				logger.info(` - Local: http://localhost:${port}`)
				logger.info(` - Local: http://127.0.0.1:${port}`)
				let lanIp = getNetworkIp()
				if (lanIp) {
					logger.info(` - Network: http://${lanIp}:${port}`)
				}
			})
		} catch (err) {
			logger.error(err)
		}

		process.on('SIGINT', function () {
			fs.removeSync(tempDir)
			process.exit()
		})
	}
}
