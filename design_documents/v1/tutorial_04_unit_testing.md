# Tutorial 4: Unit Testing for Regression Protection

## Overview
Now that we have a fully functional spaced repetition app with basic text inputs and review functionality, it's time to implement comprehensive unit tests. This tutorial will guide you through setting up a testing framework and writing tests for all core components to provide regression protection as we continue development.

**Key Principle**: Our tests validate the actual production modules used by script.js, ensuring that our test coverage directly protects the code that runs in the application.

## Why Unit Testing?
- **Regression Protection**: Catch bugs when making changes
- **Documentation**: Tests serve as living documentation of expected behavior
- **Confidence**: Make changes knowing tests will catch issues
- **Refactoring Safety**: Safely improve code structure
- **Edge Case Coverage**: Test boundary conditions and error scenarios
- **Production Code Validation**: Tests run against the same modules used in the application

## Testing Strategy

### What We'll Test
1. **ReviewScheduler Module**: Core scheduling logic (imported by script.js)
2. **ReviewSession Module**: Session management and state (imported by script.js)
3. **Database Operations**: CRUD operations for decks and cards (imported by script.js)
4. **Review Logic**: Learning, retention, and blitz mode behaviors
5. **Integration Workflows**: End-to-end component interactions

### Testing Approach
- **Unit Tests**: Test individual functions in isolation using production modules
- **Integration Tests**: Test component interactions using the same imports as script.js
- **Mock Database**: Use in-memory database for consistent test state
- **Async Testing**: Handle promises and database operations properly
- **Production Module Testing**: Import and test the exact same modules used by script.js

## Step 1: Testing Framework Setup

Since we're using vanilla JavaScript in the browser, we'll use **Vitest** - a modern, fast testing framework that works well with browser-based code.

### Install Dependencies

Create a `package.json` file:
```json
{
  "name": "mimir-v1",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "jsdom": "^23.0.0",
    "fake-indexeddb": "^5.0.0"
  }
}
```

### Vitest Configuration

Create `vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'test/']
    }
  }
})
```

### Test Setup File

Create `test/setup.js`:
```javascript
import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'

// Mock Dexie globally
global.Dexie = (await import('dexie')).default

// Reset IndexedDB before each test
beforeEach(() => {
  // Clear all databases
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      indexedDB.deleteDatabase(db.name)
    })
  })
})
```

## Step 2: Production Module Architecture

Our application already uses a modular architecture where script.js imports tested modules. This ensures our tests validate the actual production code:

### Current Module Structure

**script.js imports:**
```javascript
import { MimirDatabase } from './src/database.js';
import { ReviewScheduler } from './src/reviewScheduler.js';
import { ReviewSession } from './src/reviewSession.js';
```

**Key Benefits:**
- Tests run against the same modules used in production
- No separate "test-only" implementations that could diverge
- Refactoring is safe because tests validate actual usage
- UI logic extends tested base classes (e.g., UIReviewSession extends ReviewSession)

### ReviewScheduler Module (src/reviewScheduler.js)

This module contains the core spaced repetition logic and is imported by both script.js and our tests:

### MimirDatabase Module (src/database.js)

This module handles all database operations and is imported by both script.js and our tests. The production code uses:

```javascript
const database = new MimirDatabase();
const db = database.db; // For backward compatibility
```

### ReviewSession Module (src/reviewSession.js)

This module manages review sessions and is extended by the UI layer:

```javascript
// In script.js - UI extends the tested base class
class UIReviewSession extends ReviewSession {
  constructor() {
    super(db); // Uses the same database instance
  }
  // UI-specific methods that call tested base methods
}
```

**Key Architecture Points:**
- Base ReviewSession class contains all testable logic
- UI layer (UIReviewSession) only adds display/interaction logic
- Tests validate the base class that contains the core functionality
- Production code uses the same imports as tests

## Step 3: Core Unit Tests

Our tests import and validate the exact same modules used by script.js, ensuring complete coverage of production code.

### Test ReviewScheduler (test/reviewScheduler.test.js)

**Critical**: This test imports the same module used by script.js:

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { ReviewScheduler } from '../src/reviewScheduler.js' // Same import as script.js
```

The tests validate all the core scheduling logic that script.js relies on:
- Card graduation from learning to retention mode
- Exponential scheduling (2^n days) for spaced repetition
- Immediate rescheduling for incorrect answers
- Due card filtering and counting

**Key Test Coverage:**
- `graduateCard()` - Used when cards complete learning mode
- `scheduleRetainCard()` - Used for all retention mode reviews
- `getDueCards()` - Used to populate review sessions
- `getDueCounts()` - Used for UI display of review options

### Test Database Operations (test/database.test.js)

**Critical**: This test imports the same module used by script.js:

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { MimirDatabase } from '../src/database.js' // Same import as script.js
```

The tests validate all database operations that script.js relies on:
- Deck CRUD operations with automatic timestamps
- Card CRUD operations with learning mode defaults
- Cascade deletion (deleting deck removes all cards)
- Schema versioning and migration
- Database hooks for timestamp management

