import { Schema, Time } from 'koishi';

export interface Config {
  message_interval: number;
  region_server_map: { [key: string]: string[] };
  group_config_map: {
    [key: string]: {
      platform: 'onebot' | 'sandbox';
      admin: string;
      group_type: 'common' | 'queen' | 'cloud';
      leaders: {
        user_id: string;
        admin: boolean;
        nickname: string;
        signup_notice_in_time: boolean;
        signup_notice_with_timer: boolean;
      }[];
      chat_groups: {
        group_id: string;
        comment: string;
        begin_notice: boolean;
        signup_notice_in_time: boolean;
        signup_notice_with_timer: boolean;
      }[];
      region_name: string;
      ignore_server: boolean;
    };
  };
  friend_request_auto_accept: boolean;
}

// 正则表达式：内容不为空且前后没有空格
const not_empty_reg = /^\S(.*\S)?$/;

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    message_interval: Schema.number()
      .default(3 * Time.second)
      .min(0 * Time.second)
      .step(Time.second)
      .description('每轮消息发送间隔，单位毫秒'),
    friend_request_auto_accept: Schema.boolean()
      .default(true)
      .description('自动接受来自群内的好友请求')
  }).description('基础设置'),
  Schema.object({
    region_server_map: Schema.dict(
      Schema.array(Schema.string().pattern(not_empty_reg))
        .role('table')
        .description('小区的名字'),
      Schema.string().pattern(not_empty_reg).description('大区名').required()
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
      .description('服务器区服的对应关系')
  }).description('区服设置'),
  Schema.object({
    group_config_map: Schema.dict(
      Schema.object({
        platform: Schema.union(['onebot', 'sandbox'])
          .description('机器人平台')
          .default('onebot'),
        admin: Schema.string()
          .pattern(not_empty_reg)
          .description('团长的user_id')
          .required(),
        group_type: Schema.union(['common', 'queen', 'cloud'])
          .description('团类型')
          .default('queen'),
        leaders: Schema.array(
          Schema.object({
            user_id: Schema.string()
              .pattern(not_empty_reg)
              .description('平台user_id')
              .required(),
            admin: Schema.boolean().description('拥有admin权限').default(false),
            nickname: Schema.string().description('昵称'),
            signup_notice_in_time: Schema.boolean()
              .description('实时接收报名消息')
              .default(false),
            signup_notice_with_timer: Schema.boolean()
              .description('定时接收报名消息')
              .default(false)
          })
        )
          .role('table')
          .description('指挥列表'),
        chat_groups: Schema.array(
          Schema.object({
            group_id: Schema.string()
              .pattern(not_empty_reg)
              .description('群组id')
              .required(),
            comment: Schema.string().description('备注'),
            begin_notice: Schema.boolean()
              .description('接收发车通知')
              .default(true),
            signup_notice_in_time: Schema.boolean()
              .description('实时接收报名消息')
              .default(false),
            signup_notice_with_timer: Schema.boolean()
              .description('定时接收报名消息')
              .default(false)
          })
        )
          .role('table')
          .description('相关的群列表'),
        region_name: Schema.string()
          .description('团所在服务器（大区）')
          .required(),
        ignore_server: Schema.boolean()
          .description('跨区支持，开启后不关注区服')
          .default(false)
          .experimental()
      }).collapse(),
      Schema.string().pattern(not_empty_reg).description('团名').required()
    ).description('团配置')
  }).description('团设置')
]);
