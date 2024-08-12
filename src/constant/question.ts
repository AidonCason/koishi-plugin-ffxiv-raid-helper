export const enum QuestionType {
  Text = 'Text', // 填空题
  Boolean = 'Boolean', // 是非题
  SignleChoice = 'SignleChoice' // 单选题
}

export interface Answer {
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

// key是label，value是Answer
export type AnswerMap = ReadonlyMap<string, Answer>;

// 以Define结尾的都是用来定义问题的，实际需要通过buildQuestion来构建问题，因为有些字段是可选但有默认值的

interface IBaseQuestion {
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
  /**
   * 跳过问题，如果返回true则跳过
   */
  skip?: (input: AnswerMap) => boolean;
}

export interface ITextQuestion extends IBaseQuestion {
  type: QuestionType.Text;
}

export interface IBooleanQuestion extends IBaseQuestion {
  type: QuestionType.Boolean;
  /**
   * 答案范围，用户输入的范围
   */
  answer_range?: [number, number];
  /**
   * 答案范围描述，用于展示
   */
  answer_range_desc?: [string, string];
}

export interface ISignleChoiceQuestion extends IBaseQuestion {
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
  /**
   * 问题选项是否换行展示，默认为true
   */
  wrap?: boolean;
}

export type IQuestion =
  | ITextQuestion
  | IBooleanQuestion
  | ISignleChoiceQuestion;

export abstract class Question {
  /**
   * 问题标签
   */
  label!: string;
  /**
   * 导出的字段名
   */
  name!: string;
  /**
   * 问题内容
   */
  content!: string;
  /**
   * 问题类型
   */
  type!: QuestionType;
  /**
   * 构建问题内容，比如单选题多选题要把选项展示出来
   */
  abstract construct_content: (input: AnswerMap) => string;
  /**
   * 判断答案是否合法
   */
  abstract accept_answer: (answer: string, input: AnswerMap) => boolean;
  /**
   * 处理答案，用于展示
   */
  abstract construct_preitter_answer: (
    answer: string,
    input: AnswerMap
  ) => string;
  /**
   * 跳过问题，如果返回true则跳过
   */
  skip: (input: AnswerMap) => boolean = () => false;
}

export class TextQuestion extends Question implements ITextQuestion {
  type: QuestionType.Text = QuestionType.Text;
  construct_content: (input: AnswerMap) => string = () => this.content;
  accept_answer: (answer: string, input: AnswerMap) => boolean = () => true;
  construct_preitter_answer: (answer: string, input: AnswerMap) => string =
    answer => answer;

  constructor(question: ITextQuestion) {
    super();
    Object.assign(this, question);
  }
}

export class BooleanQuestion extends Question implements IBooleanQuestion {
  type: QuestionType.Boolean = QuestionType.Boolean;
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

  constructor(question: IBooleanQuestion) {
    super();
    Object.assign(this, question);
  }
}

export class SignleChoiceQuestion
  extends Question
  implements ISignleChoiceQuestion
{
  type: QuestionType.SignleChoice = QuestionType.SignleChoice;
  answer_range?: ReadonlyArray<string>;
  answer_range_desc?: ReadonlyArray<string>;
  construct_range: (input: AnswerMap) => ReadonlyMap<string, string> = () => {
    if (!this.answer_range && !this.answer_range_desc) {
      throw new Error('answer_range or answer_range_desc must be set');
    }
    // 如果只设置了一个，那么自动构建另一个
    // 只有选项描述的情况下，选项默认为1,2,3...
    this.answer_range =
      this.answer_range?.map(e => e.toString()) ??
      this.answer_range_desc!.map((_, idx) => (idx + 1).toString());
    // 只有选项的情况下，选项描述默认为选项
    this.answer_range_desc =
      this.answer_range_desc ?? this.answer_range.map(e => e.toString());
    // 选项和选项描述长度需要一致
    if (this.answer_range.length !== this.answer_range_desc.length) {
      throw new Error(
        'answer_range and answer_range_desc must have the same length'
      );
    }
    return new Map(
      this.answer_range.map((e, idx) => [e, this.answer_range_desc![idx]])
    );
  };

  construct_content: (input: AnswerMap) => string = input => {
    const range = this.construct_range(input);
    // 展示选项，如果选项和选项描述一致则只展示选项，否则展示选项和选项描述
    const choices = Array.from(range.entries()).map(([key, value]) =>
      key == value ? value : `${key} - ${value}`
    );
    return `${this.content}\n${choices.join(this.wrap ? '\n' : ' ')}`;
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
  wrap: boolean = true;

  constructor(question: ISignleChoiceQuestion) {
    super();
    Object.assign(this, question);
    if (question.construct_range) {
      return;
    }
  }
}

export function buildQuestion(question: IQuestion): Question {
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
