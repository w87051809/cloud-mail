import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import result from '../model/result';
import { applySecurityHeaders } from '../security/response-headers';

const app = new Hono();
const authBodyLimit = bodyLimit({
	maxSize: 32 * 1024,
	onError: (c) => c.json(result.fail('请求内容太大', 413), 413)
});

app.use('*', cors({
	origin(origin, c) {
		if (!origin) return null;
		return origin === new URL(c.req.url).origin ? origin : null;
	},
	allowHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
	allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	credentials: true,
	maxAge: 600
}));

app.use('/login', authBodyLimit);
app.use('/register', authBodyLimit);
app.use('/oauth/*', authBodyLimit);
app.use('/public/verifyUser', authBodyLimit);

app.use('*', async (c, next) => {
	await next();
	applySecurityHeaders(c.res.headers, c.req.url);
});

app.onError((err, c) => {
	if (err instanceof SyntaxError) {
		return c.json(result.fail('请求内容格式不正确', 400), 400);
	}

	if (err.name === 'BizError') {
		console.log(err.message);
		return c.json(result.fail(err.message, err.code));
	}

	console.error(err);
	return c.json(result.fail('服务暂时不可用，请稍后再试', 500));
});

export default app;
