import { Bot, Context } from 'koishi';
import { Config } from '../config/settings';
import logger from '../utils/logger';
import { locale_settings } from '../utils/locale';
import { selectByDateBetween } from '../dao/teamDAO';
import { selectValidSignupByTeamName } from '../dao/signupDAO';
import {
  getBeginNoticeGroups,
  getSignUpNoticeInTimeGroups,
  getSignUpNoticeInTimeUsers,
  getSignUpNoticeWithTimerGroups,
  getSignUpNoticeWithTimerUsers
} from '../utils/group';

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
  const one = (await bot.getFriendList()).data.find(
    friend => friend.id == user_id
  );
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
  const one = (await bot.getGuildList()).data.find(g => g.id == group_id);
  if (!one) {
    logger.warn(`要推送的群组${group_id}不是bot:${bot.selfId}的群组`);
    return;
  }
  bot.sendMessage(group_id, message, group_id);
};

const noticeOneDayBefore = async (ctx: Context, config: Config) => {
  const begin_time = new Date();
  begin_time.setDate(begin_time.getDate() + 1);
  const end_time = new Date(begin_time);
  end_time.setMinutes(end_time.getMinutes() + 5);
  return await noticeBefore(ctx, config, begin_time, end_time);
};

const noticeTwoHoursBefore = async (ctx: Context, config: Config) => {
  const begin_time = new Date();
  begin_time.setHours(begin_time.getHours() + 2);
  const end_time = new Date(begin_time);
  end_time.setMinutes(end_time.getMinutes() + 5);
  return await noticeBefore(ctx, config, begin_time, end_time);
};

const noticeBefore = async (
  ctx: Context,
  config: Config,
  begin_time: Date,
  end_time: Date
) => {
  const teamList = await selectByDateBetween(ctx, begin_time, end_time);

  if (teamList.length == 0) return;
  const bot = ctx.bots.find(bot => bot.isActive);

  teamList.forEach(async e => {
    const msg = `团 ${e.team_name} 将于 ${e.raid_start_time.toLocaleString(locale_settings.current)} 发车`;
    logger.info(`推送消息：${msg}`);

    const groups = await getBeginNoticeGroups(ctx, config, e.team_name);
    groups.forEach(g => {
      noticeToGroup(ctx, config, bot, g, msg);
    });

    const sign_ups = await selectValidSignupByTeamName(ctx, e.team_name);
    sign_ups.forEach(async s => {
      noticeToPrivage(ctx, config, bot, s.user_id, msg);
    });
  });
};

const sendNoticeInTime = async (
  ctx: Context,
  config: Config,
  bot: Bot,
  team_name: string,
  message: string
) => {
  const notice_users = await getSignUpNoticeInTimeUsers(ctx, config, team_name);
  if (notice_users.length > 0) {
    notice_users.forEach(user => {
      setTimeout(() => {
        noticeToPrivage(ctx, config, bot, user, message);
      }, config.message_interval);
    });
  }

  const notice_groups = await getSignUpNoticeInTimeGroups(
    ctx,
    config,
    team_name
  );
  if (notice_groups.length > 0) {
    notice_groups.forEach(group => {
      setTimeout(() => {
        noticeToGroup(ctx, config, bot, group, message);
      }, config.message_interval);
    });
  }
};

const sendNoticeWithTimer = async (
  ctx: Context,
  config: Config,
  bot: Bot,
  team_name: string,
  message: string
) => {
  const notice_groups = await getSignUpNoticeWithTimerGroups(
    ctx,
    config,
    team_name
  );
  if (notice_groups.length > 0) {
    notice_groups.forEach(group => {
      setTimeout(() => {
        noticeToGroup(ctx, config, bot, group, message);
      }, config.message_interval);
    });
  }

  const notice_users = await getSignUpNoticeWithTimerUsers(
    ctx,
    config,
    team_name
  );
  if (notice_users.length > 0) {
    notice_users.forEach(user => {
      setTimeout(() => {
        noticeToPrivage(ctx, config, bot, user, message);
      }, config.message_interval);
    });
  }
};

export {
  noticeToPrivage,
  noticeToGroup,
  noticeOneDayBefore,
  noticeTwoHoursBefore,
  sendNoticeInTime,
  sendNoticeWithTimer
};
