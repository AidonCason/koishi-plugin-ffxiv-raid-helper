export const enum QuestionType {
  Text = 'Text', // 填空题
  Boolean = 'Boolean', // 是非题
  SignleChoice = 'SignleChoice' // 单选题
}

export class Answer {
  /**
   * 问题标签
   */
  label: string;
  /**
   * 导出的字段名
   */
  name: string;
  /**
   * 用户输入的答案
   */
  answer: string;
  /**
   * 处理后的答案，用于展示
   */
  preitter_answer: string;
}

export type AnswerMap = ReadonlyMap<string, Answer>;

// 以Define结尾的都是用来定义问题的，实际需要通过buildQuestion来构建问题，因为有些字段是可选但有默认值的

interface IQuestionDefine {
  /**
   * 问题标签
   */
  label: string;
  /**
   * 导出的字段名
   */
  name: string;
  /**
   * 问题内容
   */
  content: string;
  /**
   * 问题类型
   */
  type: QuestionType;
  /**
   * 构建问题内容，比如单选题多选题要把选项展示出来
   */
  construct_content?: (input: AnswerMap) => string;
  /**
   * 判断答案是否合法
   */
  accept_answer?: (answer: string, input: AnswerMap) => boolean;
  /**
   * 处理答案，用于展示
   */
  construct_preitter_answer?: (answer: string, input: AnswerMap) => string;
}

export class TextQuestionDefine implements IQuestionDefine {
  label: string;
  name: string;
  content: string;
  type: QuestionType.Text;
  construct_content?: (input: AnswerMap) => string;
  accept_answer?: (answer: string, input: AnswerMap) => boolean;
  construct_preitter_answer?: (answer: string, input: AnswerMap) => string;
}

export class BooleanQuestionDefine implements IQuestionDefine {
  label: string;
  name: string;
  content: string;
  type: QuestionType.Boolean;
  /**
   * 答案范围，用户输入的范围
   */
  answer_range?: [number, number];
  /**
   * 答案范围描述，用于展示
   */
  answer_range_desc?: [string, string];
  construct_content?: (input: AnswerMap) => string;
  accept_answer?: (answer: string, input: AnswerMap) => boolean;
  construct_preitter_answer?: (answer: string, input: AnswerMap) => string;
}

export class SignleChoiceQuestionDefine implements IQuestionDefine {
  label: string;
  name: string;
  content: string;
  type: QuestionType.SignleChoice;
  /**
   * 答案范围，用户输入的范围
   */
  answer_range?: ReadonlyArray<string | number>;
  /**
   * 答案范围描述，用于展示
   */
  answer_range_desc?: ReadonlyArray<string>;
  /**
   * 构建答案范围，选项和选项描述对应
   */
  construct_range?: (input: AnswerMap) => ReadonlyMap<string, string>;
  construct_content?: (input: AnswerMap) => string;
  accept_answer?: (answer: string, input: AnswerMap) => boolean;
  construct_preitter_answer?: (answer: string, input: AnswerMap) => string;
}

export type QuestionDefine =
  | TextQuestionDefine
  | BooleanQuestionDefine
  | SignleChoiceQuestionDefine;

export class TextQuestion extends TextQuestionDefine {
  construct_content: (input: AnswerMap) => string = () => this.content;
  accept_answer: (answer: string, input: AnswerMap) => boolean = () => true;
  construct_preitter_answer: (answer: string, input: AnswerMap) => string =
    answer => answer;

  constructor(question: TextQuestionDefine) {
    super();
    Object.assign(this, question);
  }
}

export class BooleanQuestion extends BooleanQuestionDefine {
  answer_range: [number, number] = [1, 0];
  answer_range_desc: [string, string] = ['是', '否'];
  construct_content: (input: AnswerMap) => string = () =>
    `${this.content}\n(${this.answer_range[0]}-${this.answer_range_desc[0]}/${this.answer_range[1]}-${this.answer_range_desc[1]})`;
  accept_answer: (answer: string, input: AnswerMap) => boolean = answer => {
    const num = parseInt(answer);
    return num === this.answer_range[0] || num === this.answer_range[1];
  };
  construct_preitter_answer: (answer: string, input: AnswerMap) => string =
    answer => {
      const num = parseInt(answer);
      return num === this.answer_range[0]
        ? this.answer_range_desc[0]
        : this.answer_range_desc[1];
    };

  constructor(question: BooleanQuestionDefine) {
    super();
    Object.assign(this, question);
  }
}

export class SignleChoiceQuestion extends SignleChoiceQuestionDefine {
  construct_range: (input: AnswerMap) => ReadonlyMap<string, string> = () => {
    if (!this.answer_range && !this.answer_range_desc) {
      throw new Error('answer_range or answer_range_desc must be set');
    }
    // 如果只设置了一个，那么自动构建另一个
    this.answer_range =
      this.answer_range ??
      this.answer_range_desc.map((_, idx) => (idx + 1).toString());
    this.answer_range_desc =
      this.answer_range_desc ?? this.answer_range.map(e => e.toString());
    // 选项和选项描述长度需要一致
    if (this.answer_range.length !== this.answer_range_desc.length) {
      throw new Error(
        'answer_range and answer_range_desc must have the same length'
      );
    }
    return new Map(
      this.answer_range.map((e, idx) => [
        e.toString(),
        this.answer_range_desc[idx]
      ])
    );
  };
  construct_content: (input: AnswerMap) => string = input => {
    const range = this.construct_range(input);
    // 展示选项，如果选项和选项描述一致则只展示选项，否则展示选项和选项描述
    const choices = Array.from(range.entries()).map(([key, value]) =>
      key == value ? value : `${key} - ${value}`
    );
    // 找出选项中最长的长度
    const max_len = Math.max(...choices.map(e => e.length));
    // 如果选项过多则换行展示
    return `${this.content}\n${choices.join(max_len * choices.length > 40 ? '\n' : ' ')}`;
  };
  accept_answer: (answer: string, input: AnswerMap) => boolean = (
    answer,
    input
  ) => {
    const range = this.construct_range(input);
    return range.has(answer);
  };
  construct_preitter_answer: (answer: string, input: AnswerMap) => string = (
    answer,
    input
  ) => {
    const range = this.construct_range(input);
    return range.get(answer) ?? '';
  };

  constructor(question: SignleChoiceQuestionDefine) {
    super();
    Object.assign(this, question);
  }
}

export type Question = TextQuestion | BooleanQuestion | SignleChoiceQuestion;

export function buildQuestion(question: QuestionDefine): Question {
  switch (question.type) {
    case QuestionType.Text:
      return new TextQuestion(question);
    case QuestionType.Boolean:
      return new BooleanQuestion(question);
    case QuestionType.SignleChoice:
      return new SignleChoiceQuestion(question);
  }
  throw new Error('Unknown question type');
}
