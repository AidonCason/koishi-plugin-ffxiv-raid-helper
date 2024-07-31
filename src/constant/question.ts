export const enum QuestionType {
    Text = 'Text', // 填空题
    Boolean = 'Boolean', // 是非题
    SignleChoice = 'SignleChoice', // 单选题
}

export class Answer {
    label: string;
    name: string;
    answer: string; // 用户输入的答案
    preitter_answer: string; // 处理后的答案
}

export type AnswerMap = ReadonlyMap<string, Answer>;

interface IQuestionDefine {
    label: string;
    name: string; // 导出的字段名
    content: string;
    type: QuestionType;
    construct_content?: (input: AnswerMap) => string;
    accept_answer?: (answer: string, input: AnswerMap) => boolean;
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
    answer_range?: [number, number];
    answer_range_desc?: [string, string];
    construct_content?: (input: AnswerMap) => string
    accept_answer?: (answer: string, input: AnswerMap) => boolean
    construct_preitter_answer?: (answer: string, input: AnswerMap) => string
}

export class SignleChoiceQuestionDefine implements IQuestionDefine {
    label: string;
    name: string;
    content: string;
    type: QuestionType.SignleChoice;
    answer_range?: ReadonlyArray<string | number>;
    answer_range_desc?: ReadonlyArray<string>;
    construct_range?: (input: AnswerMap) => ReadonlyMap<string, string>
    construct_content?: (input: AnswerMap) => string
    accept_answer?: (answer: string, input: AnswerMap) => boolean
    construct_preitter_answer?: (answer: string, input: AnswerMap) => string

}

export type QuestionDefine = TextQuestionDefine | BooleanQuestionDefine | SignleChoiceQuestionDefine;

export class TextQuestion extends TextQuestionDefine {
    construct_content: (input: AnswerMap) => string = _ => this.content;
    accept_answer: (answer: string, input: AnswerMap) => boolean = _ => true;
    construct_preitter_answer: (answer: string, input: AnswerMap) => string = answer => answer;

    constructor(question: TextQuestionDefine) {
        super();
        Object.assign(this, question);
    }
}

export class BooleanQuestion extends BooleanQuestionDefine {
    answer_range: [number, number] = [1, 0];
    answer_range_desc: [string, string] = ['是', '否'];
    construct_content: (input: AnswerMap) => string = _ => `${this.content}\n(${this.answer_range[0]}-${this.answer_range_desc[0]}/${this.answer_range[1]}-${this.answer_range_desc[1]})`;
    accept_answer: (answer: string, input: AnswerMap) => boolean = answer => {
        const num = parseInt(answer);
        return num === this.answer_range[0] || num === this.answer_range[1];
    }
    construct_preitter_answer: (answer: string, input: AnswerMap) => string = answer => {
        const num = parseInt(answer);
        return num === this.answer_range[0] ? this.answer_range_desc[0] : this.answer_range_desc[1];
    }

    constructor(question: BooleanQuestionDefine) {
        super();
        Object.assign(this, question);
    }
}

export class SignleChoiceQuestion extends SignleChoiceQuestionDefine {
    construct_range: (input: AnswerMap) => ReadonlyMap<string, string> = _ => {
        if (!this.answer_range && !this.answer_range_desc) {
            throw new Error('answer_range or answer_range_desc must be set');
        }
        this.answer_range = this.answer_range ?? this.answer_range_desc;
        this.answer_range_desc = this.answer_range_desc ?? this.answer_range.map(e => e.toString());
        if (this.answer_range.length !== this.answer_range_desc.length) {
            throw new Error('answer_range and answer_range_desc must have the same length');
        }
        return new Map(this.answer_range.map((e, idx) => [e.toString(), this.answer_range_desc[idx]]));
    }
    construct_content: (input: AnswerMap) => string = input => {
        const range = this.construct_range(input);
        return `${this.content}\n${Array.from(range.entries()).map(([key, value]) => key == value ? value : `${key}-${value}`).join('\n')}`;
    }
    accept_answer: (answer: string, input: AnswerMap) => boolean = (answer, input) => {
        const range = this.construct_range(input);
        return range.has(answer);
    }
    construct_preitter_answer: (answer: string, input: AnswerMap) => string = (answer, input) => {
        const range = this.construct_range(input);
        return range.get(answer) ?? '';
    }

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