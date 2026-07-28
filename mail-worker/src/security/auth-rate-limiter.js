import KvConst from '../const/kv-const';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';
import reqUtils from '../utils/req-utils';

const encoder = new TextEncoder();
const LOGIN_WINDOW_SECONDS = 15 * 60;
const REGISTER_WINDOW_SECONDS = 60 * 60;
const LOGIN_ACCOUNT_LIMIT = 8;
const LOGIN_IP_LIMIT = 30;
const REGISTER_IP_LIMIT = 5;

async function hashKey(value) {
	const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
	return Array.from(new Uint8Array(digest))
		.slice(0, 16)
		.map(byte => byte.toString(16).padStart(2, '0'))
		.join('');
}

function requestIp(c) {
	return String(reqUtils.getIp(c)).split(',')[0].trim().slice(0, 80);
}

async function readCount(c, key) {
	return Number(await c.env.kv.get(key)) || 0;
}

async function increment(c, key, expirationTtl) {
	const count = await readCount(c, key);
	await c.env.kv.put(key, String(count + 1), { expirationTtl });
	return count + 1;
}

async function loginKeys(c, email) {
	const ipHash = await hashKey(requestIp(c));
	const accountHash = await hashKey(`${requestIp(c)}:${String(email || '').trim().toLowerCase()}`);
	return {
		ip: KvConst.LOGIN_RATE_IP + ipHash,
		account: KvConst.LOGIN_RATE_ACCOUNT + accountHash
	};
}

const authRateLimiter = {
	async assertLoginAllowed(c, email) {
		const keys = await loginKeys(c, email);
		const [ipCount, accountCount] = await Promise.all([
			readCount(c, keys.ip),
			readCount(c, keys.account)
		]);

		if (ipCount >= LOGIN_IP_LIMIT || accountCount >= LOGIN_ACCOUNT_LIMIT) {
			throw new BizError(t('loginRateLimit'), 429);
		}
		return keys;
	},

	async recordLoginFailure(c, email) {
		const keys = await loginKeys(c, email);
		await Promise.all([
			increment(c, keys.ip, LOGIN_WINDOW_SECONDS),
			increment(c, keys.account, LOGIN_WINDOW_SECONDS)
		]);
	},

	async clearLoginFailures(c, email) {
		const keys = await loginKeys(c, email);
		await c.env.kv.delete(keys.account);
	},

	async consumeRegistration(c) {
		const ipHash = await hashKey(requestIp(c));
		const key = KvConst.REGISTER_RATE_IP + ipHash;
		const count = await readCount(c, key);
		if (count >= REGISTER_IP_LIMIT) {
			throw new BizError(t('registerRateLimit'), 429);
		}
		await increment(c, key, REGISTER_WINDOW_SECONDS);
	}
};

export default authRateLimiter;
