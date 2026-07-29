const encoder = new TextEncoder();
const PBKDF2_PREFIX = 'pbkdf2-sha256';
const PBKDF2_ITERATIONS = 210_000;
const SALT_LENGTH = 16;

function bytesToBase64(bytes) {
	return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value) {
	return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

function constantTimeEqual(left, right) {
	if (left.length !== right.length) return false;

	let difference = 0;
	for (let index = 0; index < left.length; index++) {
		difference |= left[index] ^ right[index];
	}
	return difference === 0;
}

const cryptoUtils = {
	generateSalt(length = SALT_LENGTH) {
		const array = new Uint8Array(length);
		crypto.getRandomValues(array);
		return bytesToBase64(array);
	},

	async derivePassword(password, salt, iterations = PBKDF2_ITERATIONS) {
		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(password),
			'PBKDF2',
			false,
			['deriveBits']
		);

		const bits = await crypto.subtle.deriveBits({
			name: 'PBKDF2',
			hash: 'SHA-256',
			salt: base64ToBytes(salt),
			iterations
		}, key, 256);

		return bytesToBase64(new Uint8Array(bits));
	},

	async hashPassword(password) {
		const salt = this.generateSalt();
		const derived = await this.derivePassword(password, salt);
		return {
			salt,
			hash: `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${derived}`
		};
	},

	async legacyHashPassword(password, salt) {
		const data = encoder.encode(salt + password);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		return bytesToBase64(new Uint8Array(hashBuffer));
	},

	async verifyPassword(inputPassword, salt, storedHash) {
		if (!storedHash || !salt || typeof inputPassword !== 'string') return false;

		try {
			if (storedHash.startsWith(`${PBKDF2_PREFIX}$`)) {
				const [, iterationValue, expectedHash] = storedHash.split('$');
				const iterations = Number(iterationValue);
				if (!Number.isSafeInteger(iterations) || iterations < 100_000 || !expectedHash) return false;

				const actualHash = await this.derivePassword(inputPassword, salt, iterations);
				return constantTimeEqual(base64ToBytes(actualHash), base64ToBytes(expectedHash));
			}

			const legacyHash = await this.legacyHashPassword(inputPassword, salt);
			return constantTimeEqual(base64ToBytes(legacyHash), base64ToBytes(storedHash));
		} catch {
			return false;
		}
	},

	needsPasswordUpgrade(storedHash) {
		if (!storedHash?.startsWith(`${PBKDF2_PREFIX}$`)) return true;
		const iterations = Number(storedHash.split('$')[1]);
		return !Number.isSafeInteger(iterations) || iterations < PBKDF2_ITERATIONS;
	},

	genRandomPwd(length = 24) {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const random = new Uint8Array(length);
		crypto.getRandomValues(random);
		return Array.from(random, value => chars[value % chars.length]).join('');
	}
};

export { PBKDF2_ITERATIONS };
export default cryptoUtils;
