import { Session } from 'koishi';
import { Config } from '../config/settings';
import { Answer, Question } from '../constant/question';
import { ErrorCode } from '../constant/common';

export const onQuestion = async (
  config: Config,
  session: Session,
  question: Question,
  results: Map<string, Answer>,
  max_retry_time: number = 3
): Promise<ErrorCode> => {
  if (max_retry_time <= 0) {
    return ErrorCode.MaxRetry;
  }

  if (question.skip(results)) {
    // 跳过问题时存入空白答案，方便对齐
    results.set(question.label, {
      label: question.label,
      name: question.name,
      answer: '',
      preitter_answer: ''
    });
    return ErrorCode.OK;
  }
  await session.sendQueued(
    question.construct_content(results),
    config.message_interval
  );
  const res_accept = await session.prompt();
  if (!res_accept) return ErrorCode.Timeout;

  if (!question.accept_answer(res_accept, results)) {
    await session.sendQueued('输入不合法，请重新输入', config.message_interval);
    return onQuestion(config, session, question, results, max_retry_time - 1);
  }
  results.set(question.label, {
    label: question.label,
    name: question.name,
    answer: res_accept,
    preitter_answer: question.construct_preitter_answer(res_accept, results)
  });
  return ErrorCode.OK;
};

export const askOneQuestion = async (
  config: Config,
  session: Session,
  problem: Question,
  max_retry_time: number = 3
): Promise<Answer | undefined> => {
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

export const parseAnswerMap = (content: string): Map<string, Answer> => {
  return new Map<string, Answer>(JSON.parse(content));
};
