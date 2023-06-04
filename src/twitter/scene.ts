import { Scenes } from 'telegraf';
import { IContextBot } from '../config/context.interface';
import { startInteraction, endInteraction } from '../statsDb/stats.helper';

import { retryGettingPage } from '../utils/utils';
import { getPage, parseLink } from './twitter.service';
import { isUploadAction } from './checkers';

export const TWITTER_SCENE = 'twitterScene';
export const twitterScene = new Scenes.BaseScene<IContextBot>(TWITTER_SCENE);

twitterScene.enter(async (ctx) => {
	const handleEnter = async () => {
		const twitterLink = ctx.state.link;

		try {
			const content = await retryGettingPage(
				5,
				twitterLink,
				getPage,
				15_000
			);
			if (!content) throw new Error();

			const links = parseLink(content as string);
			if ('message' in ctx.update) {
				const currentId = ctx.update.message.from.id;
				const allUsersExceptCurrent =
					ctx.session.data?.filter(
						({ userId }) => userId !== currentId
					) ?? [];
				const currentUser = {
					userId: currentId,
					twLinks: [...links],
					twLinkOne: '',
				};
				ctx.session.data = [...allUsersExceptCurrent, currentUser];

				startInteraction(ctx.update.message.from, 'twitter');
			}
			const hrefList = links.map(
				({ quality, href }) => `[🔗 ${quality}](${href})`
			);
			await ctx.reply(
				`${ctx.i18n.t('clickTheLink')}\n ${hrefList.join(
					'\n'
				)}\n\n${ctx.i18n.t('uploadToTg')}`,
				{
					parse_mode: 'MarkdownV2',
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: ctx.i18n.t('uploadToTgBtn'),
									callback_data: 'uploadToTg',
								},
							],
						],
					},
				}
			);
		} catch (error) {
			console.log(error, 'error message');
			await ctx.reply(ctx.i18n.t('smthWentWrong'));
		}
	};

	handleEnter();
});

twitterScene.action('uploadToTg', async (ctx) => {
	await ctx.answerCbQuery();

	const links = ctx.session.data.find(
		({ userId }) => userId === ctx.callbackQuery.from.id
	)?.twLinks;

	if (links?.length) {
		ctx.reply(ctx.i18n.t('chooseQuality'), {
			reply_markup: {
				inline_keyboard: links.map(({ quality }) => [
					{
						text: quality,
						callback_data: `download@${quality}`,
					},
				]),
			},
		});
	}
});

twitterScene.action(isUploadAction, async (ctx) => {
	const handleAction = async () => {
		await ctx.answerCbQuery();

		const currentId = ctx.update.callback_query.from.id;
		const link =
			ctx.session.data?.find((u) => u.userId === currentId)?.twLinkOne ??
			'';

		await ctx.editMessageText(ctx.i18n.t('uploadingVideo'));
		await ctx.replyWithVideo({ url: link });

		endInteraction(ctx.update.callback_query.from, 'twitter');
	};

	handleAction();
});
