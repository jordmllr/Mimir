# Tutorial 03: Basic Review Functionality

## Overview
This tutorial adds basic review functionality to the Mimir flashcard application, implementing learning and retention modes with spaced repetition scheduling, plus a blitz mode for intensive practice.

## Scope for This Tutorial
**IN:** Review scheduling, learning/retention modes, blitz mode, review session UI, database schema updates
**OUT:** Advanced scheduling algorithms, statistics, progress tracking, mobile optimizations

## Review System Design

### Card Modes
1. **Learning Mode**: Continuous practice for new cards
   - Cycles through ALL cards that are in learning mode
   - Each card must be answered correctly twice in a row to be "mastered"
   - Session continues until all learning cards are mastered or user exits
   - Learning attempts do NOT count towards review history
   - Cards graduate to retention mode after mastery (permanent graduation)

2. **Retention Mode**: Traditional spaced repetition for learned cards
   - Reviews only cards that are currently due
   - Uses 2^n day scheduling where n = number of correct reviews
   - First retention review is scheduled for 1 day (2^0)
   - Subsequent reviews: 2 days, 4 days, 8 days, etc.
   - Incorrect answers schedule for immediate review but stay in retention mode
   - Session ends when all due cards are reviewed

3. **Blitz Mode**: On-demand intensive practice (always available)
   - Cycles through ALL cards in the deck continuously
   - Each card must be answered correctly twice in a row to be "mastered"
   - Does NOT affect the card's actual review schedule or mode
   - Session continues until all cards are mastered or user exits
   - Pure practice mode - no database updates

### Database Schema Updates

#### Version 2 Schema Changes
```javascript
// Cards table gets new fields:
{
  id: number,
  deck_id: number,
  prompt: string,
  response: string,
  mode: 'learning' | 'retaining',        // NEW
  due_date: Date,                        // NEW
  review_history: Array<ReviewEntry>,    // NEW
  created_at: Date,
  updated_at: Date
}

// ReviewEntry structure:
{
  timestamp: Date,
  correct: boolean
}
```

#### Migration Strategy
- Existing cards are automatically migrated to learning mode
- Due date is set to current time (immediately due)
- Empty review history is initialized

## Implementation Details

### Core Components

#### 1. ReviewScheduler Module
Handles all scheduling logic:
- `graduateCard(card)`: Graduate card from learning to retention mode
- `scheduleRetainCard(card, isCorrect)`: Retention mode scheduling
- `getDueCards(deckId, mode)`: Retrieve cards due for review
- `getDueCounts(deckId)`: Get counts by mode for UI display

#### 2. ReviewSession Module
Manages review sessions:
- `start(deckId, mode)`: Initialize a review session
- `displayCurrentCard()`: Show current card prompt
- `showAnswer()`: Reveal the answer
- `answerCard(isCorrect)`: Process user's answer and advance
- `endSession()`: Clean up and return to deck view

#### 3. UI Components
- **Review Info Section**: Shows due card counts and review buttons
- **Review Session View**: Card display with show/hide answer functionality
- **Progress Tracking**: Shows current position in session

### Key Features

#### Learning Mode Logic
```javascript
// Learning attempts don't update review history or scheduling
// Cards graduate when mastered in session (2 consecutive correct)
if (sessionMastery >= 2) {
  card.mode = 'retaining';
  card.due_date = now + 1day;
  // No review_history update - learning attempts don't count
}
```

#### Retention Mode Logic
```javascript
// Add to review history for retention attempts
card.review_history.push({timestamp: now, correct: isCorrect});

if (isCorrect) {
  const totalCorrect = card.review_history.filter(r => r.correct).length;
  const daysToAdd = Math.pow(2, totalCorrect - 1);
  card.due_date = now + (daysToAdd * 24hours);
} else {
  // Stay in retention mode, but due immediately
  card.due_date = now;
}
```

#### Learning & Blitz Mode Logic (Continuous Cycling)
```javascript
// Track consecutive correct answers per card in session
const sessionProgress = new Map(); // cardId -> consecutiveCorrect

// Card is "mastered" when consecutiveCorrect >= 2
// Session continues until all cards are mastered or user exits
// Learning mode updates database, Blitz mode does not
```

## User Interface

### Card Management View Updates
- Added review information section showing due card counts
- Review buttons for Learning, Retention, and Blitz modes
- Enhanced card list showing mode and due status

### Review Session View
- Clean card display with prompt/response sections
- "Show Answer" button to reveal response
- "Correct"/"Incorrect" buttons for user feedback
- Progress indicator showing session status

### Visual Design
- Review section uses light blue background to distinguish from regular content
- Review cards have prominent blue border
- Color-coded buttons: green for correct, red for incorrect
- Disabled buttons for modes with no due cards

## Testing the Implementation

### Manual Testing Steps
1. **Create test cards**: Add several cards to a deck
2. **Test learning mode**: 
   - Start learning review
   - Answer cards correctly/incorrectly
   - Verify 20-second scheduling and graduation to retention
3. **Test retention mode**:
   - Review retained cards
   - Verify exponential scheduling (1, 2, 4, 8 days...)
4. **Test blitz mode**:
   - Start blitz session
   - Verify cards cycle until each is correct twice
   - Confirm no database changes

### Expected Behaviors
- New cards start in learning mode, due immediately
- Learning cards graduate after 2 consecutive correct answers
- Retention cards follow 2^n day scheduling
- Incorrect retention cards demote to learning mode
- Blitz mode doesn't affect regular scheduling
- Due counts update correctly after reviews

## Next Steps
This foundation enables future enhancements:
- Advanced scheduling algorithms (SM-2, FSRS)
- Review statistics and progress tracking
- Mobile-optimized review interface
- Batch review operations
- Custom scheduling parameters

The basic review system is now functional and ready for user testing and iteration.
