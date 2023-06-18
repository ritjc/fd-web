import { FILE_TYPE_ENUM } from '@/config/index.js'

function fieldSortByLetter(list, field, order) {
	const rs = list.sort(function (a, b) {
		var x = a[field].toLowerCase()
		var y = b[field].toLowerCase()
		if (x < y) return -1
		if (x > y) return 1
		return 0
	})
	return order === 'desc' ? rs.reverse() : rs
}

function fieldSortByNumber(list, field, order) {
	const rs = list.sort(function (a, b) {
		return a[field] - b[field]
	})
	return order === 'desc' ? rs.reverse() : rs
}

const fieldSortAdapter = {
	fileName: fieldSortByLetter,
	fileSize: fieldSortByNumber,
	fileCreateTime: fieldSortByNumber,
	fileUpdateTime: fieldSortByNumber,
}

/**
 *
 * Sort file list data
 *
 * @param {Array} list - list data
 * @param {string} field - sort field
 * @param {string} order - sort by (asc or desc)
 * @returns {Array} - sorted list data
 */
const fileListSort = (list, field, order) => {
	if (!Object.keys(fieldSortAdapter).includes(field)) {
		return list
	}
	const dirList = list.filter(
		(item) => item.fileType === FILE_TYPE_ENUM.DIRECTORY
	)
	const fileList = list.filter(
		(item) => item.fileType === FILE_TYPE_ENUM.FILE
	)
	const rsDirList = fieldSortAdapter[field](dirList, field, order)
	const rsFileList = fieldSortAdapter[field](fileList, field, order)

	return order === 'desc'
		? [...rsFileList, ...rsDirList]
		: [...rsDirList, ...rsFileList]
}

export default fileListSort
