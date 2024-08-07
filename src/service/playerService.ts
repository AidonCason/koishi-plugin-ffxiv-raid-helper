import { Context, Argv, Session } from 'koishi';
import { Config } from '../config/settings';
import { ErrorCode } from '../constant/common';
import { sendNotice } from './noticeService';
import { selectTeam } from '../utils/team';
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
  selectAllCanceledSignupByTeamNameAndUserId,
  selectAllValidSignupByTeamNameAndUserId,
  selectValidSignupByTeamName
} from '../dao/signupDAO';
import logger from '../utils/logger';
import { askOneQuestion, onQuestion, parseAnswerMap } from '../utils/question';
import { getUserGroups } from '../utils/group';

const checkUserIsInGroup = async (session: Session, config: Config) => {
  const userGroups = await getUserGroups(session, config);

  if (userGroups.size == 0) {
    logger.warn(`user ${session.userId} not in any group`);
    return false;
  }
  return true;
};

const applyHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  if (!(await checkUserIsInGroup(session, config))) {
    return '请先加群再报名';
  }
  const team = await selectTeam(ctx, config, session, '请选择要报名的团');
  if (!team) return;
  if (!team.allow_sign_up) {
    return '该团已关闭报名！';
  }
  // 开团前24小时截止报名
  const now = new Date();
  const deadline = new Date(team.raid_start_time);
  deadline.setHours(deadline.getHours() - 24);
  if (now > deadline) {
    return '开团前24小时截止报名，如有特殊情况请联系指挥';
  }

  const team_name = team.team_name;

  const sign_ups = await selectValidSignupByTeamName(ctx, team_name);
  const self = sign_ups.find(s => s.user_id == session.userId);
  // 报名满了，且非重新报名
  if (!self && sign_ups && sign_ups.length >= team.max_members) {
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
    await cancelSignup(ctx, self.id);
    await session.sendQueued('已取消报名', config.message_interval);
  }

  const self_signups = await selectAllCanceledSignupByTeamNameAndUserId(
    ctx,
    team_name,
    session.userId
  );
  if (self_signups && self_signups.length > 3) {
    return '取消报名过多，无法重新报名，如有需要请联系指挥说明';
  }
  const sheet = [...getSheet(team, config)].reverse();
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
  results.set('CONTACT_QQ_FETCHED', {
    label: 'CONTACT_QQ_FETCHED',
    name: 'QQ(报名使用)',
    answer: session.userId,
    preitter_answer: session.userId
  });
  const output_pairs = Array.from(results.values()).map(r => [
    r.name,
    r.preitter_answer
  ]);
  sendNotice(
    ctx,
    config,
    session.bot,
    team_name,
    `${team_name} 收到来自${session.userId}的一份新的报名表`
  );
  await session.sendQueued(
    output_pairs.map(p => p[0] + ': ' + p[1]).join('\n')
  );
  await createSignup(
    ctx,
    team_name,
    session.userId,
    JSON.stringify(Array.from(results))
  );
  return '报名提交成功!请关注群公告里面的报名结果~';
};

const checkSelfHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectTeam(ctx, config, session, '请选择要查看的团');
  if (!team) return;
  const team_name = team.team_name;

  const sign_up = await selectAllValidSignupByTeamNameAndUserId(
    ctx,
    team_name,
    session.userId
  );
  if (sign_up && sign_up.length > 0) {
    return (
      '已经提交报名申请:\n' +
      Array.from(parseAnswerMap(sign_up[0].content).entries())
        .map(v => v[1].name + ': ' + v[1].preitter_answer)
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
  const team = await selectTeam(ctx, config, session, '请选择要取消报名的团');
  if (!team) return;
  const team_name = team.team_name;

  const sign_ups = await selectAllValidSignupByTeamNameAndUserId(
    ctx,
    team_name,
    session.userId
  );
  if (!sign_ups || sign_ups.length == 0) {
    return '未报名该团!';
  }
  for (const sign_up of sign_ups) {
    await cancelSignup(ctx, sign_up.id);
  }
  sendNotice(
    ctx,
    config,
    session.bot,
    team_name,
    `${team_name} ${session.userId}取消报名`
  );
  return '已取消报名申请';
};

const contactLeaderHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv
) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectTeam(ctx, config, session, '请选择要联系的团');
  if (!team) return;
  return '指挥的联系方式为：qq： ' + team.team_leader;
};

export {
  applyHandler,
  checkSelfHandler,
  cancelSignupHandler,
  contactLeaderHandler
};
