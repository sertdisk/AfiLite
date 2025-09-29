module.exports = {
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/_*.{js,jsx,ts,tsx}',
    '!app/**/_*.{js,jsx,ts,tsx}',
    '!app/**/layout.{js,jsx,ts,tsx}',
    '!app/**/page.{js,jsx,ts,tsx}',
    '!app/**/loading.{js,jsx,ts,tsx}',
    '!app/**/error.{js,jsx,ts,tsx}',
    '!app/**/not-found.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/*.config.js',
    '!**/coverage/**',
 ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
  ],
 transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
 ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
 },
};