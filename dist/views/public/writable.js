/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

const { promises } = require('fs-extra')

const LARGE_FILE_MIN_SIZE = 100 * 1024 * 1024 // As long as it is equal to or greater than this value, it is a large file
const FILE_SLICE_SIZE = 100 * 1024 * 1024 // Large file slice size
const IS_CHECK_HASH = true // Whether to verify the hash value of the uploaded file content

const fileNameReg =
	/^(?!.*\.\.)(?=[^/\\\:\*\?\x22\<\>\|]{1,255}$)(?!^[\.]+$)[^/\\\:\*\?\x22\<\>\|]*[^./\\\:\*\?\x22\<\>\|]$/

/**
 *
 * Use the worker process to get the hash value of the file content
 *
 * @param {Object} fileChunks - list of file slice objects
 * @returns {Promise}
 */
function getFileContentHash(fileChunks) {
	return new Promise(function (resolve, reject) {
		if (IS_CHECK_HASH) {
			if (typeof Worker !== 'undefined') {
				let worker = new Worker('/__static__/worker.hash.js')
				worker.postMessage(fileChunks)
				worker.onmessage = function (e) {
					worker.terminate()
					resolve(e.data)
				}
				worker.onerror = function (err) {
					worker.terminate()
					reject(err)
				}
			} else {
				getChunksHash(fileChunks).then(resolve).catch(reject)
			}
		} else {
			resolve()
		}
	})
}

/**
 *
 * @param {Object} chunk - file slice object
 * @returns {FormData}
 */
function chunkReqFormData(chunk) {
	const formData = new FormData()
	formData.append('file', chunk.chunk)
	formData.append('pathname', location.pathname)
	formData.append('fileName', chunk.fileName)
	formData.append('startIndex', chunk.startIndex)
	formData.append('timestamp', chunk.timestamp)
	formData.append('md5', md5(chunk.fileName + '-' + chunk.timestamp))
	return formData
}

function genReqHandle({ url, method, data, progressCb }) {
	return new Promise(function (resolve, reject) {
		$.ajax({
			type: method,
			url: url,
			data: data,
			cache: false,
			processData: false,
			contentType: false,
			xhr: function () {
				var xhr = $.ajaxSettings.xhr()
				if (
					progressCb &&
					typeof progressCb === 'function' &&
					xhr.upload
				) {
					xhr.upload.onprogress = function (e) {
						progressCb(parseInt((e.loaded / e.total) * 100))
					}
				}
				return xhr
			},
			success: resolve,
			error: reject,
		})
	})
}

function uploadFile(file, progressCb) {
	return new Promise(function (resolve, reject) {
		getFileContentHash([file.slice(0)])
			.then(function (hash) {
				let formData = new FormData()
				formData.append('file', file)
				formData.append('pathname', location.pathname)
				formData.append(
					'md5',
					md5(file.name + '-' + new Date().getTime())
				)
				hash && formData.append('fileHash', hash)

				genReqHandle({
					method: 'POST',
					url: '/__file__/upload/file',
					data: formData,
					progressCb,
				})
					.then(resolve)
					.catch(reject)
			})
			.catch(reject)
	})
}

function uploadLargeFile(file, progressCb) {
	const chunkSize = FILE_SLICE_SIZE
	const chunkList = []
	const { name, size } = file
	const timestamp = new Date().getTime()
	let offset = 0
	while (offset < size) {
		let end = offset + chunkSize
		if (end > size) {
			end = size
		}
		let fileChunk = file.slice(offset, end)
		chunkList.push({
			fileName: name,
			fileSize: size,
			startIndex: offset,
			endIndex: end,
			chunkSize,
			chunk: fileChunk,
			timestamp,
			chunkName: md5(name + '-' + offset + '-' + end + '-' + timestamp),
		})
		offset += chunkSize
	}
	const fileHashHandle = getFileContentHash(
		[].concat(chunkList).map(function (item) {
			return item.chunk
		})
	)
	let aveProVal = Math.floor(100 / chunkList.length)
	let currProVal = 0
	const startReqChunk = chunkList.shift()
	const endReqChunk = chunkList.pop()
	let allReqIsOk = true
	const errList = []
	return new Promise(function (rootResolve, rootReject) {
		new Promise(function (resolve, reject) {
			const maxReqNum = 5
			const reqStepNum = Math.ceil(chunkList.length / maxReqNum)
			let reqUnitList = (function () {
				const list = []
				for (let i = 0; i < reqStepNum; i++) {
					let startIndex = i !== 0 ? i * maxReqNum : 0
					let endIndex =
						startIndex + maxReqNum > chunkList.length - 1
							? startIndex + (chunkList.length - startIndex)
							: startIndex + maxReqNum
					list.push(chunkList.slice(startIndex, endIndex))
				}
				return list
			})()

			const request = function (reqUnitList) {
				let reqUnit = reqUnitList.shift()
				return new Promise(function (reso, reje) {
					if (!reqUnit) {
						reso()
					} else {
						Promise.all(
							reqUnit.map(function (chunkItem) {
								let formData = chunkReqFormData(chunkItem)
								return genReqHandle({
									url: '/__file__/upload/large-file',
									method: 'POST',
									data: formData,
								})
							})
						)
							.then(function () {
								currProVal += aveProVal
								progressCb(currProVal)

								if (reqUnitList.length === 0) {
									reso()
								} else {
									request(reqUnitList).then(reso).catch(reje)
								}
							})
							.catch(reje)
					}
				})
			}
			genReqHandle({
				url: '/__file__/upload/large-file',
				method: 'POST',
				data: (function () {
					let formData = chunkReqFormData(startReqChunk)
					formData.append('isFirstReq', 1)
					return formData
				})(),
			})
				.then(function () {
					currProVal += aveProVal
					progressCb(currProVal)

					request(reqUnitList)
						.then(function () {
							fileHashHandle
								.then(function (hash) {
									return genReqHandle({
										url: '/__file__/upload/large-file',
										method: 'POST',
										data: (function () {
											let formData =
												chunkReqFormData(endReqChunk)
											formData.append('isEndReq', 1)
											hash &&
												formData.append(
													'fileHash',
													hash
												)
											return formData
										})(),
									}).then(function () {
										progressCb(100)
									})
								})
								.then(resolve)
								.catch(reject)
						})
						.catch(reject)
				})
				.catch(reject)
		})
			.catch(function (err) {
				console.error(err)
				allReqIsOk = false
			})
			.finally(function () {
				if (!allReqIsOk) {
					rootReject(file)
				} else {
					rootResolve()
				}
			})
	})
}

