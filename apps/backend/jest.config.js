/** @type {import('jest').Config} */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    moduleNameMapper: {
        '^@core/(.*)$': '<rootDir>/core/$1',
        '^@features/(.*)$': '<rootDir>/features/$1',
        '^@octokit/rest$': '<rootDir>/../test/stubs/octokit-rest.stub.ts',
        '^@octokit/auth-app$': '<rootDir>/../test/stubs/octokit-auth-app.stub.ts',
    },
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
};
