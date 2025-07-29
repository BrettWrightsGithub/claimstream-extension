// Test setup for ClaimStream extension tests
require('jest-webextension-mock');

// Mock Chrome APIs
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    sendMessage: jest.fn().mockResolvedValue({}),
    getURL: jest.fn(path => `chrome-extension://test-id/${path}`)
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{
      id: 1,
      url: 'https://www.youtube.com/watch?v=test123',
      title: 'Test Video'
    }]),
    sendMessage: jest.fn().mockResolvedValue({ success: true })
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue()
    }
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  }
};

// Mock Supabase
global.supabase = {
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    }))
  }))
};

// Mock CONFIG
global.CONFIG = {
  supabase: {
    url: 'https://test.supabase.co',
    anonKey: 'test-anon-key'
  }
};

// Mock DOM elements commonly used in tests
global.document.getElementById = jest.fn((id) => {
  const mockElement = {
    textContent: '',
    innerHTML: '',
    style: { display: 'block' },
    disabled: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    click: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => [])
  };
  return mockElement;
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
