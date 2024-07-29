import { Schema, Time } from 'koishi';

export interface Config {
  message_interval: number;
  notice_users: string[];
  notice_groups: string[];
}

export const Config: Schema<Config> = Schema.object({
  message_interval: Schema.number()
    .default(3 * Time.second)
    .min(0)
    .step(1000)
    .description('每轮消息发送间隔，单位毫秒'),
  notice_users: Schema.array(Schema.string()),
  notice_groups: Schema.array(Schema.string())
});
