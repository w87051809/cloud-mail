import app from '../hono/hono';
import result from "../model/result";
import oauthService from "../service/oauth-service";
import BizError from '../error/biz-error';
import {
	setOauthStateCookie,
	setSessionCookie,
	verifyOauthState
} from '../security/session';

app.get('/oauth/state', async (c) => {
	const state = crypto.randomUUID();
	setOauthStateCookie(c, state);
	return c.json(result.ok({ state }));
});

app.post('/oauth/linuxDo/login', async (c) => {
	const params = await c.req.json();
	if (!verifyOauthState(c, params.state)) {
		throw new BizError('登录状态校验失败，请重新登录', 403);
	}

	const loginInfo = await oauthService.linuxDoLogin(c, params);
	if (loginInfo.token) setSessionCookie(c, loginInfo.token);
	return c.json(result.ok({
		userInfo: loginInfo.userInfo,
		authenticated: Boolean(loginInfo.token),
		bindToken: loginInfo.bindToken || null
	}))
});

app.put('/oauth/bindUser', async (c) => {
	const loginInfo = await oauthService.bindUser(c, await c.req.json());
	setSessionCookie(c, loginInfo.token);
	return c.json(result.ok({
		userInfo: loginInfo.userInfo,
		authenticated: true
	}))
})
