import { Schema, Time } from 'koishi';

export interface Config {
  message_interval: number;
}

export const Config: Schema<Config> = Schema.object({
  message_interval: Schema.number()
    .default(3 * Time.second)
    .min(0)
    .step(1000)
    .description('每轮消息发送间隔，单位毫秒')
});
