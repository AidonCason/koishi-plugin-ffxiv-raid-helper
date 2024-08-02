import { Schema, Time } from 'koishi';

export interface Config {
  message_interval: number;
  server_name_map: { [key: string]: string[] };
  group_config_map: {
    [key: string]: {
      platform: 'onebot' | 'sandbox';
      admin: string;
      leaders: { user_id: string; notice: boolean; admin: boolean }[];
      groups: { group_id: string; notice: boolean }[];
      server: string;
      ignore_server: boolean;
    };
  };
}

export const Config: Schema<Config> = Schema.object({
  message_interval: Schema.number()
    .default(3 * Time.second)
    .min(0)
    .step(1000)
    .description('每轮消息发送间隔，单位毫秒'),
  server_name_map: Schema.dict(
    Schema.array(Schema.string().pattern(/^\S+$/))
      .role('table')
      .description('小区的名字'),
    Schema.string().pattern(/^\S+$/).description('大区名').required()
  )
    .default({
      陆行鸟: [
        '红玉海',
        '神意之地',
        '拉诺西亚',
        '幻影群岛',
        '萌芽池',
        '宇宙和音',
        '沃仙曦染',
        '晨曦王座'
      ],
      莫古力: [
        '白金幻象',
        '神拳痕',
        '潮风亭',
        '白银乡',
        '旅人栈桥',
        '拂晓之间',
        '龙巢神殿',
        '梦羽宝境'
      ],
      猫小胖: [
        '紫水栈桥',
        '静语庄园',
        '延夏',
        '摩杜纳',
        '海猫茶屋',
        '柔风海湾',
        '琥珀原'
      ],
      豆豆柴: ['水晶塔', '银泪湖', '太阳海岸', '伊修加德', '红茶川']
    })
    .collapse()
    .description('服务器区服的对应关系'),
  group_config_map: Schema.dict(
    Schema.object({
      platform: Schema.union(['onebot', 'sandbox'])
        .description('机器人平台')
        .default('onebot'),
      admin: Schema.string().description('团长的user_id').required(),
      leaders: Schema.array(
        Schema.object({
          user_id: Schema.string().description('平台user_id').required(),
          notice: Schema.boolean().description('接收消息通知').default(true),
          admin: Schema.boolean().description('拥有admin权限').default(false)
        })
      )
        .role('table')
        .description('指挥列表'),
      groups: Schema.array(
        Schema.object({
          group_id: Schema.string().description('群组id').required(),
          notice: Schema.boolean().description('接收消息通知').default(true)
        })
      )
        .role('table')
        .description('相关的群列表'),
      server: Schema.string().description('团所在服务器（大区）').required(),
      ignore_server: Schema.boolean()
        .description('跨区支持，开启后不关注区服')
        .default(false)
    }).collapse(),
    Schema.string().pattern(/^\S+$/).description('团名').required()
  ).description('团配置')
});
