import { Session, Context, Argv } from 'koishi';
import { Config } from '../config/settings';
import { ErrorCode } from '../constant/common';
import { noticeToGroup, noticeToPrivage } from './noticeService';
import { selectRaid } from '../utils/server';
import { Answer, Question } from '../constant/question';
import { getSheet } from '../constant/questionSheet';
import {
  cancelSignup,
  checkSelfSignup,
  createSignup,
  reSignup,
  selectSignupByRaidName
} from '../dao/raidSignupDAO';
import { getNoticeGroups, getNoticeUsers } from '../utils/raid';

const onQuestion = async (
  config: Config,
  session: Session,
  problem: Question,
  results: Map<string, Answer>,
  retry_time: number = 0
) => {
  if (retry_time > 3) {
    return ErrorCode.RejectRange;
  }

  await session.sendQueued(
    problem.construct_content(results),
    config.message_interval
  );
  const res_accept = await session.prompt();
  if (!res_accept) return ErrorCode.Timeout;

  if (!problem.accept_answer(res_accept, results)) {
    // 答案不在范围内，进行重试
    await session.sendQueued('输入不合法，请重新输入', config.message_interval);
    return onQuestion(config, session, problem, results, retry_time + 1);
  }
  results.set(problem.label, {
    label: problem.label,
    name: problem.name,
    answer: res_accept,
    preitter_answer: problem.construct_preitter_answer(res_accept, results)
  });
  return ErrorCode.OK;
};

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

  const sign_ups = await selectSignupByRaidName(ctx, raid_name);
  const self = sign_ups.find(s => s.user_id == session.userId);
  // 报名满了，且非重新报名
  if (!self && sign_ups && sign_ups.length >= raid.max_members) {
    return '已经报名满了，请下次再来或查看其他团';
  }
  if (self && self.content != '') {
    return '已经报名过该团!';
  }
  if (
    self &&
    self.history_content != '' &&
    JSON.parse(self.history_content).length > 1
  ) {
    return '取消报名过多，无法重新报名，如有需要请联系指挥说明';
  }

  const server_name = raid.raid_server;
  const sheet = [...getSheet(server_name, config)].reverse();
  const results: Map<string, Answer> = new Map();
  while (sheet.length > 0) {
    const q = sheet.pop();
    const res_code = await onQuestion(config, session, q, results);
    if (res_code == ErrorCode.RejectRange) {
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
  const notice_users = getNoticeUsers(config, raid_name);
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

  const notice_groups = getNoticeGroups(config, raid_name);
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

  const sign_up = await checkSelfSignup(ctx, raid_name, session.userId);
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

  const sign_up = await checkSelfSignup(ctx, raid_name, session.userId);
  if (sign_up && sign_up.length > 0) {
    // 留存历史方便查询大聪明
    const history_content = [
      ...(JSON.parse(sign_up[0].history_content || '[]') as []),
      JSON.parse(sign_up[0].content)
    ];
    await cancelSignup(ctx, sign_up[0].id, JSON.stringify(history_content));
    const notice_users = getNoticeUsers(config, raid_name);
    if (notice_users.length > 0) {
      notice_users.forEach(user => {
        setTimeout(() => {
          noticeToPrivage(
            ctx,
            config,
            session.bot,
            user,
            `${raid_name} ${session.userId}取消报名，当前第${history_content.length}次`
          );
        }, config.message_interval);
      });
    }

    const notice_groups = getNoticeGroups(config, raid_name);
    if (notice_groups.length > 0) {
      notice_groups.forEach(group => {
        setTimeout(() => {
          noticeToGroup(
            ctx,
            config,
            session.bot,
            group,
            `${raid_name} ${session.userId}取消报名，当前第${history_content.length}次`
          );
        }, config.message_interval);
      });
    }
    return '已取消报名申请';
  } else {
    return '未报名该团!';
  }
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
