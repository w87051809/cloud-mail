import { describe, expect, it } from 'vitest';
import cryptoUtils, { PBKDF2_ITERATIONS } from '../src/utils/crypto-utils';
import jwtUtils from '../src/utils/jwt-utils';
import { sanitizeEmailHtml, sanitizeEmailText } from '../src/security/email-sanitizer';
import { secureResponse } from '../src/security/response-headers';

describe('邮件内容清理', () => {
	it('移除脚本、事件和危险链接', () => {
		const result = sanitizeEmailHtml(
			'<script>alert(1)</script>'
			+ '<img src="x" onerror="alert(1)">'
			+ '<a href="javascript:alert(1)">打开</a>'
		);

		expect(result).not.toContain('<script');
		expect(result).not.toContain('onerror');
		expect(result).not.toContain('javascript:');
		expect(result).toContain('rel="noopener noreferrer nofollow"');
	});

	it('默认拦截外部图片并保留站内附件', () => {
		const result = sanitizeEmailHtml(
			'<img src="https://tracker.example/pixel.png">'
			+ '<img src="/attachments/message/photo.png">'
		);

		expect(result).toContain('data-mail-remote-src="https://tracker.example/pixel.png"');
		expect(result).toContain('src="/attachments/message/photo.png"');
	});

	it('移除样式中的外部资源，保留普通样式', () => {
		const result = sanitizeEmailHtml(
			'<div style="color:red;background:url(https://tracker.example/x)">内容</div>'
		);

		expect(result).toContain('color:red');
		expect(result).not.toContain('url(');
	});

	it('纯文本预览会转义 HTML', () => {
		expect(sanitizeEmailText('<b>"邮件"</b>')).toBe('&lt;b&gt;&quot;邮件&quot;&lt;/b&gt;');
	});
});

describe('密码存储', () => {
	it('新密码使用带随机盐的 PBKDF2', async () => {
		const first = await cryptoUtils.hashPassword('正确且足够长的密码123');
		const second = await cryptoUtils.hashPassword('正确且足够长的密码123');

		expect(first.hash).toMatch(new RegExp(`^pbkdf2-sha256\\$${PBKDF2_ITERATIONS}\\$`));
		expect(first.salt).not.toBe(second.salt);
		expect(await cryptoUtils.verifyPassword('正确且足够长的密码123', first.salt, first.hash)).toBe(true);
		expect(await cryptoUtils.verifyPassword('错误密码', first.salt, first.hash)).toBe(false);
	});

	it('兼容旧密码并标记为需要升级', async () => {
		const salt = cryptoUtils.generateSalt();
		const legacyHash = await cryptoUtils.legacyHashPassword('旧密码123456', salt);

		expect(await cryptoUtils.verifyPassword('旧密码123456', salt, legacyHash)).toBe(true);
		expect(cryptoUtils.needsPasswordUpgrade(legacyHash)).toBe(true);
	});
});

describe('登录令牌', () => {
	it('拒绝空令牌并校验签名', async () => {
		const context = { env: { jwt_secret: 'test-secret-with-enough-length' } };
		const token = await jwtUtils.generateToken(context, { userId: 1, token: 'session-id' }, 60);

		expect(await jwtUtils.verifyToken(context, null)).toBeNull();
		expect(await jwtUtils.verifyToken(context, token)).toMatchObject({
			userId: 1,
			token: 'session-id'
		});
		expect(await jwtUtils.verifyToken(context, `${token}x`)).toBeNull();
	});
});

describe('安全响应头', () => {
	it('正式网页响应包含浏览器安全策略', () => {
		const response = secureResponse(new Response('ok'), 'https://mail.example.com/');

		expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
		expect(response.headers.get('X-Frame-Options')).toBe('DENY');
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
	});
});
