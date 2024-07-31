import { Schema, Time } from 'koishi';

export interface Config {
  message_interval: number;
  notice_users: string[];
  notice_groups: string[];
  server_name_map: { [key: string]: string[] };
  server_group_map: { [key: string]: string[] };
}

export const Config: Schema<Config> = Schema.object({
  message_interval: Schema.number()
    .default(3 * Time.second)
    .min(0)
    .step(1000)
    .description('每轮消息发送间隔，单位毫秒'),
  notice_users: Schema.array(Schema.string()),
  notice_groups: Schema.array(Schema.string()),
  server_name_map: Schema.dict(Schema.array(Schema.string()).role('table')).default({
    "陆行鸟": [
      '红玉海',
      '神意之地',
      '拉诺西亚',
      '幻影群岛',
      '萌芽池',
      '宇宙和音',
      '沃仙曦染',
      '晨曦王座'
    ],
    "莫古力":[
      '白金幻象',
      '神拳痕',
      '潮风亭',
      '白银乡',
      '旅人栈桥',
      '拂晓之间',
      '龙巢神殿',
      '梦羽宝境'
    ],
    "猫小胖": [
      '紫水栈桥',
      '静语庄园',
      '延夏',
      '摩杜纳',
      '海猫茶屋',
      '柔风海湾',
      '琥珀原'
    ],
    "豆豆柴": [
      '水晶塔',
      '银泪湖',
      '太阳海岸',
      '伊修加德',
      '红茶川'
    ]
  }),
  server_group_map: Schema.dict(Schema.array(Schema.string()).role('table'))
});
