export const ReviewScheduler = {
  // Graduate card from learning to retention mode
  graduateCard(card) {
    const graduatedCard = { ...card }
    graduatedCard.mode = 'retaining'
    graduatedCard.due_date = new Date(Date.now() + (24 * 60 * 60 * 1000)) // Due in 1 day
    return graduatedCard
  },

  // Retention mode: 2^n days where n = number of correct reviews
  scheduleRetainCard(card, isCorrect) {
    const updatedCard = { ...card }
    const now = new Date()
    const reviewEntry = {
      timestamp: now,
      correct: isCorrect
    }

    // Create a deep copy of review_history to avoid mutation
    if (!updatedCard.review_history) updatedCard.review_history = []
    updatedCard.review_history = [...updatedCard.review_history, reviewEntry]

    if (isCorrect) {
      // Count total correct reviews for this card
      const correctCount = updatedCard.review_history.filter(entry => entry.correct).length
      const daysToAdd = Math.pow(2, correctCount - 1) // 2^(n-1) where n is correct count
      updatedCard.due_date = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000))
    } else {
      // Incorrect - schedule for immediate review but stay in retention mode
      updatedCard.due_date = now
    }

    return updatedCard
  },

  // Get cards due for review
  async getDueCards(db, deckId, mode) {
    const now = new Date()
    
    if (mode === 'retaining') {
      return await db.cards
        .where('deck_id').equals(deckId)
        .and(card => card.mode === 'retaining' && card.due_date <= now)
        .toArray()
    } else if (mode === 'learning') {
      return await db.cards
        .where('deck_id').equals(deckId)
        .and(card => card.mode === 'learning')
        .toArray()
    }
    
    return []
  },

  // Get due counts for UI display
  async getDueCounts(db, deckId) {
    const now = new Date()
    const allCards = await db.cards.where('deck_id').equals(deckId).toArray()
    
    return {
      learning: allCards.filter(card => card.mode === 'learning').length,
      retaining: allCards.filter(card => 
        card.mode === 'retaining' && card.due_date <= now
      ).length,
      total: allCards.length
    }
  }
}
