module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/test/unit/**/*.test.ts'],
  collectCoverageFrom: [
    'src/core/config.ts',
    'src/core/errors.ts',
    'src/core/observability.ts',
    'src/google-pay/client.ts',
    'src/google-pay/request-builder.ts',
    'src/ui/button-options.ts',
    'src/version.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
