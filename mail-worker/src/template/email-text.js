import { sanitizeEmailText } from '../security/email-sanitizer';

export default function emailTextTemplate(text) {
	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        html, body {
            box-sizing: border-box;
            margin: 0;
            padding: 10px;
            width: 100%;
            min-height: 100%;
            overflow: auto;
            background: #fff;
        }
        span {
            font-family: inherit;
            white-space: pre-wrap;
            word-break: break-word;
        }
    </style>
</head>
<body>
<span>${sanitizeEmailText(text)}</span>
</body>
</html>`;
}
