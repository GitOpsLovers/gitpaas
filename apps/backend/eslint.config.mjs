import multistack from '@gitopslovers/eslint-config-multistack';

// eslint-disable-next-line import/no-anonymous-default-export
export default [
  ...multistack.configs.nestjs({ testRunner: 'jest' }),
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
];
