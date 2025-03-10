import { Config } from '../config/settings';
import { TeamListTable } from './db';
import { buildQuestion, IQuestion, Question, QuestionType } from './question';

export const duties: Readonly<Record<string, ReadonlyArray<string>>> = {
  坦克: ['骑士', '战士', '黑骑', '绝枪'],
  治疗: ['白魔', '学者', '占星', '贤者'],
  近战: ['武僧', '龙骑', '忍者', '武士', '镰刀', '蝰蛇'],
  远敏: ['诗人', '机工', '舞者'],
  法系: ['黑魔', '召唤', '赤魔', '绘灵'],
  全能: []
};

/**
 * 通用报名表
 */
const common = (raid: TeamListTable, config: Config) => {
  const questions: IQuestion[] = [
    {
      label: 'NEWBIE',
      type: QuestionType.Boolean,
      name: '是否初见',
      content: '是否已经通关该副本？',
      answer_range: [1, 0],
      answer_range_desc: ['是', '否'],
      construct_preitter_answer: answer => {
        const num = parseInt(answer);
        return num === 1 ? '否' : '是'; // 展示和记录上反转
      }
    },
    {
      label: 'SERVER',
      type: QuestionType.SignleChoice,
      name: '所在服务器',
      content: '所在服务器',
      answer_range_desc: config.region_server_map[raid.team_region]
    },
    {
      label: 'NICKNAME',
      type: QuestionType.Text,
      name: '角色姓名',
      content: '角色名字（须与角色名字完全一致，并区分大小写）'
    },
    {
      label: 'DYNAMIC_DUTY',
      type: QuestionType.Boolean,
      name: '是否接受调剂',
      content:
        '选择职业前请您注意，我们保证所有的开荒位置先到先得，但是如果您所选择的职能已经满员了，您是否愿意被调剂到其他职能？'
    },
    {
      label: 'MAIN_DUTY',
      type: QuestionType.SignleChoice,
      name: '主选职能',
      content: '职能-职业选择:职能',
      construct_range: input =>
        new Map(
          Object.keys(duties)
            .filter(
              duty =>
                input.get('NEWBIE').preitter_answer != '是' || duty != '全能'
            )
            .map((duty, idx) => [(idx + 1).toString(), duty])
        )
    },
    {
      label: 'MAIN_JOB',
      type: QuestionType.SignleChoice,
      name: '主选职业',
      content: '职能-职业选择:职业',
      construct_range: input => {
        const filter_duties = Object.keys(duties).filter(
          duty => input.get('NEWBIE').preitter_answer != '是' || duty != '全能'
        );
        const duty = filter_duties[parseInt(input.get('MAIN_DUTY').answer) - 1];
        return new Map(
          duties[duty].map((job, idx) => [(idx + 1).toString(), job])
        );
      },
      skip: input => {
        return input.get('MAIN_DUTY').preitter_answer == '全能';
      }
    },
    {
      label: 'SECOND_DUTY',
      type: QuestionType.SignleChoice,
      name: '次选职能',
      content: '职能-职业选择:次选职能',
      construct_range: input =>
        new Map(
          Object.keys(duties)
            .filter(
              duty =>
                duty != input.get('MAIN_DUTY').preitter_answer &&
                (input.get('NEWBIE').preitter_answer != '是' || duty != '全能')
            )
            .map((duty, idx) => [(idx + 1).toString(), duty])
        ),
      skip: input =>
        input.get('MAIN_DUTY').preitter_answer == '全能' ||
        input.get('DYNAMIC_DUTY').preitter_answer == '否'
    },
    {
      label: 'SECOND_JOB',
      type: QuestionType.SignleChoice,
      name: '次选职业',
      content: '职能-职业选择:次选职业',
      construct_range: input => {
        const filter_duties = Object.keys(duties).filter(
          duty =>
            duty != input.get('MAIN_DUTY').preitter_answer &&
            (input.get('NEWBIE').preitter_answer != '是' || duty != '全能')
        );
        const duty =
          filter_duties[parseInt(input.get('SECOND_DUTY').answer) - 1];
        return new Map(
          duties[duty].map((job, idx) => [(idx + 1).toString(), job])
        );
      },
      skip: input =>
        input.get('MAIN_DUTY').preitter_answer == '全能' ||
        input.get('SECOND_DUTY').preitter_answer == '全能' ||
        input.get('DYNAMIC_DUTY').preitter_answer == '否'
    },
    {
      label: 'COMMENT',
      name: '留言',
      type: QuestionType.Text,
      content:
        '还有什么废话是你想说给指挥听的吗？有的话请在下面畅所欲言吧~(没有的话输入无，不要发图)',
      allow_empty: true
    }
  ];
  return questions.map(question => buildQuestion(question));
};

/**
 * 零式女王古殿报名表
 */
