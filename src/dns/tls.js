import dnstls from 'dns-over-tls';
import BaseDNS from './base';

export default class DNSOverTLS extends BaseDNS {
	async _lookup(hostname) {
		const {answers} = await dnstls.query(hostname);

		// TODO: lookup AAAA record
		const answer = answers.find(answer => answer.type === 'A' && answer.class === 'IN');

		if (answer) {
			return answer.data;
		}
	}
}

