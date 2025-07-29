# ClaimStream Extension Test Suite

This directory contains comprehensive tests for the ClaimStream browser extension, covering unit tests, integration tests, and end-to-end tests.

## Test Structure

```
tests/
├── unit/                   # Unit tests for individual components
│   ├── popup.test.js      # Tests for popup functionality
│   ├── supabase-client.test.js # Tests for Supabase client
│   └── content.test.js    # Tests for content script
├── integration/           # Integration tests
│   └── extension-flow.test.js # Full workflow integration tests
├── e2e/                   # End-to-end tests
│   └── extension-e2e.test.js # Browser automation tests
├── setup.js              # Test setup and mocks
├── package.json          # Test dependencies
├── run-tests.js          # Test runner script
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Chrome browser (for E2E tests)

### Installation

1. Navigate to the tests directory:
```bash
cd tests/
```

2. Install dependencies:
```bash
npm install
```

Or use the test runner to install automatically:
```bash
node run-tests.js
```

## Running Tests

### Using the Test Runner (Recommended)

```bash
# Run all tests
node run-tests.js

# Run specific test types
node run-tests.js unit
node run-tests.js integration
node run-tests.js e2e

# Run with coverage
node run-tests.js coverage

# Run in watch mode
node run-tests.js watch
```

### Using npm scripts directly

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Test Categories

### Unit Tests

Test individual functions and components in isolation:

- **popup.test.js**: Tests popup UI logic, video ID extraction, status handling
- **supabase-client.test.js**: Tests database operations, real-time subscriptions
- **content.test.js**: Tests content script functionality, video info extraction

### Integration Tests

Test how different components work together:

- **extension-flow.test.js**: Tests complete analysis workflow, error handling, UI state management

### End-to-End Tests

Test the extension in a real browser environment:

- **extension-e2e.test.js**: Tests extension behavior on actual YouTube pages using Puppeteer

## Test Coverage

The test suite covers:

- ✅ Video ID extraction from YouTube URLs
- ✅ Video information extraction from YouTube pages
- ✅ Supabase database operations
- ✅ Real-time subscription handling
- ✅ Error handling and fallback mechanisms
- ✅ UI state management
- ✅ Content script communication
- ✅ Extension initialization
- ✅ Analysis workflow
- ✅ Claims display functionality

## Key Features Tested

### Core Functionality
- YouTube video detection (watch pages and shorts)
- Video ID extraction from various URL formats
- Video metadata extraction
- Analysis report creation and management
- Real-time status updates
- Claims verification display

### Error Handling
- Network failures
- Database connection issues
- Content script communication failures
- Invalid URLs
- Missing DOM elements

### UI/UX
- Button state management
- Loading indicators
- Status messages
- Claims accordion display
- Fallback UI states

### Performance
- Extension loading times
- Content script initialization
- Network request handling
- Memory usage (subscription cleanup)

## Mocking Strategy

The tests use comprehensive mocking for:

- **Chrome Extension APIs**: Tabs, runtime, storage
- **Supabase Client**: Database operations, real-time subscriptions
- **DOM Elements**: Document queries, event handling
- **Network Requests**: API calls, webhook triggers

## Configuration

### Jest Configuration
Located in `package.json`:
- Uses jsdom environment for DOM testing
- Includes coverage reporting
- Sets up proper test matching patterns

### Test Setup
`setup.js` provides:
- Chrome API mocks
- Supabase client mocks
- Global configuration
- DOM element mocks

## Debugging Tests

### Running Individual Tests
```bash
# Run specific test file
npx jest popup.test.js

# Run specific test case
npx jest --testNamePattern="should extract video ID"
```

### Debug Mode
```bash
# Run with verbose output
npx jest --verbose

# Run with debug information
node --inspect-brk node_modules/.bin/jest --runInBand
```

### E2E Test Debugging
For E2E tests, set `headless: false` in the Puppeteer configuration to see the browser in action.

## CI/CD Integration

The tests are designed to work in CI/CD environments:

- E2E tests can run in headless mode
- All external dependencies are mocked
- Tests are deterministic and don't rely on external services
- Coverage reports can be generated for code quality metrics

## Adding New Tests

### Unit Tests
1. Create test file in appropriate directory
2. Import the module/function to test
3. Use Jest matchers for assertions
4. Mock external dependencies

### Integration Tests
1. Test multiple components working together
2. Use realistic data flows
3. Test error propagation
4. Verify state changes across components

### E2E Tests
1. Use Puppeteer for browser automation
2. Test real user interactions
3. Verify visual elements
4. Test across different scenarios

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies consistently
3. **Assertions**: Use specific, meaningful assertions
4. **Cleanup**: Clean up resources after tests
5. **Documentation**: Document complex test scenarios
6. **Performance**: Keep tests fast and focused

## Troubleshooting

### Common Issues

1. **Chrome not found (E2E tests)**
   - Install Chrome browser
   - Set CHROME_PATH environment variable

2. **Permission errors**
   - Check file permissions
   - Run with appropriate user privileges

3. **Network timeouts**
   - Increase timeout values
   - Check network connectivity

4. **Mock conflicts**
   - Clear mocks between tests
   - Check mock setup in beforeEach

### Getting Help

If you encounter issues:
1. Check the console output for detailed error messages
2. Run tests with `--verbose` flag for more information
3. Verify all dependencies are installed correctly
4. Check that the extension files are in the correct location

## Contributing

When adding new functionality to the extension:
1. Add corresponding unit tests
2. Update integration tests if needed
3. Add E2E tests for user-facing features
4. Ensure all tests pass before submitting changes
5. Update this README if adding new test categories
