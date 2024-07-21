import { Context, Dict, Schema, Session, Time, h } from 'koishi';
import logger from './utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';

export const name = 'ffxiv-raid-helper';

// 前置服务
export const inject = {
  required: ['database', 'assets']
};

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

const messageInterval = 3 * Time.second;

const enum AnswerType {
  String = 0,
  Number
}

class Question {
  label: string;
  content: string; // 提示语
  answer_type?: AnswerType = AnswerType.String; // 回答类型，默认String自由回答
  answer_range?: ReadonlyArray<string | number>; // 回答范围，用作单选
  depends_key?: string; // 依赖于其他题目的答案
  depends_content?: (input) => string;
  depends_range?: (input) => ReadonlyArray<string | number>; //由input产生选择集
}

const enum ErrorCode {
  Unknown = -1,
  OK = 0,
  Timeout,
  Reject,
  RejectRange
}

const base_choice = ['否', '是'];
const servers: ReadonlyArray<string> = [
  '红玉海',
  '神意之地',
  '拉诺西亚',
  '幻影群岛',
  '萌芽池',
  '宇宙和音',
  '沃仙曦染',
  '晨曦王座'
];

const duties = {
  坦克: ['骑士', '战士', '黑骑', '绝枪'],
  治疗: ['白魔', '学者', '占星', '贤者'],
  近战: ['武僧', '龙骑', '忍者', '武士', '镰刀'],
  远敏: ['诗人', '机工', '武者'],
  法系: ['黑魔', '召唤', '赤魔']
};
const questions: ReadonlyArray<Question> = [
  // {
  //   label: '0',
  //   content:
  //     '1.<b>请您确保已经详细阅读过所有的相关群公告再提交报名表，如果因为未阅读群公告导致的所有问题你将负全部责任。</b>(No退出，其它任意输入继续)'
  // },
  {
    label: '2',
    content: '是否已经通关零式女王古殿？\n(1-是/0-否)',
    answer_type: AnswerType.Number,
    answer_range: [1, 0]
  },
  {
    label: '3',
    content:
      '所在服务器\n' +
      servers.map((server, idx) => '' + (idx + 1) + '-' + server).join('\n'),
    answer_range: servers.map((_, idx) => idx + 1)
  },
  {
    label: '4',
    content: '角色姓名'
  },
  {
    label: '5',
    content: 'QQ'
  },
  {
    label: '6',
    content:
      '选择职业前请您注意，我们保证所有的开荒位置先到先得，但是如果您所选择的职能已经满员了，您是否愿意被调剂到其他职能？\n(1-是/0-否)',
    answer_type: AnswerType.Number,
    answer_range: [1, 0]
  },
  {
    label: '7',
    content:
      '职能-职业选择:职能\n' +
      Object.keys(duties)
        .map((duty, idx) => '' + (idx + 1) + '-' + duty)
        .join('\n'),
    answer_type: AnswerType.Number,
    answer_range: Object.keys(duties).map((_, idx) => idx + 1)
  },
  {
    label: '7-1',
    content: '',
    answer_type: AnswerType.Number,
    depends_key: '7',
    depends_content: input =>
      '职能-职业选择:职业\n' +
      duties[Object.keys(duties)[input - 1]]
        .map((duty, idx) => '' + (idx + 1) + '-' + duty)
        .join('\n'),
    depends_range: input =>
      duties[Object.keys(duties)[input - 1]].map((_, idx) => idx + 1)
  },
  {
    label: '8',
    content:
      '职能-职业选择:次选职能\n' +
      Object.keys(duties)
        .map((duty, idx) => '' + (idx + 1) + '-' + duty)
        .join('\n'),
    answer_type: AnswerType.Number,
    answer_range: Object.keys(duties).map((_, idx) => idx + 1)
  },
  {
    label: '8-1',
    content: '',
    answer_type: AnswerType.Number,
    depends_key: '8',
    depends_content: input =>
      '职能-职业选择:次选职业\n' +
      duties[Object.keys(duties)[input - 1]]
        .map((duty, idx) => '' + (idx + 1) + '-' + duty)
        .join('\n'),
    depends_range: input =>
      duties[Object.keys(duties)[input - 1]].map((_, idx) => idx + 1)
  },
  {
    label: '9',
    content: '请您输入角色现有红色的战斗勋章层数:\n',
    answer_range: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },
  // {
  //   label: '10',
  //   content:
  //     '有亲友和您是一起来报名的吗？如果有的话需要把你们安排在同一队里吗？他的id是什么？\n(有的，我的朋友是xxx/没有)'
  // },
  {
    label: '11',
    content: '还有什么废话是你想说给指挥听的吗？有的话请在下面畅所欲言吧~'
  }
];

const date_locale_options: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
};

const onQuestion = async (
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
        messageInterval
      );
    } else {
      await session.sendQueued(problem.content, messageInterval);
    }
  }
  if (retry_time > 0 && retry_time <= 3) {
    await session.sendQueued(
      '答案不在范围内，请在以下范围选择' + JSON.stringify(range),
      messageInterval
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
    return onQuestion(session, problem, results, retry_time + 1);
  }

  results[problem.label ?? problem.content] = res_accept;
  return ErrorCode.OK;
};

