import { Session, Context, Argv } from 'koishi';
import { Config } from '../config/settings';
import { ErrorCode, raid_sign_up_table_name } from '../constant/common';
import { noticeToGroup, noticeToPrivage } from './noticeService';
import { selectRaid } from '../utils/server';
import { Answer, Question } from '../constant/question';
import { getSheet } from '../constant/questionSheet';

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
  // 免责条款
  await session.sendQueued(
    '欢迎报名，请仔细阅读并回答以下问题即可完成报名',
    config.message_interval
  );
  const raid = await selectRaid(ctx, config, session);
  if (!raid) return;
  const raid_name = raid.raid_name;

  const sign_ups = await ctx.database.get(raid_sign_up_table_name, {
    raid_name: { $eq: raid_name }
  });
  if (sign_ups && sign_ups.length >= raid.max_members) {
    return '已经报名满了，请下次再来或查看其他团';
  }

  const sign_up = await ctx.database.get(raid_sign_up_table_name, {
    user_id: { $eq: session.userId },
    raid_name: { $eq: raid_name }
  });
  if (sign_up && sign_up.length > 0) {
    return '已经报名过该团!';
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
  if (config.notice_users.length > 0) {
    config.notice_users.forEach(user => {
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

  if (config.notice_groups.length > 0) {
    config.notice_groups.forEach(group => {
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
  await ctx.database.create(raid_sign_up_table_name, {
    raid_name,
    user_id: session.userId,
    content: JSON.stringify(output_pairs),
    created_at: new Date(),
    updated_at: new Date()
  });
  return '报名提交成功!请关注群公告里面的报名结果~';
};

const checkSelfHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const raid = await selectRaid(ctx, config, session);
  if (!raid) return;
  const raid_name = raid.raid_name;

  const sign_up = await ctx.database.get(raid_sign_up_table_name, {
    user_id: { $eq: session.userId },
    raid_name: { $eq: raid_name }
  });
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

export { applyHandler, checkSelfHandler, contactLeaderHandler };
