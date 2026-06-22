module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native.*|@react-native.*|@react-navigation|react-redux|@reduxjs/toolkit|immer|redux)/)',
  ],
};
