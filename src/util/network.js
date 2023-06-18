/* eslint-disable no-empty */
import address from 'address'
const defaultGateway = require('default-gateway')

const getNetworkIp = () => {
	let lanIp = ''
	try {
		const result = defaultGateway.v4.sync()
		lanIp = address.ip(result && result.interface)
		if (lanIp) {
			// private ip
			if (
				!/^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(
					lanIp
				)
			) {
				lanIp = ''
			}
		}
	} catch (err) {}
	return lanIp
}

export { getNetworkIp }
