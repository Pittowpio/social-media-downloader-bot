import { createEffect } from 'effector';
import { bot } from 'main';
import { notifyAdmin } from 'modules/bot/controllers';
import { MessageData } from 'modules/bot/services';
import { ScrapingError, UnknownError } from 'shared/api';

import { getPage } from './api/instagramApi';
import { sendFewVideos } from './api/send-few-videos';
import { sendManyFiles } from './api/send-many-files';
import { sendSingleFile } from './api/send-single-file';
import { MAX_VIDEOS_LIMIT } from './lib/consts';
import { parsePage } from './model/parsePage';

export const sendInstagramMedia = createEffect<MessageData, void, UnknownError>(
	async ({ chatId, link, ...others }) => {
		const isReels = link.includes('reel');

		try {
			const page = await getPage(link);
			const instagramLinks = parsePage(page);

			const videos = instagramLinks.filter(({ type }) => type === 'video');

			if (isReels || instagramLinks.length === 1) {
				await sendSingleFile({
					chatId,
					link,
					instagramLinkData: instagramLinks[0],
				});
				return;
			}

			/** max 5 videos at once
			 * and any count of photos
			 */
			if (videos.length <= MAX_VIDEOS_LIMIT) {
				await sendFewVideos({ chatId, instagramLinks, link });
				return;
			}

			/**
			 * MORE than 5 videos
			 * and any count of photos
			 * */
			await sendManyFiles({ chatId, instagramLinks, link });
		} catch (error) {
			if (error instanceof ScrapingError) {
				await bot.telegram.sendMessage(chatId, error.message);
				notifyAdmin({
					messageData: { chatId, link, ...others },
					status: 'error',
					errorInfo: { cause: error.error },
				});
				return;
			}

			throw new UnknownError(error);
		}
	}
);
