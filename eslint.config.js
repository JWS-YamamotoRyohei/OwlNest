// 

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  // 無視
  {
    ignores: [
      'node_modules', 'dist', 'build',
      'cdk.out', 'cdk/**/*.js',
      'src/__mocks__/**',
    ],
  },

  // JS/JSX 用
  {
    files: ['**/*.{js,jsx}'],
    ...js.configs.recommended,
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },

  // TypeScript 推奨（typed-lintなし）
  ...tseslint.configs.recommended,

  // 🟢 ここで TS 向けの最終上書きを **一番最後** に置くのがポイント
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      // React
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ⬇⬇ ここが今回の肝 ⬇⬇
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // typed-lint依存を弱める
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
];
