import { Context, Schema, Session, Time } from 'koishi';
import logger from './utils/logger';

export const name = 'ffxiv-raid-helper';

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

const messageInterval = 3 * Time.second;

const enum ErrorCode {
  Unknown = -1,
  OK = 0,
  Timeout,
  Reject
}

const questions = [
  '1.<b>请您确保已经详细阅读过所有的相关群公告再提交报名表，如果因为未阅读群公告导致的所有问题你将负全部责任。</b>(No退出，其它任意输入继续)',
  '2.是否在<b>XXXX零式女王古殿开荒团</b>通关了副本？\n(是/否)',
  '3.所在大区-服务器:\n(如 陆行鸟-神意之地)',
  '4.角色姓名',
  '5.QQ',
  '6.选择职业前请您注意，我们保证所有的开荒位置先到先得，但是如果您所选择的职能已经满员了，您是否愿意被调剂到其他职能？\n(是/否)',
  '7.职能-职业选择:职能-职业\n(坦克/近战/远敏/法系/治疗-黑魔)',
  '8.职能-职业选择:次选 职能-职业\n(坦克/近战/远敏/法系/治疗-武士)',
  '9.请您输入角色**现有**的战斗勋章层数:伤害量加成勋章（红色）/血量加成勋章（蓝色）/治疗量加成勋章（绿色）\n(0/2/0)',
  '10.有亲友和您是一起来报名的吗？如果有的话需要把你们安排在同一队里吗？他的id是什么？\n(有的，我的朋友是xxx/没有)',
  '11.还有什么废话是你想说给指挥听的吗？有的话请在下面畅所欲言吧~'
];

const onQuestion = async (
  session: Session,
  problem: string,
  results: string[]
) => {
  await session.sendQueued(problem, messageInterval);
  const res_accept = await session.prompt();
  if (!res_accept) return ErrorCode.Timeout;
  results.push(res_accept);
  return ErrorCode.OK;
};

export function apply(ctx: Context) {
  // write your plugin here
  ctx.command('报名').action(async argv => {
    if (!argv?.session) return;
    const session = argv.session;
    logger.info('开始报名');
    // 免责条款
    await session.sendQueued(
      '欢迎报名，请仔细阅读并回答以下问题即可完成报名',
      messageInterval
    );

    await session.sendQueued(questions[0], messageInterval);
    const res_accept = await session.prompt();
    if (!res_accept) return '输入超时，报名结束';
    if (res_accept.toString().toLowerCase() == 'no') {
      await session.sendQueued('报名结束，欢迎下次光临', messageInterval);
    }

    const sheet = [...questions.reverse()];
    const results: string[] = ['0'];
    sheet.pop(); // 弹出免责条款
    while (sheet.length > 0) {
      const res_code = await onQuestion(session, sheet.pop(), results);
      if (res_code == ErrorCode.Timeout) {
        return '输入超时，报名结束';
      }
    }

    const res =
      '报名内容：\n' +
      '区服：' +
      results[3 - 1].toString() +
      '\n' +
      '游戏ID：' +
      results[4 - 1].toString() +
      '\n' +
      '是否过本：' +
      results[2 - 1].toString() +
      '\n' +
      'QQ：' +
      results[5 - 1].toString() +
      '\n' +
      '接受调剂：' +
      results[6 - 1].toString() +
      '\n' +
      '主选：' +
      results[7 - 1].toString() +
      '\n' +
      '次选：' +
      results[8 - 1].toString() +
      '\n' +
      '战斗勋章层数：' +
      results[9 - 1].toString() +
      '\n' +
      '亲友：' +
      results[10 - 1].toString() +
      '\n' +
      '留言：' +
      results[11 - 1].toString() +
      '\n';
    await session.sendQueued(res);
    return '报名提交成功!请关注群公告里面的报名结果~';
  });
}
