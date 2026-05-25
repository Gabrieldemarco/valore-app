// @ts-check
/** Jest config para tests de integración con PostgreSQL real */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/integration/**/*.test.js'
  ],
  testTimeout: 15000
};
