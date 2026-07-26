import orm from '../entity/orm';
import email from '../entity/email';
import settingService from './setting-service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
import { eq } from 'drizzle-orm';
import jwtUtils from '../utils/jwt-utils';
import emailMsgTemplate from '../template/email-msg';
import emailTextTemplate from '../template/email-text';
import emailHtmlTemplate from '../template/email-html';
import verifyUtils from '../utils/verify-utils';
import domainUtils from "../utils/domain-uitls";
import BizError from '../error/biz-error';

function normalizeChatIds(tgChatId = '') {
	return String(tgChatId)
		.split(',')
		.map(chatId => chatId.trim())
		.filter(Boolean);
}

async function sendMessage({ tgBotToken, chatId, text, replyMarkup }) {
	const body = {
		chat_id: chatId,
		parse_mode: 'HTML',
		text
	};

	if (replyMarkup) {
		body.reply_markup = replyMarkup;
	}

	const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	let data = null;
	const rawText = await res.text();

	try {
		data = rawText ? JSON.parse(rawText) : null;
	} catch (error) {
		data = null;
	}

	if (!res.ok || data?.ok === false) {
		return {
			ok: false,
			chatId,
			status: res.status,
			message: data?.description || rawText || 'Telegram request failed'
		};
	}

	return {
		ok: true,
		chatId,
		status: res.status
	};
}

async function sendMessageToChats({ tgBotToken, tgChatIds, text, replyMarkup }) {
	const results = await Promise.all(tgChatIds.map(async chatId => {
		try {
			return await sendMessage({ tgBotToken, chatId, text, replyMarkup });
		} catch (error) {
			return {
				ok: false,
				chatId,
				message: error.message || 'Telegram request failed'
			};
		}
	}));

	return {
		okCount: results.filter(item => item.ok).length,
		failCount: results.filter(item => !item.ok).length,
		errors: results.filter(item => !item.ok)
	};
}

const telegramService = {

	async getEmailContent(c, params) {

		const { token } = params

		const result = await jwtUtils.verifyToken(c, token);

		if (!result) {
			return emailTextTemplate('Access denied')
		}

		const emailRow = await orm(c).select().from(email).where(eq(email.emailId, result.emailId)).get();

		if (emailRow) {

			if (emailRow.content) {
				const { r2Domain } = await settingService.query(c);
				return emailHtmlTemplate(emailRow.content || '', r2Domain)
			} else {
				return emailTextTemplate(emailRow.text || '')
			}

		} else {
			return emailTextTemplate('The email does not exist')
		}

	},

	async sendEmailToBot(c, email) {

		const { tgBotToken, tgChatId, customDomain, tgMsgTo, tgMsgFrom, tgMsgText } = await settingService.query(c);

		const tgChatIds = normalizeChatIds(tgChatId);

		if (!tgBotToken || tgChatIds.length === 0) {
			console.error('Telegram push failed: bot token or chat id is empty');
			return { okCount: 0, failCount: tgChatIds.length || 1, errors: [] };
		}

		const jwtToken = await jwtUtils.generateToken(c, { emailId: email.emailId })
		const inlineKeyboard = [];

		if (customDomain) {
			const emailUrl = `${domainUtils.toOssDomain(customDomain)}/api/telegram/getEmail/${jwtToken}`
			inlineKeyboard.push([
				{
					text: 'View',
					url: emailUrl
				}
			]);
		}

		if (email.code) {
			inlineKeyboard.push([
				{
					text: email.code,
					copy_text: { text: email.code }
				}
			]);
		}

		const summary = await sendMessageToChats({
			tgBotToken,
			tgChatIds,
			text: emailMsgTemplate(email, tgMsgTo, tgMsgFrom, tgMsgText),
			replyMarkup: inlineKeyboard.length ? { inline_keyboard: inlineKeyboard } : null
		});

		if (summary.failCount > 0) {
			console.error('Telegram push failed:', JSON.stringify(summary.errors));
		}

		return summary;

	},

	async testBot(c, params = {}) {

		const setting = await settingService.query(c);
		const tgBotToken = String(params.tgBotToken || setting.tgBotToken || '').trim();
		const tgChatId = Object.prototype.hasOwnProperty.call(params, 'tgChatId') ? params.tgChatId : setting.tgChatId;
		const tgChatIds = normalizeChatIds(tgChatId);

		if (!tgBotToken) {
			throw new BizError('Telegram Bot Token is empty');
		}

		if (tgChatIds.length === 0) {
			throw new BizError('Telegram chat_id is empty');
		}

		return await sendMessageToChats({
			tgBotToken,
			tgChatIds,
			text: '<b>Cloud Mail Telegram Test</b>\n\nIf you can see this message, Telegram push works.'
		});

	}

}

export default telegramService
