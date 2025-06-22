export class MimirDatabase {
  constructor() {
    this.db = new Dexie('MimirDB')
    this.setupSchema()
  }

  setupSchema() {
    // Version 1: Basic schema
    this.db.version(1).stores({
      decks: '++id, name, description, created_at, updated_at',
      cards: '++id, deck_id, prompt, response, created_at, updated_at'
    })

    // Version 2: Add review fields
    this.db.version(2).stores({
      decks: '++id, name, description, created_at, updated_at',
      cards: '++id, deck_id, prompt, response, mode, due_date, review_history, created_at, updated_at'
    }).upgrade(tx => {
      return tx.cards.toCollection().modify(card => {
        card.mode = 'learning'
        card.due_date = new Date()
        card.review_history = []
      })
    })

    this.setupHooks()
  }

  setupHooks() {
    // Timestamp hooks
    this.db.decks.hook('creating', (primKey, obj, trans) => {
      obj.created_at = new Date()
      obj.updated_at = new Date()
    })

    this.db.decks.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updated_at = new Date()
    })

    this.db.cards.hook('creating', (primKey, obj, trans) => {
      obj.created_at = new Date()
      obj.updated_at = new Date()
    })

    this.db.cards.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updated_at = new Date()
    })
  }

  // Deck operations
  async createDeck(name, description) {
    return await this.db.decks.add({ name, description })
  }

  async getDeck(id) {
    return await this.db.decks.get(id)
  }

  async getAllDecks() {
    return await this.db.decks.toArray()
  }

  async updateDeck(id, updates) {
    return await this.db.decks.update(id, updates)
  }

  async deleteDeck(id) {
    // Delete all cards in the deck first
    await this.db.cards.where('deck_id').equals(id).delete()
    // Then delete the deck
    return await this.db.decks.delete(id)
  }

  // Card operations
  async createCard(deckId, prompt, response) {
    return await this.db.cards.add({
      deck_id: deckId,
      prompt,
      response,
      mode: 'learning',
      due_date: new Date(),
      review_history: []
    })
  }

  async getCard(id) {
    return await this.db.cards.get(id)
  }

  async getCardsByDeck(deckId) {
    return await this.db.cards.where('deck_id').equals(deckId).toArray()
  }

  async updateCard(id, updates) {
    return await this.db.cards.update(id, updates)
  }

  async deleteCard(id) {
    return await this.db.cards.delete(id)
  }
}
