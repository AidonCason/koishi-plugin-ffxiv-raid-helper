import { Bot, Context } from 'koishi';
import { Config } from '../config/settings';
import logger from '../utils/logger';
import { raid_sign_up_table_name, raid_table_name } from '../constant/common';
import { locale_settings } from '../utils/locale';

const noticeToPrivage = async (
  ctx: Context,
  config: Config,
  bot: Bot,
  user_id: string,
  message: string
) => {
  if (bot.platform! in ['onebot', 'sandbox']) {
    return '该平台不支持私信';
  }

  const one = await (
    await bot.getFriendList()
  ).data.find(friend => friend.id == user_id);
  if (!one) {
    logger.warn(`要推送的用户${user_id}不是bot:${bot.selfId}的好友`);
    return;
  }
  bot.sendPrivateMessage(user_id, message);
};

const noticeToGroup = async (
  ctx: Context,
  config: Config,
  bot: Bot,
  group_id: string,
  message: string
) => {
  if (bot.platform! in ['onebot', 'sandbox']) {
    return '该平台不支持群聊推送';
  }

  const one = await (await bot.getGuildList()).data.find(g => g.id == group_id);
  if (!one) {
    logger.warn(`要推送的群组${group_id}不是bot:${bot.selfId}的群组`);
    return;
  }
  bot.sendMessage(group_id, message, group_id);
};

const pushDict = new Map<string, Date>();
const noticeOneDayBefore = async (ctx: Context, config: Config) => {
  const now = new Date();
  const oneDayAfter = new Date(now);
  oneDayAfter.setDate(now.getDate() + 1);
  // oneDayAfter.setHours(now.getHours() - 1);
  const oneDayAfter2 = new Date(now);
  oneDayAfter2.setDate(now.getDate() + 1);
  // oneDayAfter2.setHours(now.getHours() - 1);
  oneDayAfter2.setMinutes(now.getMinutes() + 5);

  const raidList = await ctx.model.get(raid_table_name, {
    raid_time: {
      $gte: oneDayAfter,
      $lte: oneDayAfter2
    }
  });

  if (raidList.length == 0) return;
  const bot = ctx.bots.find(bot => bot.platform == 'onebot');
  if (!bot || !bot.isActive) {
    logger.warn('找不到onebot机器人，无法推送私信');
    return;
  }

  raidList.forEach(async e => {
    const msg = `团 ${e.raid_name} 将于 ${e.raid_time.toLocaleString(locale_settings.current)} 发车`;
    logger.info(msg);

    const sign_ups = await ctx.model.get(raid_sign_up_table_name, {
      raid_name: { $gt: e.raid_name }
    });

    sign_ups.forEach(async s => {
      const key = `${e.raid_name}_private_${s.user_id}`;
      if (!pushDict[key]) {
        noticeToPrivage(ctx, config, bot, s.user_id, msg);
        pushDict[key] = now;
        // todo 清理或者优化
      }
    });
  });
};

const clearDict = () => {
  pushDict.clear();
};

export { noticeToPrivage, noticeToGroup, noticeOneDayBefore, clearDict };