**Key Test Coverage:**
- All methods called by script.js: `createDeck()`, `getDeck()`, `getAllDecks()`, etc.
- Database schema integrity and migrations
- Automatic timestamp handling via Dexie hooks
- Foreign key relationships and cascade operations

**Production Validation:**
The tests use the exact same MimirDatabase class that script.js instantiates:
```javascript
// In script.js
const database = new MimirDatabase();

// In tests
db = new MimirDatabase(); // Same class, same behavior
```

## Step 4: Review Session Testing (test/reviewSession.test.js)

**Critical**: This test imports the same module used by script.js:

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { MimirDatabase } from '../src/database.js'
import { ReviewSession } from '../src/reviewSession.js' // Same import as script.js
```

**Key Architecture Point**: The tests validate the base ReviewSession class that UIReviewSession extends in script.js:

```javascript
// In script.js - UI extends the tested base class
class UIReviewSession extends ReviewSession {
  constructor() {
    super(db); // Calls the tested constructor
  }

  async start(deckId, mode) {
    const success = await super.start(deckId, mode); // Calls tested method
    // UI-specific logic here
  }
}
```

**Test Coverage:**
- Session initialization for all modes (learning, retention, blitz)
- Card filtering logic (learning cards only, due cards only, all cards)
- Progress tracking and mastery detection
- Session completion logic
- Card navigation and shuffling

**Production Validation:**
Every method tested is called by the UI layer:
- `start()` - Called when user starts a review session
- `getCurrentCard()` - Called to display current card
- `updateProgress()` - Called when user answers correctly/incorrectly
- `isCardMastered()` / `areAllCardsMastered()` - Called to determine session completion

## Step 5: Integration Tests (test/integration.test.js)

**Critical**: Integration tests use the exact same module imports as script.js:

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { MimirDatabase } from '../src/database.js'      // Same as script.js
import { ReviewScheduler } from '../src/reviewScheduler.js' // Same as script.js
import { ReviewSession } from '../src/reviewSession.js'     // Same as script.js
```

**Integration Test Philosophy:**
These tests validate the complete workflows that script.js orchestrates:

1. **Learning to Retention Workflow**: Tests the exact sequence script.js uses when graduating cards
2. **Review Session Integration**: Tests how ReviewSession and ReviewScheduler work together
3. **Cross-Component Data Flow**: Validates data consistency across all modules

**Key Integration Scenarios:**
- Card creation → Learning mode → Graduation → Retention scheduling
- Due card retrieval for different review modes
- Session management with database persistence
- Review history tracking and exponential scheduling

**Production Workflow Validation:**
The integration tests mirror the exact workflows in script.js:
```javascript
// In script.js - this exact workflow is tested
const graduatedCard = ReviewScheduler.graduateCard(card);
await database.updateCard(cardId, {
  mode: graduatedCard.mode,
  due_date: graduatedCard.due_date
});
```

## Step 6: Running Tests

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx vitest test/reviewScheduler.test.js

# Run tests in watch mode
npx vitest --watch
```

## Step 7: Test Coverage Goals

Aim for these coverage targets:
- **Statements**: 90%+
- **Branches**: 85%+
- **Functions**: 95%+
- **Lines**: 90%+

### Key Areas to Test
1. **Edge Cases**: Empty decks, no due cards, invalid inputs
2. **Error Handling**: Database failures, network issues
3. **Boundary Conditions**: Date calculations, scheduling limits
4. **State Management**: Session state transitions
5. **Data Integrity**: Proper timestamps, foreign key relationships

## Step 8: Continuous Integration

Add a GitHub Actions workflow (`.github/workflows/test.yml`):
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## Benefits Achieved

With this production-module testing approach, you now have:

1. **True Regression Protection**: Tests validate the exact code used in production
2. **Refactoring Safety**: Changes to modules are immediately validated by tests
3. **Documentation**: Tests serve as executable specifications of production behavior
4. **Architecture Validation**: Tests ensure the module separation works correctly
5. **Integration Confidence**: Component interactions are tested using production imports
6. **No Test/Production Divergence**: Impossible for test code to drift from production code

## Key Architecture Benefits

**Production Code Validation**:
- script.js imports: `import { ReviewScheduler } from './src/reviewScheduler.js'`
- Tests import: `import { ReviewScheduler } from '../src/reviewScheduler.js'`
- **Same module, same behavior, guaranteed**

**UI Layer Separation**:
- Core logic in tested modules (ReviewSession, ReviewScheduler, MimirDatabase)
- UI logic in script.js extends/uses tested modules
- Tests validate the foundation that UI depends on

**Refactoring Confidence**:
- Any change to core modules is immediately validated
- UI can be refactored knowing the tested foundation is solid
- Module boundaries are enforced by import structure

## Next Steps

1. **UI Logic Testing**: Add tests for script.js UI-specific logic using vitest + jsdom
2. **End-to-End Tests**: Test complete user workflows
3. **Performance Tests**: Test with large datasets
4. **Error Handling**: Test network failures and edge cases
5. **Accessibility Tests**: Ensure app is accessible

This production-module testing foundation ensures your tests actually protect the code that runs in your application, providing true regression protection as you continue development.
