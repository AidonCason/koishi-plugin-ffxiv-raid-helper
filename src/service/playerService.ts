import { Context, Argv } from 'koishi';
import { Config } from '../config/settings';
import { ErrorCode } from '../constant/common';
import { noticeToGroup, noticeToPrivage } from './noticeService';
import { selectRaid } from '../utils/server';
import {
  Answer,
  buildQuestion,
  Question,
  QuestionType
} from '../constant/question';
import { getSheet } from '../constant/questionSheet';
import {
  cancelSignup,
  createSignup,
  reSignup,
  selectAllCanceledSignupByRaidNameAndUserId,
  selectAllValidSignupByRaidNameAndUserId,
  selectValidSignupByRaidName
} from '../dao/raidSignupDAO';
import { getNoticeGroups, getNoticeUsers } from '../utils/raid';
import logger from '../utils/logger';
import { askOneQuestion, onQuestion } from '../utils/question';

const applyHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const raid = await selectRaid(ctx, config, session);
  if (!raid) return;
  if (!raid.allow_sign_up) {
    return '该团已关闭报名！';
  }
  // 开团前24小时截止报名
  const now = new Date();
  const deadline = new Date(raid.raid_time);
  deadline.setHours(deadline.getHours() - 24);
  if (now > deadline) {
    return '开团前24小时截止报名，如有特殊情况请联系指挥';
  }

  const raid_name = raid.raid_name;

  const sign_ups = await selectValidSignupByRaidName(ctx, raid_name);
  const self = sign_ups.find(s => s.user_id == session.userId);
  // 报名满了，且非重新报名
  if (!self && sign_ups && sign_ups.length >= raid.max_members) {
    return '已经报名满了，请下次再来或查看其他团';
  }
  logger.debug('self:', self);
  if (self && self.content != '') {
    const whether_re_signup_question: Question = buildQuestion({
      label: 'whether_re_signup',
      type: QuestionType.Boolean,
      name: '是否重新报名',
      content: '你已经报名过了，是否重新报名'
    });
    const answer = await askOneQuestion(
      config,
      session,
      whether_re_signup_question
    );
    if (!answer || answer.preitter_answer == '否') {
      return '取消报名';
    }
  }

  const self_signups = await selectAllCanceledSignupByRaidNameAndUserId(
    ctx,
    raid_name,
    session.userId
  );
  if (self_signups && self_signups.length > 3) {
    return '取消报名过多，无法重新报名，如有需要请联系指挥说明';
  }

  const server_name = raid.raid_server;
  const sheet = [...getSheet(server_name, config)].reverse();
  const results: Map<string, Answer> = new Map();
  while (sheet.length > 0) {
    const q = sheet.pop();
    const res_code = await onQuestion(config, session, q, results);
    if (res_code == ErrorCode.MaxRetry) {
      return '失败次数过多，报名退出';
    }
    if (res_code == ErrorCode.Timeout) {
      return '输入超时，报名结束';
    }
  }
  const output_pairs = Array.from(results.values()).map(r => [
    r.name,
    r.preitter_answer
  ]);
  output_pairs.push(['QQ(报名使用)', session.userId]);
  const notice_users = await getNoticeUsers(ctx, config, raid_name);
  if (notice_users.length > 0) {
    notice_users.forEach(user => {
      setTimeout(() => {
        noticeToPrivage(
          ctx,
          config,
          session.bot,
          user,
          `${raid_name} 收到一份新的报名表`
        );
      }, config.message_interval);
    });
  }

  const notice_groups = await getNoticeGroups(ctx, config, raid_name);
  if (notice_groups.length > 0) {
    notice_groups.forEach(group => {
      setTimeout(() => {
        noticeToGroup(
          ctx,
          config,
          session.bot,
          group,
          `${raid_name} 收到一份新的报名表`
        );
      }, config.message_interval);
    });
  }

  await session.sendQueued(
    output_pairs.map(p => p[0] + ': ' + p[1]).join('\n')
  );
  // create or update
  if (!self) {
    await createSignup(
      ctx,
      raid_name,
      session.userId,
      JSON.stringify(output_pairs)
    );
  } else {
    await reSignup(ctx, self.id, JSON.stringify(output_pairs));
  }
  return '报名提交成功!请关注群公告里面的报名结果~';
};

const checkSelfHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const raid = await selectRaid(ctx, config, session);
  if (!raid) return;
  const raid_name = raid.raid_name;

  const sign_up = await selectAllValidSignupByRaidNameAndUserId(
    ctx,
    raid_name,
    session.userId
  );
  if (sign_up && sign_up.length > 0) {
    return (
      '已经提交报名申请:\n' +
      JSON.parse(sign_up[0].content)
        .map(j => j[0] + ': ' + j[1])
        .join('\n')
    );
  } else {
    return '未报名该团!';
  }
};

const cancelSignupHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv
) => {
  if (!argv?.session) return;
  const session = argv.session;
  const raid = await selectRaid(ctx, config, session);
  if (!raid) return;
  const raid_name = raid.raid_name;

  const sign_ups = await selectAllValidSignupByRaidNameAndUserId(
    ctx,
    raid_name,
    session.userId
  );
  if (!sign_ups || sign_ups.length == 0) {
    return '未报名该团!';
  }
  for (const sign_up of sign_ups) {
    await cancelSignup(ctx, sign_up.id);
  }
  const notice_users = await getNoticeUsers(ctx, config, raid_name);
  if (notice_users.length > 0) {
    notice_users.forEach(user => {
      setTimeout(() => {
        noticeToPrivage(
          ctx,
          config,
          session.bot,
          user,
          `${raid_name} ${session.userId}取消报名`
        );
      }, config.message_interval);
    });
  }

  const notice_groups = await getNoticeGroups(ctx, config, raid_name);
  if (notice_groups.length > 0) {
    notice_groups.forEach(group => {
      setTimeout(() => {
        noticeToGroup(
          ctx,
          config,
          session.bot,
          group,
          `${raid_name} ${session.userId}取消报名`
        );
      }, config.message_interval);
    });
  }
  return '已取消报名申请';
};

const contactLeaderHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv
) => {
  if (!argv?.session) return;
  const session = argv.session;
  const raid = await selectRaid(ctx, config, session);
  if (!raid) return;
  return '指挥的联系方式为：qq： ' + raid.raid_leader;
};

export {
  applyHandler,
  checkSelfHandler,
  cancelSignupHandler,
  contactLeaderHandler
};
