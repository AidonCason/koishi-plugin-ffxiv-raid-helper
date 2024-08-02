import { Session } from 'koishi';
import { Config } from '../config/settings';
import { Answer, Question } from '../constant/question';
import { ErrorCode } from '../constant/common';

export const onQuestion = async (
  config: Config,
  session: Session,
  problem: Question,
  results: Map<string, Answer>,
  max_retry_time: number = 3
) => {
  if (max_retry_time <= 0) {
    return ErrorCode.MaxRetry;
  }

  await session.sendQueued(
    problem.construct_content(results),
    config.message_interval
  );
  const res_accept = await session.prompt();
  if (!res_accept) return ErrorCode.Timeout;

  if (!problem.accept_answer(res_accept, results)) {
    await session.sendQueued('输入不合法，请重新输入', config.message_interval);
    return onQuestion(config, session, problem, results, max_retry_time - 1);
  }
  results.set(problem.label, {
    label: problem.label,
    name: problem.name,
    answer: res_accept,
    preitter_answer: problem.construct_preitter_answer(res_accept, results)
  });
  return ErrorCode.OK;
};

export const askOneQuestion = async (
  config: Config,
  session: Session,
  problem: Question,
  max_retry_time: number = 3
) => {
  const results = new Map<string, Answer>();
  const code = await onQuestion(
    config,
    session,
    problem,
    results,
    max_retry_time
  );
  if (code === ErrorCode.MaxRetry) {
    session.sendQueued('重试次数过多，已退出', config.message_interval);
    return;
  } else if (code === ErrorCode.Timeout) {
    session.sendQueued('超时，已退出', config.message_interval);
    return;
  }
  return results.get(problem.label);
};
