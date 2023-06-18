/* eslint-disable no-unused-vars */
/* eslint-disable no-useless-escape */
import path from 'path'
import fs from 'fs-extra'
import koaRouter from 'koa-router'
import { getLastUploadFilePath, getFileHash } from '../util/fileHandle.js'
import sleep from '../util/sleep.js'
import { streamReadAndWriteHandle } from '../util/streamHandle.js'
import { tempDir, fileNameReg } from '../config'
const { koaBody } = require('koa-body')
const router = new koaRouter()

router.post(
	'/__file__/create-folder',
	koaBody({ parsedMethods: ['POST'] }),
	async (ctx, next) => {
		await next()
		const { pathname, folderName } = ctx.request.body
		if (!folderName || !pathname || !fileNameReg.test(folderName)) {
			ctx.status = 400
		}
		const { dir, writable } = ctx.$option

		if (!writable) {
			ctx.status = 403
			return
		}

		try {
			const tartPath = path.join(
				dir,
				decodeURIComponent(pathname),
				folderName
			)

			if (!fs.existsSync(tartPath)) {
				fs.ensureDirSync(tartPath)
				ctx.status = 200
			} else {
				ctx.status = 400
			}
		} catch (err) {
			ctx.status = 500
		}
	}
)

router.put(
	'/__file__/rename',
	koaBody({ parsedMethods: ['PUT'] }),
	async (ctx, next) => {
		await next()

		const { dir, writable } = ctx.$option

		if (!writable) {
			ctx.status = 403
			return
		}

		const { pathname, newFileName, fileName } = ctx.request.body
		if (
			!fileName ||
			!pathname ||
			!newFileName ||
			newFileName === fileName ||
			!fileNameReg.test(newFileName)
		) {
			ctx.status = 400
		}
		try {
			const oldFilePath = path.join(
				dir,
				decodeURIComponent(pathname),
				fileName
			)
			const newFilePath = path.join(
				dir,
				decodeURIComponent(pathname),
				newFileName
			)
			if (fs.existsSync(oldFilePath) && !fs.existsSync(newFileName)) {
				fs.renameSync(oldFilePath, newFilePath)
				ctx.status = 200
			} else {
				ctx.status = 400
			}
		} catch (err) {
			ctx.status = 500
		}
	}
)

router.delete(
	'/__file__/delete',
	koaBody({ parsedMethods: ['DELETE'] }),
	async (ctx, next) => {
		await next()

		const { dir, writable } = ctx.$option

		if (!writable) {
			ctx.status = 403
			return
		}

		const { pathname, fileName } = ctx.request.body
		if (!fileName || !pathname) {
			ctx.status = 400
		}
		try {
			const targetPath = path.join(
				dir,
				decodeURIComponent(pathname),
				fileName
			)
			if (fs.existsSync(targetPath)) {
				fs.removeSync(targetPath)
				ctx.status = 200
			} else {
				ctx.status = 400
			}
		} catch (err) {
			console.error(err)
			ctx.status = 500
		}
	}
)

router.post(
	'/__file__/upload/file',
	koaBody({
		multipart: true,
		formidable: {
			keepExtensions: true,
		},
	}),
	async (ctx, next) => {
		await next()
		const { dir, writable } = ctx.$option

		if (!writable) {
			ctx.status = 403
			return
		}
		const { pathname, fileHash, md5 } = ctx.request.body
		const file = ctx.request.files.file
		let tempDest = path.resolve(tempDir, md5)
		let dest = ''
		try {
			fs.ensureFileSync(tempDest)
			await streamReadAndWriteHandle(file.filepath, tempDest)
			if (fileHash) {
				if (getFileHash(tempDest) !== fileHash) {
					throw new Error('File hash value verification failed！')
				}
			}
			await fs.move(
				tempDest,
				(dest = getLastUploadFilePath(
					dir,
					decodeURIComponent(pathname),
					file.originalFilename
				))
			)
			ctx.status = 200
		} catch (err) {
			console.error(err)
			dest && fs.removeSync(dest)
			ctx.status = 500
		}
	}
)

router.post(
	'/__file__/upload/large-file',
	koaBody({
		multipart: true,
		formidable: {
			keepExtensions: true,
		},
	}),
	async (ctx, next) => {
		await next()
		const { dir, writable } = ctx.$option

		if (!writable) {
			ctx.status = 403
			return
		}
		const params = ctx.request.body
		const file = ctx.request.files.file

		const {
			isFirstReq,
			isEndReq,
			pathname,
			fileName,
			startIndex,
			fileHash,
			md5,
		} = params

		let tempDest = path.resolve(tempDir, md5)
		let dest = ''

		if (isFirstReq) {
			fs.ensureFileSync(tempDest)
		}
		try {
			await streamReadAndWriteHandle(
				file.filepath,
				tempDest,
				Number(startIndex)
			)
			if (isEndReq && fileHash) {
				if (fileHash !== getFileHash(tempDest)) {
					throw new Error('File hash value verification failed！')
				}

				await fs.move(
					tempDest,
					(dest = getLastUploadFilePath(
						dir,
						decodeURIComponent(pathname),
						fileName
					))
				)
			}
			await sleep(10)
			ctx.status = 200
		} catch (err) {
			console.error(err)
			if (isFirstReq || isEndReq) {
				dest && fs.removeSync(dest)
			}
			ctx.status = 500
		}
	}
)

export default router
