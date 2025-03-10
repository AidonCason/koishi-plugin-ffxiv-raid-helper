import { Context, Argv } from 'koishi';
import { Config } from '../config/settings';
import { ErrorCode } from '../constant/common';
import { sendNoticeInTime } from './noticeService';
import { selectCurrentTeam } from '../utils/team';
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
  selectAllCanceledSignupByTeamIdAndUserId,
  selectAllValidSignupByTeamIdAndUserId,
  selectValidSignupByTeamId
} from '../dao/signupDAO';
import logger from '../utils/logger';
import { askOneQuestion, onQuestion, parseAnswerMap } from '../utils/question';
import { checkIfInBlackList } from './blackListService';
import {
  refreshInnerGhostById,
  selectInnerGhostByGroupNameAndUserId
} from '../dao/innerghostDAO';

const applyHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectCurrentTeam(ctx, config, session);
  if (!team.allow_sign_up) {
    return '该团已关闭报名！';
  }
  // 开团前24小时截止报名
  const now = new Date();
  const deadline = new Date(team.raid_start_time);
  deadline.setHours(deadline.getHours() - 24);
  if (now > deadline) {
    return '开团前24小时关闭报名功能，如有特殊情况请联系指挥';
  }
  const sign_ups = await selectValidSignupByTeamId(ctx, team.id);
  const self = sign_ups.find(s => s.user_id == session.userId);
  logger.debug('self:', self);
  // 报名过了，询问是否重新报名
  if (self) {
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
      return '取消重新报名';
    }
    await cancelSignup(ctx, self.id);
    await session.sendQueued('已取消上一次的报名', config.message_interval);
  } else {
    // 报名满了，且非重新报名
    if (sign_ups && sign_ups.length >= team.max_members) {
      return '已经报名满了，请下次再来或查看其他团';
    }
  }
  // 开始报名了
  // 检查取消报名次数
  const self_signups = await selectAllCanceledSignupByTeamIdAndUserId(
    ctx,
    team.id,
    session.userId
  );
  if (self_signups && self_signups.length > 3) {
    return '取消报名过多，无法重新报名，如有需要请联系指挥说明';
  }
  // 查询内鬼
  const inner_ghost = await selectInnerGhostByGroupNameAndUserId(
    ctx,
    team.group_name,
    session.userId
  );
  // 开始问问题
  const sheet = [...getSheet(team, config)].reverse();
  const results: Map<string, Answer> = new Map();
  while (sheet.length > 0) {
    const question = sheet.pop();

    // 内鬼跳过部分问题
    if (inner_ghost && inner_ghost.length > 0) {
      if (question.label == 'NEWBIE') {
        // 初见，显然
        results.set(question.label, {
          label: question.label,
          name: question.name,
          answer: '0',
          preitter_answer: '否'
        });
        continue;
      }
      if (question.label == 'SERVER') {
        // 服务器
        results.set(question.label, {
          label: question.label,
          name: question.name,
          answer: inner_ghost[0].server,
          preitter_answer: inner_ghost[0].server
        });
        continue;
      }
      if (question.label == 'NICKNAME') {
        // 昵称
        results.set(question.label, {
          label: question.label,
          name: question.name,
          answer: inner_ghost[0].user_name,
          preitter_answer: inner_ghost[0].user_name
        });
        continue;
      }
      if (question.label == 'DYNAMIC_DUTY') {
        // 接受调剂
        results.set(question.label, {
          label: question.label,
          name: question.name,
          answer: '1',
          preitter_answer: '是'
        });
        continue;
      }
      if (question.label == 'MAIN_JOB') {
        // 主职，不填，职能即可
        results.set(question.label, {
          label: question.label,
          name: question.name,
          answer: '',
          preitter_answer: ''
        });
        continue;
      }
      if (question.label == 'SECOND_JOB') {
        // 副职，同上
        results.set(question.label, {
          label: question.label,
          name: question.name,
          answer: '',
          preitter_answer: ''
        });
        continue;
      }
      if (question.label == 'RED_STAR') {
        // 红章，无所谓
        results.set(question.label, {
          label: question.label,
          name: question.name,
          answer: '',
          preitter_answer: ''
        });
        continue;
      }
    }

    const res_code = await onQuestion(config, session, question, results);
    if (res_code == ErrorCode.MaxRetry) {
      return '失败次数过多，报名退出';
    }
    if (res_code == ErrorCode.Timeout) {
      return '输入超时，报名结束';
    }
  }
  // 把报名用的qq填上
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
  // 给报名者展示一下
  await session.sendQueued(
    output_pairs.map(p => p[0] + ': ' + p[1]).join('\n')
  );

  const server = results.get('SERVER')?.preitter_answer;
  const user_name = results.get('NICKNAME')?.preitter_answer;

  const is_banned = await checkIfInBlackList(
    ctx,
    team.group_name,
    session.userId,
    user_name,
    server
  );

  if (is_banned) {
    sendNoticeInTime(
      ctx,
      config,
      session.bot,
      team.id,
      `${team.team_name} ${user_name}@${server}（${session.userId}）报名失败，黑名单中的用户`
    );
    return '报名失败，黑名单中的用户，请联系指挥';
  }

  // 保存到数据库
  await createSignup(
    ctx,
    team.id,
    session.userId,
    JSON.stringify(Array.from(results))
  );
  // 发送通知
  sendNoticeInTime(
    ctx,
    config,
    session.bot,
    team.id,
    `${team.team_name} ${user_name}@${server}（${session.userId}）报名成功`
  );
  if (inner_ghost && inner_ghost.length > 0) {
    refreshInnerGhostById(ctx, inner_ghost[0].id);
  }
  return '报名提交成功!请关注群公告里面的报名结果~';
};

const checkSelfHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectCurrentTeam(ctx, config, session);
  const sign_up = await selectAllValidSignupByTeamIdAndUserId(
    ctx,
    team.id,
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
  const team = await selectCurrentTeam(ctx, config, session);
  const sign_ups = await selectAllValidSignupByTeamIdAndUserId(
    ctx,
    team.id,
    session.userId
  );
  if (!sign_ups || sign_ups.length == 0) {
    return '未报名该团!';
  }
  if (!team.allow_sign_up) {
    return '该团已关闭报名，若要取消报名，请联系指挥';
  }
  // 开团前24小时截止报名
  const now = new Date();
  const deadline = new Date(team.raid_start_time);
  deadline.setHours(deadline.getHours() - 24);
  if (now > deadline) {
    return '开团前24小时关闭报名功能，如有特殊情况请联系指挥';
  }
  for (const sign_up of sign_ups) {
    await cancelSignup(ctx, sign_up.id);
  }
  const answer = parseAnswerMap(sign_ups[0].content);
  const server = answer.get('SERVER')?.preitter_answer;
  const user_name = answer.get('NICKNAME')?.preitter_answer;
  sendNoticeInTime(
    ctx,
    config,
    session.bot,
    team.id,
    `${team.team_name} ${user_name}@${server}（${session.userId}）取消报名`
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
  const team = await selectCurrentTeam(ctx, config, session);
  return `${team.group_name} ${team.team_name} 的指挥联系方式为：qq： ${team.team_leader}`;
};

export {
  applyHandler,
  checkSelfHandler,
  cancelSignupHandler,
  contactLeaderHandler
};
