import { Bot, Context } from 'koishi';
import { Config } from '../config/settings';
import logger from '../utils/logger';
import { locale_settings } from '../utils/locale';
import {
  selectByDateAfterAndGroupName,
  selectByDateBetween
} from '../dao/teamDAO';
import {
  selectAllValidSignupByTeamNameAndDateBetween,
  selectSignupCountByUser,
  selectValidSignupByTeamName
} from '../dao/signupDAO';
import {
  getBeginNoticeGroups,
  getSignUpNoticeInTimeGroups,
  getSignUpNoticeInTimeUsers,
  getSignUpNoticeWithTimerGroups,
  getSignUpNoticeWithTimerUsers
} from '../utils/group';
import { parseAnswerMap } from '../utils/question';

/**
 * 推送消息给私聊
 */
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

/**
 * 推送消息给群聊
 */
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

/**
 * 开车前一天推送
 */
const beginNoticeOneDayBefore = async (ctx: Context, config: Config) => {
  const begin_time = new Date();
  begin_time.setDate(begin_time.getDate() + 1);
  const end_time = new Date(begin_time);
  end_time.setMinutes(end_time.getMinutes() + 5);
  return await beginNoticeBefore(ctx, config, begin_time, end_time);
};

/**
 * 开车前两小时推送
 */
const beginNoticeTwoHoursBefore = async (ctx: Context, config: Config) => {
  const begin_time = new Date();
  begin_time.setHours(begin_time.getHours() + 2);
  const end_time = new Date(begin_time);
  end_time.setMinutes(end_time.getMinutes() + 5);
  return await beginNoticeBefore(ctx, config, begin_time, end_time);
};

/**
 * 开车前推送
 */
const beginNoticeBefore = async (
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

/**
 * 报名信息推送
 */
const signupNoticeWithTimer = async (ctx: Context, config: Config) => {
  const bot = ctx.bots.find(bot => bot.isActive);
  const group_names = Object.keys(config.group_config_map);
  for (const group_name of group_names) {
    const teamList = await selectByDateAfterAndGroupName(
      ctx,
      new Date(),
      group_name
    );
    if (teamList.length == 0) continue;
    for (const team of teamList) {
      // 查询24小时前到现在的报名信息
      const begin_time = new Date();
      begin_time.setHours(begin_time.getHours() - 24);
      const end_time = new Date();
      const sign_ups = await selectAllValidSignupByTeamNameAndDateBetween(
        ctx,
        team.team_name,
        begin_time,
        end_time
      );
      if (sign_ups.length == 0) continue;
      const sign_up_count = await selectSignupCountByUser(ctx, team.team_name);
      // 合并成一条消息，显示报名次数
      const sign_up_msg = sign_ups
        .map(s => {
          const answer = parseAnswerMap(s.content);
          const server = answer.get('SERVER')?.preitter_answer;
          const user_name = answer.get('NICKNAME')?.preitter_answer;
          // 查询报名次数
          const count = sign_up_count.find(c => c.user_id == s.user_id)?.count;
          return count == 1
            ? `${user_name}@${server}（${s.user_id}）`
            : `${user_name}@${server}（${s.user_id}） 报名次数：${count}`;
        })
        .join('\n');
      const msg = `${team.group_name} ${team.team_name} 今日新增报名${sign_ups.length}人：\n${sign_up_msg}`;
      logger.info(`推送消息：${msg}`);
      // 推送给群组
      const groups = await getSignUpNoticeWithTimerGroups(
        ctx,
        config,
        team.team_name
      );
      groups.forEach(g => {
        noticeToGroup(ctx, config, bot, g, msg);
      });
      // 推送给个人
      const users = await getSignUpNoticeWithTimerUsers(
        ctx,
        config,
        team.team_name
      );
      users.forEach(u => {
        noticeToPrivage(ctx, config, bot, u, msg);
      });
    }
  }
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
  beginNoticeOneDayBefore,
  beginNoticeTwoHoursBefore,
  signupNoticeWithTimer,
  sendNoticeInTime,
  sendNoticeWithTimer
};
