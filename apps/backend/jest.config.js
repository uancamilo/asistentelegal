module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['scripts/**/*.ts', 'src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/generated/', '/dist/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};
