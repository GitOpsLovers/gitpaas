import multistack from '@gitopslovers/eslint-config-multistack';

// eslint-disable-next-line import/no-anonymous-default-export
export default [
  ...multistack.configs.angular(),
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
    },
  },
];
