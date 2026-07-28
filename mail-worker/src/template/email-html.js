import domainUtils from '../utils/domain-uitls';
import { sanitizeEmailHtml } from '../security/email-sanitizer';

export default function emailHtmlTemplate(html, domain) {
	const content = sanitizeEmailHtml(html).replace(/{{domain}}/g, domainUtils.toOssDomain(domain) + '/');

	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; }
        .content-box {
            padding: 15px 10px;
            width: 100%;
            min-height: 100%;
            overflow: auto;
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            line-height: 1.5;
            word-break: break-word;
        }
        img { max-width: 100%; height: auto; }
        img[data-mail-remote-src] { display: none !important; }
        a { color: #0E70DF; }
    </style>
</head>
<body>
    <div class="content-box">${content}</div>
</body>
</html>`;
}
