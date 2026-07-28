import resendService from '../service/resend-service';
import app from '../hono/hono';
app.post('/webhooks',async (c) => {
	try {
		const contentLength = Number(c.req.header('Content-Length')) || 0;
		if (contentLength > 65_536) return c.text('payload too large', 413);
		await resendService.webhooks(c, await c.req.json());
		return c.text('success', 200)
	} catch (e) {
		console.error('Resend webhook rejected:', e.message);
		return c.text('invalid webhook', 400)
	}
})
