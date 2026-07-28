import app from '../hono/hono';
import r2Service from '../service/r2-service';
import attService from '../service/att-service';
import userContext from '../security/user-context';
import BizError from '../error/biz-error';

const SAFE_INLINE_TYPES = new Set([
	'image/avif',
	'image/gif',
	'image/jpeg',
	'image/png',
	'image/webp'
]);

function contentDisposition(row, inline) {
	const filename = String(row.filename || 'attachment').replace(/[\r\n]/g, '').slice(0, 255);
	return `${inline ? 'inline' : 'attachment'}; filename="attachment"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function attachmentResponse(c, key) {
	const user = userContext.getUser(c);
	const isAdmin = user.email === c.env.admin;
	const attachment = await attService.getAccessibleKey(c, key, user.userId, isAdmin);
	if (!attachment) {
		throw new BizError('无权访问这个附件', 403);
	}

	const object = await r2Service.getObj(c, key);
	if (!object) throw new BizError('附件不存在', 404);

	const headers = new Headers();
	const mimeType = String(attachment.mimeType || '').toLowerCase();
	const inline = Boolean(attachment.contentId) && SAFE_INLINE_TYPES.has(mimeType);
	let body;

	if (object instanceof Response) {
		body = object.body;
	} else {
		body = object.body;
	}

	headers.set('Content-Type', inline ? mimeType : 'application/octet-stream');
	headers.set('Content-Disposition', contentDisposition(attachment, inline));
	headers.set('Cache-Control', 'private, max-age=300');
	headers.set('Vary', 'Cookie, Authorization');
	return new Response(body, { headers });
}

app.get('/attachments/*', async (c) => {
	const key = c.req.path.replace(/^\//, '');
	return attachmentResponse(c, key);
});

app.get('/oss/*', async (c) => {
	const key = c.req.path.split('/oss/')[1];
	return attachmentResponse(c, key);
});
