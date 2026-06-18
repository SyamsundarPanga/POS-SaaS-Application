module.exports = {
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    "node_modules/(?!(axios)/)"
  ],
 moduleNameMapper: {
    '^axios$': require.resolve('axios'),
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^lucide-react$': require.resolve('lucide-react'),
  },
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
