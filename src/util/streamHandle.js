import fs from 'fs'

/**
 * stream data to file
 */
const streamReadAndWriteHandle = async (src, dest, start = 0) => {
	const rs = fs.createReadStream(src)
	const ws = fs.createWriteStream(dest, { flags: 'r+', start })
	return new Promise((resolve, reject) => {
		const handle = rs.pipe(ws)
		handle.on('finish', () => {
			rs.close()
			ws.close()
			resolve()
		})
		handle.on('error', reject)
	})
}

export { streamReadAndWriteHandle }
