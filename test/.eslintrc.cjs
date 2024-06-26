module.exports = {
  globals: {
    it: false,
    describe: false,
  },
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: {
        project: ['./test/tsconfig.json'],
      },
      rules: {
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-invalid-this': 'off',
      },
    },
  ],
  rules: {
    'no-empty': 'off',
  },
}
