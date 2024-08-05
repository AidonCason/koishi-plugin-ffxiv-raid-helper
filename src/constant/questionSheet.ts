import { Config } from '../config/settings';
import { buildQuestion, QuestionDefine, QuestionType } from './question';

export const duties: Readonly<Record<string, ReadonlyArray<string>>> = {
  坦克: ['骑士', '战士', '黑骑', '绝枪'],
  治疗: ['白魔', '学者', '占星', '贤者'],
  近战: ['武僧', '龙骑', '忍者', '武士', '镰刀'],
  远敏: ['诗人', '机工', '武者'],
  法系: ['黑魔', '召唤', '赤魔']
};

export const getSheet = (server_name: string, config: Config) => {
  const questions: ReadonlyArray<QuestionDefine> = [
    // {
    //   label: '0',
    //   content:
    //     '1.<b>请您确保已经详细阅读过所有的相关群公告再提交报名表，如果因为未阅读群公告导致的所有问题你将负全部责任。</b>(No退出，其它任意输入继续)'
    // },
    {
      label: '2',
      type: QuestionType.Boolean,
      name: '是否初见',
      content: '是否已经通关零式女王古殿？'
    },
    {
      label: '3',
      type: QuestionType.SignleChoice,
      name: '所在服务器',
      content: '所在服务器',
      construct_range: () =>
        new Map(
          config.server_name_map[server_name].map((server, idx) => [
            (idx + 1).toString(),
            server
          ])
        )
    },
    {
      label: '4',
      type: QuestionType.Text,
      name: '角色姓名',
      content: '角色姓名'
    },
    {
      label: '5',
      type: QuestionType.Text,
      name: 'QQ(问卷填写)',
      content: 'QQ'
    },
    {
      label: '6',
      type: QuestionType.Boolean,
      name: '是否接受调剂',
      content:
        '选择职业前请您注意，我们保证所有的开荒位置先到先得，但是如果您所选择的职能已经满员了，您是否愿意被调剂到其他职能？',
      answer_range: [1, 0]
    },
    {
      label: '7',
      type: QuestionType.SignleChoice,
      name: '主选职能',
      content: '职能-职业选择:职能',
      construct_range: () =>
        new Map(
          Object.keys(duties).map((duty, idx) => [(idx + 1).toString(), duty])
        )
    },
    {
      label: '7-1',
      type: QuestionType.SignleChoice,
      name: '主选职业',
      content: '职能-职业选择:职业',
      construct_range: input => {
        const duty = Object.keys(duties)[parseInt(input.get('7').answer) - 1];
        return new Map(
          duties[duty].map((job, idx) => [(idx + 1).toString(), job])
        );
      }
    },
    {
      label: '8',
      type: QuestionType.SignleChoice,
      name: '次选职能',
      content: '职能-职业选择:次选职能',
      construct_range: () =>
        new Map(
          Object.keys(duties).map((duty, idx) => [(idx + 1).toString(), duty])
        )
    },
    {
      label: '8-1',
      type: QuestionType.SignleChoice,
      name: '次选职业',
      content: '职能-职业选择:次选职业',
      construct_range: input => {
        const duty = Object.keys(duties)[parseInt(input.get('8').answer) - 1];
        return new Map(
          duties[duty].map((job, idx) => [(idx + 1).toString(), job])
        );
      }
    },
    {
      label: '9',
      name: '红色勋章层数',
      type: QuestionType.SignleChoice,
      content: '请您输入角色现有红色的战斗勋章层数:',
      answer_range: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    // {
    //   label: '10',
    //   content:
    //     '有亲友和您是一起来报名的吗？如果有的话需要把你们安排在同一队里吗？他的id是什么？\n(有的，我的朋友是xxx/没有)'
    // },
    {
      label: '11',
      name: '留言',
      type: QuestionType.Text,
      content:
        '还有什么废话是你想说给指挥听的吗？有的话请在下面畅所欲言吧~(没有的话输入任意内容)'
    }
  ];
  return questions.map(question => buildQuestion(question)) as ReadonlyArray<
    ReturnType<typeof buildQuestion>
  >;
};
