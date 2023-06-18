/* eslint-disable no-useless-escape */
import path from 'path'

export const FILE_TYPE_ENUM = {
	FILE: 'file',
	DIRECTORY: 'directory',
}

export const TEMP_DIR_NAME = '.temp$'

export const deployPath = __dirname
export const deployViewsPath = path.resolve(deployPath, './views')
export const tempDir = path.resolve(process.cwd(), TEMP_DIR_NAME)

// file name regular expression
export const fileNameReg =
	/^(?!.*\.\.)(?=[^/\\\:\*\?\x22\<\>\|]{1,255}$)(?!^[\.]+$)[^/\\\:\*\?\x22\<\>\|]*[^./\\\:\*\?\x22\<\>\|]$/

export default {
	port: 8080,
	dir: path.resolve(process.cwd(), 'public'),
	writable: false,
}
