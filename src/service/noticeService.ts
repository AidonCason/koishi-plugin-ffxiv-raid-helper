import { Bot, Context } from 'koishi';
import { Config } from '../config/settings';
import logger from '../utils/logger';
import { locale_settings } from '../utils/locale';
import { selectByDateBetween } from '../dao/raidDAO';
import { selectValidSignupByRaidName } from '../dao/raidSignupDAO';

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

const noticeOneDayBefore = async (ctx: Context, config: Config) => {
  const now = new Date();
  const begin_time = new Date(now);
  begin_time.setDate(now.getDate() + 1);
  const end_time = new Date(now);
  end_time.setDate(now.getDate() + 1);
  end_time.setMinutes(now.getMinutes() + 5);
  return await noticeBefore(ctx, config, begin_time, end_time);
};

const noticeTwoHoursBefore = async (ctx: Context, config: Config) => {
  const now = new Date();
  const begin_time = new Date(now);
  begin_time.setHours(now.getHours() + 1);
  const end_time = new Date(now);
  end_time.setHours(now.getHours() + 1);
  end_time.setMinutes(now.getMinutes() + 5);
  return await noticeBefore(ctx, config, begin_time, end_time);
};

const noticeBefore = async (
  ctx: Context,
  config: Config,
  begin_time: Date,
  end_time: Date
) => {
  const raidList = await selectByDateBetween(ctx, begin_time, end_time);

  if (raidList.length == 0) return;
  const bot = ctx.bots.find(bot => bot.platform == 'onebot');
  if (!bot || !bot.isActive) {
    logger.warn('找不到onebot机器人，无法推送私信');
    return;
  }

  raidList.forEach(async e => {
    const msg = `团 ${e.raid_name} 将于 ${e.raid_time.toLocaleString(locale_settings.current)} 发车`;
    logger.info(msg);

    const sign_ups = await selectValidSignupByRaidName(ctx, e.raid_name);

    sign_ups.forEach(async s => {
      noticeToPrivage(ctx, config, bot, s.user_id, msg);
    });
  });
};

export {
  noticeToPrivage,
  noticeToGroup,
  noticeOneDayBefore,
  noticeTwoHoursBefore
};
