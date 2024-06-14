const jsConfigRules = {
  'block-scoped-var': 'error',
  'callback-return': 'error',
  curly: 'error',
  'dot-location': ['error', 'property'],
  'dot-notation': 'error',
  eqeqeq: ['error', 'smart'],
  'id-match': 'error',
  'linebreak-style': ['error', 'unix'],
  'new-cap': 'error',
  'no-console': 'off',
  'no-debugger': 'error',
  'no-duplicate-imports': 'error',
  'no-else-return': 'error',
  'no-eval': 'error',
  'no-fallthrough': 'error',
  'no-invalid-this': 'off',
  'no-new-wrappers': 'error',
  'no-path-concat': 'error',
  'no-return-assign': 'error',
  'no-sequences': 'error',
  'no-template-curly-in-string': 'error',
  'no-trailing-spaces': 'error',
  'no-undef-init': 'error',
  'no-use-before-define': 'off',
  'prefer-arrow-callback': 'error',
  'prefer-const': 'error',
  'prefer-destructuring': ['warn', { VariableDeclarator: { object: true } }],
  radix: 'error',
  semi: 'off',
  'valid-jsdoc': ['error', { requireReturn: false }],
  'no-useless-escape': 'error',
  'no-void': 'error',
  'no-var': 'error',
}

module.exports = {
  env: {
    es6: true,
    node: true,
  },
  overrides: [
    {
      files: ['*.js'],
      extends: ['eslint:recommended', 'prettier'],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      rules: jsConfigRules,
    },
    {
      env: { node: true },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: ['./tsconfig.json'],
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'prettier',
      ],
      files: ['*.ts'],
      rules: {
        ...jsConfigRules,
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/array-type': 'error',
        '@typescript-eslint/consistent-type-assertions': 'error',
        '@typescript-eslint/consistent-type-definitions': 'error',
        '@typescript-eslint/no-redundant-type-constituents': 'error',
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/no-redeclare': 'error',
        '@typescript-eslint/no-base-to-string': [
          'error',
          { ignoredTypeNames: ['Error', 'RegExp', 'RegExpLike', 'URL', 'URLSearchParams'] },
        ], // 1 instance
        '@typescript-eslint/no-use-before-define': ['error', 'nofunc'],
        'no-duplicate-imports': 'off',
        '@typescript-eslint/default-param-last': 'error',
        'dot-notation': 'off',
        '@typescript-eslint/dot-notation': 'error',
        '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
        '@typescript-eslint/explicit-member-accessibility': [
          'error',
          { accessibility: 'no-public' },
        ],
        '@typescript-eslint/no-extraneous-class': 'error',
        '@typescript-eslint/no-invalid-this': 'error',
        '@typescript-eslint/no-misused-new': 'error',
        '@typescript-eslint/parameter-properties': ['error', { prefer: 'parameter-property' }],
        '@typescript-eslint/no-unused-expressions': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/prefer-function-type': 'error',
        '@typescript-eslint/prefer-includes': 'error',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/require-array-sort-compare': ['error', { ignoreStringArrays: true }],
        '@typescript-eslint/unified-signatures': 'error',
        '@typescript-eslint/no-unnecessary-condition': [
          'error',
          { allowConstantLoopConditions: true },
        ],
        complexity: ['error', 15],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/require-await': 'warn',
      },
    },
  ],
}