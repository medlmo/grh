module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/backend/test/**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['<rootDir>/backend/node_modules/ts-jest', {
      tsconfig: '<rootDir>/backend/tsconfig.json',
      diagnostics: false,
    }],
  },
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', '<rootDir>/backend/node_modules'],
  setupFiles: ['<rootDir>/backend/test/setup.ts'],
};