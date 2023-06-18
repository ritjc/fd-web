/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
importScripts('/__static__/crypto-js.js')
importScripts('/__static__/file-hash.js')

self.addEventListener(
	'message',
	function (e) {
		getChunksHash(e.data)
			.then(function (hash) {
				self.postMessage(hash)
			})
			.catch(function (err) {
				throw err
			})
			.finally(function () {
				self.close()
			})
	},
	false
)
