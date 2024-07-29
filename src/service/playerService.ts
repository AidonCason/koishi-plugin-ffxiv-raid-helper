import { Dict, Session, Context, Argv } from 'koishi';
import { Config } from '../config/settings';
import {
  ErrorCode,
  raid_sign_up_table_name,
  raid_table_name
} from '../constant/common';
import { locale_settings } from '../utils/locale';
import { base_choice, duties, questions, servers } from '../constant/question';

const onQuestion = async (
  config: Config,
  session: Session,
  problem: Question,
  results: Dict<string | number, string>,
  retry_time: number = 0
) => {
  const range =
    problem.depends_key && problem.depends_range
      ? problem.depends_range(results[problem.depends_key])
      : problem.answer_range;
  if (retry_time == 0) {
    if (problem.depends_key && problem.depends_content) {
      await session.sendQueued(
        problem.depends_content(results[problem.depends_key]),
        config.message_interval
      );
    } else {
      await session.sendQueued(problem.content, config.message_interval);
    }
  }
  if (retry_time > 0 && retry_time <= 3) {
    await session.sendQueued(
      '答案不在范围内，请在以下范围选择' + JSON.stringify(range),
      config.message_interval
    );
  }
  if (retry_time > 3) {
    return ErrorCode.RejectRange;
  }
  const res_accept = await session.prompt();
  if (!res_accept) return ErrorCode.Timeout;
  if (
    range &&
    range.length > 0 &&
    range.indexOf(res_accept) < 0 &&
    range.indexOf(parseInt(res_accept)) < 0
  ) {
    // 答案不在范围内，进行重试
    return onQuestion(config, session, problem, results, retry_time + 1);
  }

  results[problem.label ?? problem.content] = res_accept;
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

  const one = await ctx.database.get(raid_table_name, {
    raid_time: { $gt: new Date() }
  });
  if (one && one.length > 0) {
    await session.sendQueued(
      '请输入编号选择要报名的团，当前有如下团:\n' +
        one
          .map(
            (e, idx) =>
              '' +
              (idx + 1) +
              '.    ' +
              e.raid_name +
              '    ' +
              e.raid_time.toLocaleString(locale_settings.current)
          )
          .join('\n'),
      config.message_interval
    );
  } else {
    return '未查询到当前有团，请在开团后报名';
  }

  const code = parseInt(await session.prompt(), 10) || -1;
  if (!one[code - 1]) {
    return '团号错误，请重新开始报名流程';
  }
  const raid_name = one[code - 1].raid_name;

  // todo 改成正经count
  const sign_ups = await ctx.database.get(raid_sign_up_table_name, {
    raid_name: { $eq: raid_name }
  });
  if (sign_ups && sign_ups.length >= one[code - 1].max_members) {
    return '已经报名满了，请下次再来或查看其他团';
  }

  const sign_up = await ctx.database.get(raid_sign_up_table_name, {
    user_id: { $eq: session.userId },
    raid_name: { $eq: raid_name }
  });
  if (sign_up && sign_up.length > 0) {
    return '已经报名过该团!';
  }

  const sheet = [...questions].reverse();
  const results = {};
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

  // todo 通用一点
  const output_pairs = [];
  output_pairs.push(['报名内容', '']);
  output_pairs.push(['团次', raid_name]);
  output_pairs.push(['区服', servers[results['3'] - 1]]);
  output_pairs.push(['游戏ID', results['4']]);
  output_pairs.push(['初见', base_choice[1 - results['2']]]);
  output_pairs.push(['QQ(问卷填写)', results['5']]);
  output_pairs.push(['QQ(报名使用)', session.userId]);
  output_pairs.push(['接受调剂', base_choice[results['6']]]);
  output_pairs.push([
    '主选',
    Object.keys(duties)[results['7'] - 1].toString() +
      '-' +
      duties[Object.keys(duties)[results['7'] - 1]][results['7-1'] - 1]
  ]);

  output_pairs.push([
    '次选',
    Object.keys(duties)[results['8'] - 1].toString() +
      '-' +
      duties[Object.keys(duties)[results['8'] - 1]][results['8-1'] - 1]
  ]);
  output_pairs.push(['红色勋章层数', results['9']]);
  output_pairs.push(['留言', results['11']]);

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

  const one = await ctx.database.get(raid_table_name, {
    raid_time: { $gt: new Date() }
  });
  if (one && one.length > 0) {
    await session.sendQueued(
      '请输入编号选择要查看的团，当前有如下团:\n' +
        one
          .map(
            (e, idx) =>
              '' +
              (idx + 1) +
              '.    ' +
              e.raid_name +
              '    ' +
              e.raid_time.toLocaleString(locale_settings.current)
          )
          .join('\n'),
      config.message_interval
    );
  } else {
    return '未查询到当前有团';
  }

  const code = parseInt(await session.prompt(), 10) || -1;
  if (!one[code - 1]) {
    return '团号错误';
  }
  const raid_name = one[code - 1].raid_name;

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

  const one = await ctx.database.get(raid_table_name, {
    raid_time: { $gt: new Date() }
  });
  if (one && one.length > 0) {
    await session.sendQueued(
      '请输入编号选择要查看的团，当前有如下团:\n' +
        one
          .map(
            (e, idx) =>
              '' +
              (idx + 1) +
              '.    ' +
              e.raid_name +
              '    ' +
              e.raid_time.toLocaleString(locale_settings.current)
          )
          .join('\n'),
      config.message_interval
    );
  } else {
    return '未查询到当前有团';
  }

  const code = parseInt(await session.prompt(), 10) || -1;
  if (!one[code - 1]) {
    return '团号错误';
  }

  return '指挥的联系方式为：qq： ' + one[code - 1].raid_leader;
};

export { applyHandler, checkSelfHandler, contactLeaderHandler };
