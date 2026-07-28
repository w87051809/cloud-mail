import sanitizeHtml from 'sanitize-html';

const REMOTE_IMAGE_ATTR = 'data-mail-remote-src';
const FORBIDDEN_STYLE_VALUE = /(url\s*\(|expression\s*\(|@import|javascript\s*:|data\s*:\s*text\/html|https?\s*:|behavior\s*:|-moz-binding|<\/?style)/i;
const FORBIDDEN_STYLE_PROPERTY = /^(behavior|-moz-binding|z-index)$/i;

function sanitizeInlineStyle(style = '') {
	return style
		.split(';')
		.map(declaration => declaration.trim())
		.filter(Boolean)
		.filter(declaration => {
			const separator = declaration.indexOf(':');
			if (separator < 1) return false;

			const property = declaration.slice(0, separator).trim();
			const value = declaration.slice(separator + 1).trim();
			if (FORBIDDEN_STYLE_PROPERTY.test(property) || FORBIDDEN_STYLE_VALUE.test(value)) return false;
			return !(/^position$/i.test(property) && /^(fixed|sticky)\b/i.test(value));
		})
		.join('; ');
}

function isInternalImage(src) {
	return src.startsWith('attachments/')
		|| src.startsWith('/attachments/')
		|| src.startsWith('{{domain}}attachments/')
		|| src.startsWith('cid:')
		|| src.startsWith('blob:');
}

function transformImage(tagName, attribs) {
	const next = { ...attribs };
	const src = String(next.src || '').trim();

	if (!src) return { tagName, attribs: next };

	if (/^https?:\/\//i.test(src)) {
		next[REMOTE_IMAGE_ATTR] = src;
		delete next.src;
		return { tagName, attribs: next };
	}

	if (src.startsWith('data:image/')) {
		if (src.length > 1_000_000) delete next.src;
		return { tagName, attribs: next };
	}

	if (!isInternalImage(src)) delete next.src;
	return { tagName, attribs: next };
}

function transformTag(tagName, attribs) {
	const next = { ...attribs };

	if (next.style) {
		next.style = sanitizeInlineStyle(next.style);
		if (!next.style) delete next.style;
	}

	if (tagName === 'img') return transformImage(tagName, next);

	if (tagName === 'a') {
		next.target = '_blank';
		next.rel = 'noopener noreferrer nofollow';
	}

	return { tagName, attribs: next };
}

export function sanitizeEmailHtml(html = '') {
	if (!html) return '';

	return sanitizeHtml(String(html), {
		allowedTags: [
			'a', 'abbr', 'address', 'article', 'aside', 'b', 'bdi', 'bdo', 'big',
			'blockquote', 'br', 'caption', 'center', 'cite', 'code', 'col', 'colgroup',
			'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption',
			'figure', 'font', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
			'hr', 'i', 'img', 'ins', 'kbd', 'li', 'main', 'mark', 'nav', 'ol', 'p',
			'pre', 'q', 's', 'samp', 'section', 'small', 'span', 'strike', 'strong',
			'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
			'time', 'tr', 'tt', 'u', 'ul', 'var', 'wbr'
		],
		allowedAttributes: {
			'*': [
				'align', 'aria-label', 'class', 'dir', 'height', 'id', 'lang', 'role',
				'style', 'title', 'valign', 'width'
			],
			a: ['href', 'name', 'rel', 'target'],
			col: ['span'],
			colgroup: ['span'],
			img: ['alt', 'border', 'height', 'src', 'title', 'width', REMOTE_IMAGE_ATTR],
			ol: ['start', 'type'],
			td: ['colspan', 'rowspan'],
			th: ['colspan', 'rowspan'],
			ul: ['type']
		},
		allowedSchemes: ['http', 'https', 'mailto', 'tel', 'cid', 'data', 'blob'],
		allowedSchemesByTag: {
			a: ['http', 'https', 'mailto', 'tel'],
			img: ['http', 'https', 'cid', 'data', 'blob']
		},
		allowProtocolRelative: false,
		disallowedTagsMode: 'discard',
		enforceHtmlBoundary: true,
		parseStyleAttributes: false,
		transformTags: {
			'*': transformTag
		}
	});
}

export function sanitizeEmailText(text = '') {
	return String(text)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export { REMOTE_IMAGE_ATTR };
