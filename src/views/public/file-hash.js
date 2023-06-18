/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

function getChunksHash(fileChunks, shaA) {
	const sha = shaA || CryptoJS.algo.SHA256.create()
	function readChunk(fileChunk) {
		return new Promise(function (resolve, reject) {
			let reader = new FileReader()
			reader.readAsArrayBuffer(fileChunk)
			reader.onload = function () {
				let wordArray = CryptoJS.lib.WordArray.create(reader.result)
				resolve(wordArray)
			}
			reader.onerror = reject
		})
	}

	function reads(fileChunks, sha) {
		const chunk = fileChunks.shift()
		return new Promise(function (resolve, reject) {
			readChunk(chunk)
				.then(function (wordArray) {
					sha.update(wordArray)
					if (fileChunks.length === 0) {
						sha.finalize()
						resolve()
					} else {
						reads(fileChunks, sha).then(resolve).catch(reject)
					}
				})
				.catch(reject)
		})
	}

	return new Promise(function (resolve, reject) {
		reads(fileChunks, sha)
			.then(function () {
				resolve(sha._hash.toString())
			})
			.catch(reject)
	})
}
