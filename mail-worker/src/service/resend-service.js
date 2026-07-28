import { Resend } from 'resend';
import emailService from './email-service';
import settingService from './setting-service';
import { emailConst } from '../const/entity-const';
import BizError from '../error/biz-error';
import emailUtils from '../utils/email-utils';

const EVENT_STATUS = {
	bounced: emailConst.status.BOUNCED,
	canceled: emailConst.status.FAILED,
	complained: emailConst.status.COMPLAINED,
	delivered: emailConst.status.DELIVERED,
	delivery_delayed: emailConst.status.DELAYED,
	failed: emailConst.status.FAILED,
	queued: emailConst.status.SENT,
	scheduled: emailConst.status.SENT,
	sent: emailConst.status.SENT
};

const resendService = {
	async webhooks(c, body) {
		const resendEmailId = body?.data?.email_id;
		if (typeof resendEmailId !== 'string' || resendEmailId.length > 128) {
			throw new BizError('无效的邮件回调', 400);
		}

		const emailRow = await emailService.selectByResendEmailId(c, resendEmailId);
		if (!emailRow) throw new BizError('邮件记录不存在', 404);

		const { resendTokens } = await settingService.query(c);
		const token = resendTokens[emailUtils.getDomain(emailRow.sendEmail)];
		if (!token) throw new BizError('邮件服务未配置', 403);

		const { data, error } = await new Resend(token).emails.get(resendEmailId);
		if (error || !data || data.id !== resendEmailId) {
			throw new BizError('邮件回调验证失败', 403);
		}

		const status = EVENT_STATUS[data.last_event];
		if (status === undefined) return;

		let message = null;
		if (status === emailConst.status.BOUNCED) {
			message = JSON.stringify({ message: '邮件被对方服务器退回' });
		}
		if (status === emailConst.status.FAILED) {
			message = JSON.stringify({ message: '邮件发送失败' });
		}

		await emailService.updateEmailStatus(c, {
			resendEmailId,
			status,
			message
		});
	}
};

export default resendService;