export function apply(ctx: Context) {
  // write your plugin here
  const table_prefix = 'ffxiv_raid_helper_';
  const raid_table_name = table_prefix + 'raid';
  const raid_sign_up_table_name = table_prefix + 'sign_up';
  // create table
  ctx.model.extend(
    raid_table_name,
    {
      id: 'unsigned',
      raid_name: 'string', // 团名
      max_members: 'unsigned', // 接纳报名的最大人数
      raid_leader: 'string', // 指挥qq
      raid_time: 'timestamp', // 开团时间
      raid_server: 'string', // 开团的服务器
      allow_sign_up: 'boolean',
      created_at: 'timestamp',
      updated_at: 'timestamp'
    },
    {
      primary: 'id',
      unique: ['raid_name'],
      foreign: null,
      autoInc: true
    }
  );

  ctx.model.extend(
    raid_sign_up_table_name,
    {
      id: 'unsigned',
      raid_name: 'string', // 团名
      user_id: 'string', // 用户id
      content: 'string', // 报名内容
      created_at: 'timestamp',
      updated_at: 'timestamp'
    },
    {
      primary: 'id',
      unique: [['raid_name', 'user_id']], // 同一团一人只能报名一次
      foreign: null,
      autoInc: true
    }
  );

  // todo
  ctx
    .command('开团 <raid_name:string> <raid_time:date>')
    .action(async (argv, raid_name: string, raid_time: Date) => {
      if (!argv?.session) return;
      if (!ctx.database) {
        return '数据库未就绪，请联系管理员';
      }
      const session = argv.session;
      const one = await ctx.database.get(raid_table_name, {
        raid_name: { $eq: raid_name }
      });
      if (one && one.length > 0) {
        return '团已经存在！';
      }
      await ctx.database.create(raid_table_name, {
        raid_name,
        max_members: 40,
        raid_leader: session.userId,
        raid_time: raid_time,
        raid_server: '陆行鸟',
        allow_sign_up: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      return '开团成功!';
    });

  ctx.command('查看当前团').action(async argv => {
    if (!argv?.session) return;
    if (!ctx.database) {
      return '数据库未就绪，请联系管理员';
    }
    const session = argv.session;
    const one = await ctx.database.get(raid_table_name, {
      raid_time: { $gt: new Date() }
    });
    if (one && one.length > 0) {
      return (
        '当前有如下团:\n' +
        one
          .map(e => e.raid_name + '    ' + e.raid_time.toLocaleString())
          .join('\n')
      );
    } else {
      return '未查询到当前有团';
    }
  });

  // todo
  ctx.command('查看报名状况').action(async argv => {
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
                e.raid_time.toLocaleString()
            )
            .join('\n'),
        messageInterval
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
      raid_name: { $eq: raid_name }
    });
    if (!sign_up || sign_up.length == 0) {
      return '当前报名人数为: 0';
    } else {
      return (
        '当前报名人数为: ' +
        sign_up.length +
        '\n' +
        sign_up
          .map(
            (s, idx) =>
              '序号: ' +
              (idx + 1) +
              '\n' +
              JSON.parse(s.content)
                .map(j => j[0] + ': ' + j[1])
                .join('\n')
          )
          .join('\n\n')
      );
    }
  });

  ctx.command('导出报名状况').action(async argv => {
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
                e.raid_time.toLocaleString()
            )
            .join('\n'),
        messageInterval
      );
    } else {
      return '未查询到当前有团';
    }

    const code = parseInt(await session.prompt(), 10) || -1;
    const raid = one[code - 1];
    if (!raid) {
      return '团号错误';
    }
    const raid_name = raid.raid_name;

    const sign_up = await ctx.database.get(raid_sign_up_table_name, {
      raid_name: { $eq: raid_name }
    });
    if (!sign_up || sign_up.length == 0) {
      return '当前报名人数为: 0';
    } else {
      // todo 导出csv文件
      const title =
        JSON.parse(sign_up[0].content)
          .slice(2)
          .map(p => p[0])
          .join(',') +
        '\n' +
        sign_up
          .map(s =>
            JSON.parse(s.content)
              .slice(2)
              .map(p => p[1])
              .join(',')
          )
          .join('\n');
      const buffer = new TextEncoder().encode(title);

      const root = path.join(ctx.baseDir, 'temp', 'ffxiv-raid-helper');
      const file_name =
        raid_name +
        '-' +
        raid.raid_time
          .toLocaleString('zh-CN', date_locale_options)
          .replaceAll('/', '')
          .replaceAll(' ', '')
          .replaceAll(':', '') +
        '.csv';
      const file_path = path.join(root, file_name);
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(file_path, buffer, 'utf8');
      const h_file = h.image(pathToFileURL(path.resolve(root, file_name)).href);

      logger.info(h_file);
      await session.sendQueued(h_file);
      // logger.info(h.file(buffer, 'txt/csv', { title: '1.csv' }));
      // await session.sendQueued(h.file(buffer, 'txt/csv', { title: '1.csv' }));
    }
  });

  ctx.command('查看报名申请').action(async argv => {
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
                e.raid_time.toLocaleString()
            )
            .join('\n'),
        messageInterval
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
  });

  ctx.command('报名').action(async argv => {
    if (!argv?.session) return;
    const session = argv.session;
    // 免责条款
    await session.sendQueued(
      '欢迎报名，请仔细阅读并回答以下问题即可完成报名',
      messageInterval
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
                e.raid_time.toLocaleString()
            )
            .join('\n'),
        messageInterval
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
      const res_code = await onQuestion(session, q, results);
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
  });
}
