import { SessionError } from 'koishi';
import moment from 'moment';

export function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}

export function parseDateTime(date_text: string): Date {
  const date = moment(date_text, 'YYYYMMDD HHmm').toDate();
  if (!date || !isValidDate(date)) {
    throw new SessionError('日期输入错误，参考 20240101 2000');
  }
  return date;
}
