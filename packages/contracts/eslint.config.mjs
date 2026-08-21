import multistack from '@gitopslovers/eslint-config-multistack';

// eslint-disable-next-line import/no-anonymous-default-export
export default [
  {
    ignores: ['vitest.config.ts'],
  },
  ...multistack.configs.tsLibrary({ testRunner: 'jest' }),
];
