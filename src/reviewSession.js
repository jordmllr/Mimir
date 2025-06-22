import { ReviewScheduler } from './reviewScheduler.js'

export class ReviewSession {
  constructor(db) {
    this.db = db
    this.cards = []
    this.currentIndex = 0
    this.mode = null
    this.deckId = null
    this.showingAnswer = false
    this.sessionProgress = new Map() // For learning/blitz modes: cardId -> consecutive correct count
  }

  async start(deckId, mode) {
    this.deckId = deckId
    this.mode = mode
    this.currentIndex = 0
    this.showingAnswer = false
    this.sessionProgress.clear()

    if (mode === 'blitz') {
      // Blitz mode: get all cards in deck for continuous cycling
      this.cards = await this.db.cards.where('deck_id').equals(deckId).toArray()
      // Initialize session progress tracking
      this.cards.forEach(card => this.sessionProgress.set(card.id, 0))
    } else if (mode === 'learning') {
      // Learning mode: get only cards that are still in learning mode
      this.cards = await this.db.cards.where('deck_id').equals(deckId).and(card => card.mode === 'learning').toArray()
      // Initialize session progress tracking
      this.cards.forEach(card => this.sessionProgress.set(card.id, 0))
    } else if (mode === 'retaining') {
      // Retention mode: get only due cards (traditional spaced repetition)
      this.cards = await ReviewScheduler.getDueCards(this.db, deckId, mode)
    }

    if (this.cards.length === 0) {
      return false
    }

    // Shuffle cards for variety
    this.shuffleCards()
    return true
  }

  shuffleCards() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
  }

  getCurrentCard() {
    if (this.currentIndex >= this.cards.length) {
      return null
    }
    return this.cards[this.currentIndex]
  }

  showAnswer() {
    this.showingAnswer = true
  }

  async answerCard(isCorrect) {
    const card = this.getCurrentCard()
    if (!card) return

    // Handle continuous modes (learning and blitz)
    if (this.mode === 'learning' || this.mode === 'blitz') {
      this.updateProgress(card.id, isCorrect)

      if (isCorrect) {
        // Move to next card
        this.currentIndex++
      } else {
        // Shuffle wrong card to back of queue
        this.cards.splice(this.currentIndex, 1)
        this.cards.push(card)
      }

      // For learning mode, graduate cards when mastered (but don't update review history)
      if (this.mode === 'learning') {
        const masteryCount = this.sessionProgress.get(card.id) || 0
        if (isCorrect && masteryCount >= 2) {
          // Graduate to retention mode
          let updatedCard = ReviewScheduler.graduateCard(card)
          await this.db.cards.update(card.id, {
            mode: updatedCard.mode,
            due_date: updatedCard.due_date
            // Note: review_history is NOT updated for learning attempts
          })
        }
      }
    } else {
      // Retention mode: traditional spaced repetition
      let updatedCard = ReviewScheduler.scheduleRetainCard(card, isCorrect)

      // Save updated card to database
      await this.db.cards.update(card.id, {
        mode: updatedCard.mode,
        due_date: updatedCard.due_date,
        review_history: updatedCard.review_history
      })

      this.currentIndex++
    }

    this.showingAnswer = false
  }

  updateProgress(cardId, isCorrect) {
    const current = this.sessionProgress.get(cardId) || 0
    if (isCorrect) {
      this.sessionProgress.set(cardId, current + 1)
    } else {
      this.sessionProgress.set(cardId, 0)
    }
  }

  isCardMastered(cardId) {
    return (this.sessionProgress.get(cardId) || 0) >= 2
  }

  areAllCardsMastered() {
    return Array.from(this.sessionProgress.values()).every(count => count >= 2)
  }

  async handleContinuousMode() {
    // Check if all cards are mastered (2 consecutive correct)
    const allMastered = this.areAllCardsMastered()
    if (allMastered) {
      return true // Session complete
    }

    // Filter out mastered cards and continue with remaining
    this.cards = this.cards.filter(c => this.sessionProgress.get(c.id) < 2)
    this.currentIndex = 0
    this.shuffleCards()
    return false // Session continues
  }

  isSessionComplete() {
    if (this.mode === 'learning' || this.mode === 'blitz') {
      return this.areAllCardsMastered()
    } else {
      return this.currentIndex >= this.cards.length
    }
  }

  getSessionStats() {
    if (this.mode === 'blitz' || this.mode === 'learning') {
      const completed = Array.from(this.sessionProgress.values()).filter(count => count >= 2).length
      const total = this.sessionProgress.size
      return { completed, total }
    } else {
      return { completed: this.currentIndex, total: this.cards.length }
    }
  }
}
