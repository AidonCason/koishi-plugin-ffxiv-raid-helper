import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';


export default [
  { languageOptions: { globals: globals.es2022 } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'semi': [2, 'always'], // 语句强制分号结尾
      'quotes': [2, 'single'], // 引号类型 ''
      'no-alert': 0, // 禁止使用alert
      'no-console': 2, // 禁止使用console
      'no-const-assign': 2, // 禁止修改const声明的变量
      'no-debugger': 2, // 禁止使用debugger
      'no-duplicate-case': 2, // switch中的case标签不能重复
      'no-extra-semi': 2, // 禁止多余的冒号
      'no-multi-spaces': 1, // 不能用多余的空格
    }
  }
];
