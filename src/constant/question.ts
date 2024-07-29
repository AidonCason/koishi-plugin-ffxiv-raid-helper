const servers: ReadonlyArray<string> = [
  '红玉海',
  '神意之地',
  '拉诺西亚',
  '幻影群岛',
  '萌芽池',
  '宇宙和音',
  '沃仙曦染',
  '晨曦王座'
];

const enum AnswerType {
  String = 0,
  Number
}

const base_choice = ['否', '是'];

const duties = {
  坦克: ['骑士', '战士', '黑骑', '绝枪'],
  治疗: ['白魔', '学者', '占星', '贤者'],
  近战: ['武僧', '龙骑', '忍者', '武士', '镰刀'],
  远敏: ['诗人', '机工', '武者'],
  法系: ['黑魔', '召唤', '赤魔']
};

class Question {
  label: string;
  content: string; // 提示语
  answer_type?: AnswerType = AnswerType.String; // 回答类型，默认String自由回答
  answer_range?: ReadonlyArray<string | number>; // 回答范围，用作单选
  depends_key?: string; // 依赖于其他题目的答案
  depends_content?: (input) => string;
  depends_range?: (input) => ReadonlyArray<string | number>; //由input产生选择集
}

const questions: ReadonlyArray<Question> = [
  // {
  //   label: '0',
  //   content:
  //     '1.<b>请您确保已经详细阅读过所有的相关群公告再提交报名表，如果因为未阅读群公告导致的所有问题你将负全部责任。</b>(No退出，其它任意输入继续)'
  // },
  {
    label: '2',
    content: '是否已经通关零式女王古殿？\n(1-是/0-否)',
    answer_type: AnswerType.Number,
    answer_range: [1, 0]
  },
  {
    label: '3',
    content:
      '所在服务器\n' +
      servers.map((server, idx) => '' + (idx + 1) + '-' + server).join('\n'),
    answer_range: servers.map((_, idx) => idx + 1)
  },
  {
    label: '4',
    content: '角色姓名'
  },
  {
    label: '5',
    content: 'QQ'
  },
  {
    label: '6',
    content:
      '选择职业前请您注意，我们保证所有的开荒位置先到先得，但是如果您所选择的职能已经满员了，您是否愿意被调剂到其他职能？\n(1-是/0-否)',
    answer_type: AnswerType.Number,
    answer_range: [1, 0]
  },
  {
    label: '7',
    content:
      '职能-职业选择:职能\n' +
      Object.keys(duties)
        .map((duty, idx) => '' + (idx + 1) + '-' + duty)
        .join('\n'),
    answer_type: AnswerType.Number,
    answer_range: Object.keys(duties).map((_, idx) => idx + 1)
  },
  {
    label: '7-1',
    content: '',
    answer_type: AnswerType.Number,
    depends_key: '7',
    depends_content: input =>
      '职能-职业选择:职业\n' +
      duties[Object.keys(duties)[input - 1]]
        .map((duty, idx) => '' + (idx + 1) + '-' + duty)
        .join('\n'),
    depends_range: input =>
      duties[Object.keys(duties)[input - 1]].map((_, idx) => idx + 1)
  },
  {
    label: '8',
    content:
      '职能-职业选择:次选职能\n' +
      Object.keys(duties)
        .map((duty, idx) => '' + (idx + 1) + '-' + duty)
        .join('\n'),
    answer_type: AnswerType.Number,
    answer_range: Object.keys(duties).map((_, idx) => idx + 1)
  },
  {
    label: '8-1',
    content: '',
    answer_type: AnswerType.Number,
    depends_key: '8',
    depends_content: input =>
      '职能-职业选择:次选职业\n' +
      duties[Object.keys(duties)[input - 1]]
        .map((duty, idx) => '' + (idx + 1) + '-' + duty)
        .join('\n'),
    depends_range: input =>
      duties[Object.keys(duties)[input - 1]].map((_, idx) => idx + 1)
  },
  {
    label: '9',
    content: '请您输入角色现有红色的战斗勋章层数:\n',
    answer_range: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },
  // {
  //   label: '10',
  //   content:
  //     '有亲友和您是一起来报名的吗？如果有的话需要把你们安排在同一队里吗？他的id是什么？\n(有的，我的朋友是xxx/没有)'
  // },
  {
    label: '11',
    content: '还有什么废话是你想说给指挥听的吗？有的话请在下面畅所欲言吧~'
  }
];
