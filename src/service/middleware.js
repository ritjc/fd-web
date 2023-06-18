import path from 'path'
import fs from 'fs-extra'
import { FILE_TYPE_ENUM, TEMP_DIR_NAME } from '@/config/index.js'
import fileListSort from '@/util/fileListSort'

/**
 * This is a middleware that handles get requests
 */
export const commonGetReqHandle = async (ctx, next) => {
	await next()
	const reqPath = decodeURIComponent(ctx.path)
	const { sort_field, sort_order } = ctx.query
	if (reqPath.startsWith('/__static__')) return
	if (reqPath.startsWith('/__file__')) return
	const { dir, writable } = ctx.$option
	const fullPath = path.join(dir, reqPath)
	const dataList = []
	try {
		if (fs.existsSync(fullPath)) {
			const fsStat = fs.statSync(fullPath)
			if (fsStat.isFile()) {
				ctx.set(
					'Content-disposition',
					'attachment; filename=' + reqPath.split('/').pop()
				)
				ctx.body = fs.createReadStream(fullPath)
			} else {
				const dirList = fs.readdirSync(fullPath, {
					withFileTypes: true,
				})
				for (let fileDirent of dirList.filter(
					(item) =>
						(item.isDirectory() && item.name !== TEMP_DIR_NAME) ||
						item.isFile()
				)) {
					const stat = fs.statSync(
						path.resolve(fullPath, `./${fileDirent.name}`)
					)
					dataList.push({
						fileName: fileDirent.name,
						fileType: (() => {
							if (stat.isFile()) return FILE_TYPE_ENUM.FILE
							if (stat.isDirectory())
								return FILE_TYPE_ENUM.DIRECTORY
						})(),
						fileSize: stat.size,
						fileCreateTime: stat.birthtimeMs,
						fileUpdateTime: stat.mtimeMs,
					})
				}
				await ctx.render('index', {
					parentPath: (() => {
						let $path = reqPath.replace(/(^\/|\/$)/, '').split('/')
						$path.pop()
						return '/' + $path.join('/')
					})(),
					writable,
					dataList: !dataList.length
						? dataList
						: sort_field && sort_order
						? fileListSort(dataList, sort_field, sort_order)
						: fileListSort(dataList, 'fileName', 'asc'),
				})
			}
		} else {
			ctx.status = 404
			return
		}
	} catch (err) {
		console.error(err)
		if (
			err &&
			err.message &&
			err.message.includes('operation not permitted')
		) {
			ctx.status = 403
		} else {
			ctx.status = 500
		}
	}
}
