/* eslint-disable no-useless-escape */
import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'

function getFileSuffix(filename) {
	let suffix = filename.split('.').pop()
	return suffix === filename ? '' : suffix
}

function getFileName(filename) {
	let arr = filename.split('.')
	arr.pop()
	return arr.join('.')
}

/**
 *
 * Get the list of files under the path
 *
 * @param {string} filePath - file path
 * @returns {Array} - list of files under this path
 */
function getFileList(filePath) {
	let targetList = []
	let files = []
	try {
		files = fs.readdirSync(path.resolve(filePath), {
			withFileTypes: true,
		})
	} catch (e) {
		files = []
	}
	for (const file of files) {
		if (file.isFile()) {
			targetList.push(file.name)
		}
	}
	return targetList
}

function getRegMatchedFileList(filePath, reg) {
	let files = getFileList(filePath)
	return files.filter((file) => {
		return reg.test(file)
	})
}

function getMatchedFileNextnum(filePath, reg, findNumIndex) {
	let list = getRegMatchedFileList(filePath, reg)
	let n = 0
	if (list.length > 0) {
		for (let i of list) {
			const im = i.match(reg)
			if (im) {
				let m = +im[findNumIndex]
				if (m >= n) n = m
			}
		}
	}
	return list.length === 0 ? 0 : n + 1
}

/**
 *
 * If a file with the same name already exists, generate a new file name and return
 *
 * @param {string} cwd
 * @param {string} pathname
 * @param {string} fileName
 * @returns {string} - latest file name
 */
const getLastUploadFilePath = (cwd, pathname, fileName) => {
	let dest = path.join(cwd, pathname, fileName)
	if (fs.existsSync(dest)) {
		let num = getMatchedFileNextnum(
			path.join(cwd, pathname),
			new RegExp(
				`${getFileName(fileName)}` +
					`(（(\\d\+)）)\?` +
					`.${getFileSuffix(fileName)}`
			),
			2
		)
		if (num !== 0) {
			dest = path.join(
				cwd,
				pathname,
				`${getFileName(fileName)}` +
					`（${num}）.${getFileSuffix(fileName)}`
			)
		}
	}
	return dest
}

/**
 *
 * Get the hash value of the file content
 *
 * @param {string} filePath - file path
 * @returns {string} - hash value
 */
const getFileHash = function (filePath) {
	const buffer = fs.readFileSync(filePath)
	const hash = crypto.createHash('sha256')
	hash.update(buffer)
	return hash.digest('hex')
}

export {
	getFileSuffix,
	getFileName,
	getMatchedFileNextnum,
	getLastUploadFilePath,
	getFileHash,
}
