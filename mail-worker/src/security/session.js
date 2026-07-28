import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import constant from '../const/constant';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

const SESSION_COOKIE = 'mail_session';
const OAUTH_STATE_COOKIE = 'mail_oauth_state';

function isHttps(c) {
	return new URL(c.req.url).protocol === 'https:';
}

function bearerToken(c) {
	const header = c.req.header(constant.TOKEN_HEADER);
	if (!header || header === 'null' || header === 'undefined') return null;
	return header.replace(/^Bearer\s+/i, '').trim() || null;
}

export function getSessionJwt(c) {
	return bearerToken(c) || getCookie(c, SESSION_COOKIE) || null;
}

export function usesCookieSession(c) {
	return !bearerToken(c) && Boolean(getCookie(c, SESSION_COOKIE));
}

export function setSessionCookie(c, jwt) {
	setCookie(c, SESSION_COOKIE, jwt, {
		httpOnly: true,
		secure: isHttps(c),
		sameSite: 'Strict',
		path: '/',
		maxAge: constant.TOKEN_EXPIRE
	});
}

export function clearSessionCookie(c) {
	deleteCookie(c, SESSION_COOKIE, {
		secure: isHttps(c),
		path: '/'
	});
}

export function setOauthStateCookie(c, state) {
	setCookie(c, OAUTH_STATE_COOKIE, state, {
		httpOnly: true,
		secure: isHttps(c),
		sameSite: 'Lax',
		path: '/',
		maxAge: 600
	});
}

export function verifyOauthState(c, state) {
	const expected = getCookie(c, OAUTH_STATE_COOKIE);
	deleteCookie(c, OAUTH_STATE_COOKIE, {
		secure: isHttps(c),
		path: '/'
	});
	return Boolean(expected && state && expected === state);
}

export function assertSameOrigin(c) {
	if (!usesCookieSession(c) || ['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return;

	const expectedOrigin = new URL(c.req.url).origin;
	const origin = c.req.header('Origin');
	const referer = c.req.header('Referer');
	let validReferer = false;
	if (referer) {
		try {
			validReferer = new URL(referer).origin === expectedOrigin;
		} catch {
			validReferer = false;
		}
	}

	if (origin !== expectedOrigin && !validReferer) {
		throw new BizError(t('invalidRequestOrigin'), 403);
	}
}

export { OAUTH_STATE_COOKIE, SESSION_COOKIE };