function createDirectory() {
	const folderName = prompt('Directory Name')
	if (typeof folderName === 'string' && fileNameReg.test(folderName)) {
		$.ajax({
			type: 'POST',
			url: '/__file__/create-folder',
			data: { folderName, pathname: location.pathname },
			success: function () {
				location.reload()
			},
			error: function (err) {
				console.error(err)
				alert('Directory creation failed')
			},
		})
	} else {
		folderName && alert('Invalid directory name')
	}
}

function editFile(fileName) {
	const name = prompt('File Name', fileName)
	if (name == fileName) {
		alert('Please enter a different file name')
		return
	}
	if (typeof name === 'string' && fileNameReg.test(name)) {
		$.ajax({
			type: 'PUT',
			url: '/__file__/rename',
			data: { fileName, newFileName: name, pathname: location.pathname },
			success: function () {
				location.reload()
			},
			error: function (err) {
				console.error(err)
				alert('File name modification failed')
			},
		})
	} else {
		name && alert('Invalid file name')
	}
}

function deleteFile(fileName) {
	const qes = confirm(`Do you want to delete the file '${fileName}' ?`)
	if (qes != '0') {
		$.ajax({
			type: 'DELETE',
			url: '/__file__/delete',
			data: { fileName, pathname: location.pathname },
			success: function () {
				location.reload()
			},
			error: function (err) {
				console.error(err)
				alert('Delete failed !')
			},
		})
	}
}

function submit() {
	let files = $('#file')[0].files
	if (files.length > 0) {
		if (files.length === 1) {
			let file = files[0]
			if (file.size <= LARGE_FILE_MIN_SIZE) {
				// single file upload
				$('#upload-progress').show()
				uploadFile(file, function (proVal) {
					$('#upload-progress-percent').text(proVal)
				})
					.then(function () {
						setTimeout(function () {
							location.reload()
						}, 1500)
					})
					.catch(function (err) {
						console.error(err)
						setTimeout(function () {
							alert('Upload failed !')
							location.reload()
						}, 1500)
					})
			} else {
				// large file upload
				$('#upload-progress').show()
				uploadLargeFile(file, function (proVal) {
					$('#upload-progress-percent').text(proVal)
				})
					.then(function () {
						setTimeout(function () {
							location.reload()
						}, 1500)
					})
					.catch(function (err) {
						console.error(err)
						setTimeout(function () {
							alert('Upload failed !')
							location.reload()
						}, 1500)
					})
			}
		} else {
			// multiple file upload
			$('#upload-progress').show()
			let avgProVal = Math.floor(100 / files.length)
			let currProVal = 0
			const rs = {
				success: [],
				error: [],
			}
			Promise.all(
				Object.keys(files).map(function (key) {
					const file = files[key]
					if (file.size <= 100 * 1024 * 1024) {
						return uploadFile(file)
							.then(function () {
								$('#upload-progress-percent').text(
									(currProVal += avgProVal)
								)
								rs.success.push(file)
							})
							.catch(function () {
								rs.error.push(file)
							})
					} else {
						return uploadLargeFile(file, function (proVal) {
							$('#upload-progress-percent').text(
								currProVal +
									Math.floor(avgProVal * (proVal / 100))
							)
						})
							.then(function () {
								$('#upload-progress-percent').text(
									(currProVal += avgProVal)
								)
								rs.success.push(file)
							})
							.catch(function () {
								rs.error.push(file)
							})
					}
				})
			).finally(function () {
				if (
					rs.error.length === 0 &&
					rs.success.length === files.length
				) {
					setTimeout(function () {
						alert('Batch upload successful.')
						location.reload()
					}, 1500)
				} else {
					setTimeout(function () {
						alert(
							rs.error.reduce(function (str, file) {
								return (
									str +
									(str ? '\n' : '') +
									file.name +
									' - failed'
								)
							}, '') +
								'\r\n' +
								rs.success.reduce(function (str, file) {
									return (
										str +
										(str ? '\n' : '') +
										file.name +
										' - done'
									)
								}, '')
						)
						location.reload()
					}, 1500)
				}
			})
		}
	}
}

function initUploadEvent() {
	const fileDom = document.querySelector('#file')
	fileDom && fileDom.addEventListener('change', submit)
}

initUploadEvent()
