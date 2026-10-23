// Jest setup file - runs before each test file (CommonJS)

// Set test environment FIRST - disables FORCE_HTTPS, enables test mode
process.env.NODE_ENV = 'test';
process.env.FORCE_HTTPS = 'false';

// Set required environment variables for tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.SMTP_USER = process.env.SMTP_USER || 'test@velsoie.com';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

// Mock Redis/IORedis to avoid connection errors in tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    status: 'ready',
  }));
});

// Mock bullmq Queue to avoid Redis connection
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Job: jest.fn(),
}));

// Mock notificationQueue to avoid Redis
jest.mock('../services/notificationQueue', () => ({
  enqueueNotification: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  notificationQueue: {
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  },
}));

// Mock email service
jest.mock('../services/email', () => ({
  createEmailService: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
  })),
}));

// Mock logger to reduce noise in tests
jest.mock('../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock sanitize-html to avoid ESM import issues in tests
jest.mock('sanitize-html', () => jest.fn((str) => str));

// Global test timeout
jest.setTimeout(10000);