const queen = (raid: TeamListTable, config: Config) => {
  const questions: IQuestion[] = [
    // {
    //   label: '0',
    //   content:
    //     '1.<b>请您确保已经详细阅读过所有的相关群公告再提交报名表，如果因为未阅读群公告导致的所有问题你将负全部责任。</b>(No退出，其它任意输入继续)'
    // },
    {
      label: 'NEWBIE',
      type: QuestionType.Boolean,
      name: '是否初见',
      content: '是否已经通关零式女王古殿？',
      answer_range: [1, 0],
      answer_range_desc: ['是', '否'],
      construct_preitter_answer: answer => {
        const num = parseInt(answer);
        return num === 1 ? '否' : '是'; // 展示和记录上反转
      }
    },
    {
      label: 'SERVER',
      type: QuestionType.SignleChoice,
      name: '所在服务器',
      content: '所在服务器',
      answer_range_desc: config.region_server_map[raid.team_region]
    },
    {
      label: 'NICKNAME',
      type: QuestionType.Text,
      name: '角色姓名',
      content: '角色名字（须与角色名字完全一致，并区分大小写）'
    },
    // {
    //   label: 'CONTACT_QQ',
    //   type: QuestionType.Text,
    //   name: 'QQ(问卷填写)',
    //   content: 'QQ'
    // },
    {
      label: 'DYNAMIC_DUTY',
      type: QuestionType.Boolean,
      name: '是否接受调剂',
      content:
        '选择职业前请您注意，我们保证所有的开荒位置先到先得，但是如果您所选择的职能已经满员了，您是否愿意被调剂到其他职能？'
    },
    {
      label: 'MAIN_DUTY',
      type: QuestionType.SignleChoice,
      name: '主选职能',
      content: '职能-职业选择:职能',
      construct_range: input =>
        new Map(
          Object.keys(duties)
            .filter(
              duty =>
                input.get('NEWBIE').preitter_answer != '是' || duty != '全能'
            )
            .map((duty, idx) => [(idx + 1).toString(), duty])
        )
    },
    {
      label: 'MAIN_JOB',
      type: QuestionType.SignleChoice,
      name: '主选职业',
      content: '职能-职业选择:职业',
      construct_range: input => {
        const filter_duties = Object.keys(duties).filter(
          duty => input.get('NEWBIE').preitter_answer != '是' || duty != '全能'
        );
        const duty = filter_duties[parseInt(input.get('MAIN_DUTY').answer) - 1];
        return new Map(
          duties[duty].map((job, idx) => [(idx + 1).toString(), job])
        );
      },
      skip: input => {
        return input.get('MAIN_DUTY').preitter_answer == '全能';
      }
    },
    {
      label: 'SECOND_DUTY',
      type: QuestionType.SignleChoice,
      name: '次选职能',
      content: '职能-职业选择:次选职能',
      construct_range: input =>
        new Map(
          Object.keys(duties)
            .filter(
              duty =>
                duty != input.get('MAIN_DUTY').preitter_answer &&
                (input.get('NEWBIE').preitter_answer != '是' || duty != '全能')
            )
            .map((duty, idx) => [(idx + 1).toString(), duty])
        ),
      skip: input =>
        input.get('MAIN_DUTY').preitter_answer == '全能' ||
        input.get('DYNAMIC_DUTY').preitter_answer == '否'
    },
    {
      label: 'SECOND_JOB',
      type: QuestionType.SignleChoice,
      name: '次选职业',
      content: '职能-职业选择:次选职业',
      construct_range: input => {
        const filter_duties = Object.keys(duties).filter(
          duty =>
            duty != input.get('MAIN_DUTY').preitter_answer &&
            (input.get('NEWBIE').preitter_answer != '是' || duty != '全能')
        );
        const duty =
          filter_duties[parseInt(input.get('SECOND_DUTY').answer) - 1];
        return new Map(
          duties[duty].map((job, idx) => [(idx + 1).toString(), job])
        );
      },
      skip: input =>
        input.get('MAIN_DUTY').preitter_answer == '全能' ||
        input.get('SECOND_DUTY').preitter_answer == '全能' ||
        input.get('DYNAMIC_DUTY').preitter_answer == '否'
    },
    {
      label: 'RED_STAR',
      name: '红色勋章层数',
      type: QuestionType.SignleChoice,
      content: '请您输入角色现有红色的战斗勋章层数:',
      answer_range: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      wrap: false
    },
    // {
    //   label: '10',
    //   content:
    //     '有亲友和您是一起来报名的吗？如果有的话需要把你们安排在同一队里吗？他的id是什么？\n(有的，我的朋友是xxx/没有)'
    // },
    {
      label: 'COMMENT',
      name: '留言',
      type: QuestionType.Text,
      content:
        '还有什么废话是你想说给指挥听的吗？有的话请在下面畅所欲言吧~(没有的话输入无，不要发图)',
      allow_empty: true
    }
  ];
  return questions.map(question => buildQuestion(question));
};

/**
 * 灭云，暂时和通用一样
 */
const cloud = common;
export const getSheet = (
  raid: TeamListTable,
  config: Config
): ReadonlyArray<Question> => {
  switch (config.group_config_map[raid.group_name].group_type) {
    case 'common':
      return common(raid, config);
    case 'queen':
      return queen(raid, config);
    case 'cloud':
      return cloud(raid, config);
  }
};
