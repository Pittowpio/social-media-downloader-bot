import { Scenes, session, Telegraf } from 'telegraf';
import { IContextBot } from './context.interface';
import { ConfigService } from './config.service';
import './firebase.config';

import { uploadVideoScene, UPLOAD_VIDEO_SCENE } from './twitter/scene';
import { instaScene, INSTA_SCENE } from './instagram/scene';

const TWITTER_URL = 'twitter.com';
const INSTA_URL = 'instagram.com';

const token = new ConfigService().get('BOT_TOKEN');
const bot = new Telegraf<IContextBot>(token);

const stage = new Scenes.Stage<IContextBot>([uploadVideoScene, instaScene]);

bot.use(session());
bot.use(stage.middleware());

// permissions
// bot.use(async (ctx, next)=> {
//     if("message" in ctx.update) {
//         const userId = ctx.update.message.from.id;
//         const hasPermission = userId === 1333220153;
//         if(!hasPermission) {
//             await ctx.reply('Для получения доступа, напиши автору бота: @chupapee');
//             return;
//         }
//         return next();
//     }
// });

bot.catch((err) => {
    console.log(err, 'INDEX.TS');
});

bot.start(async (ctx) => {
    await ctx.reply(
        '🔗 Отправьте ссылку',
    );
});

const isCorrectLink = (link: string): boolean => {
    return link.includes(TWITTER_URL) || link.includes(INSTA_URL);
};

bot.on('message', async (ctx) => {
    const handleMessage = async () => {
        if('text' in ctx.message && isCorrectLink(ctx.message.text)) {
            const link = ctx.message.text;
            ctx.state.link = link;
            if (link.includes(TWITTER_URL)) {
                await ctx.reply('🔄 Подготавливаем видео, это займёт не больше минуты');
                await ctx.scene.enter(UPLOAD_VIDEO_SCENE);
            } else if (link.includes(INSTA_URL)) {
                await ctx.reply('🔄 Обработка ссылки, это займёт не больше минуты');
                await ctx.scene.enter(INSTA_SCENE);
            }
        } else await ctx.reply('🚫 Отправьте корректную ссылку на твит.');
    };

    handleMessage();
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
