// Card Creation Alpine.js Component
function cardCreation() {
    return {
        // Component data
        cardData: {
            prompt: '',
            response: '',
            tags: ''
        },
        isLoading: false,
        message: '',
        messageType: 'success', // 'success' or 'error'
        db: null,
        swipeDetector: null,
        totalCards: 0,
        lastSwipeTime: 0, // Track last swipe to prevent rapid successive swipes

        // Initialize component
        async init() {
            console.log('Card creation component initialized');
            await this.initDatabase();
            await this.loadCardCount();
            this.initSwipeDetection();
            this.initNavigationHandling();
        },

        // Initialize IndexedDB
        async initDatabase() {
            try {
                this.db = await this.openDatabase();
                console.log('Database initialized for card creation');
            } catch (error) {
                console.error('Failed to initialize database:', error);
                this.showMessage('Failed to initialize database', 'error');
            }
        },

        // Initialize swipe detection
        initSwipeDetection() {
            const container = document.querySelector('.card-creation-container');
            if (container && typeof SwipeDetector !== 'undefined') {
                // Create swipe detector - it now automatically ignores form elements
                this.swipeDetector = new SwipeDetector(container, {
                    threshold: 50,
                    restraint: 100,
                    allowedTime: 300
                });

                // Swipe right to save card
                this.swipeDetector.onSwipeRight(() => {
                    console.log('Swipe right detected - saving card');
                    this.handleSwipeSave();
                });

                // Swipe left to discard/clear card
                this.swipeDetector.onSwipeLeft(() => {
                    console.log('Swipe left detected - clearing card');
                    this.handleSwipeDiscard();
                });

                console.log('Swipe detection initialized for card creation');
            } else {
                console.warn('SwipeDetector not available or container not found');
            }
        },

        // Initialize navigation handling for iOS compatibility
        initNavigationHandling() {
            // The global iOS navigation fix in user_interactions.js handles this
            // Just ensure it runs after Alpine.js initialization
            setTimeout(() => {
                if (typeof initIOSNavigationFix === 'function') {
                    initIOSNavigationFix();
                }
            }, 100);
        },

        // Open IndexedDB connection
        openDatabase() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;

                    // Create cards object store if it doesn't exist
                    if (!db.objectStoreNames.contains('cards')) {
                        const store = db.createObjectStore('cards', {
                            keyPath: DB_CONFIG.stores.cards.keyPath
                        });

                        // Create indexes
                        DB_CONFIG.stores.cards.indexes.forEach(index => {
                            store.createIndex(index.name, index.name, { unique: index.unique });
                        });
                    }
                };
            });
        },

        // Create a new card
        async createCard(source = 'form') {
            console.log('createCard called from:', source);

            if (!this.validateForm()) {
                return;
            }

            // Prevent duplicate submissions
            if (this.isLoading) {
                console.log('Card creation already in progress, ignoring duplicate request from:', source);
                return;
            }

            this.isLoading = true;
            this.clearMessage();

            try {
                const card = {
                    card_id: this.generateCardId(),
                    prompt: this.cardData.prompt.trim(),
                    response: this.cardData.response.trim(),
                    tags: this.parseTags(this.cardData.tags),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    review_count: 0,
                    last_reviewed: null
                };

                console.log('Attempting to save card:', card.card_id);
                await this.saveCardToDatabase(card);
                console.log('Card saved successfully:', card.card_id);

                await this.loadCardCount(); // Update card count after creating a card
                this.showMessage('Card created successfully!', 'success');
                this.clearForm();
                this.dismissKeyboard(); // Hide keyboard after successful save

                console.log('Card creation process completed for:', card.card_id);
            } catch (error) {
                console.error('Failed to create card:', error);
                this.showMessage('Failed to create card. Please try again.', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        // Save card to IndexedDB
        saveCardToDatabase(card) {
            return new Promise((resolve, reject) => {
                console.log('Starting database transaction for card:', card.card_id);

                const transaction = this.db.transaction(['cards'], 'readwrite');
                const store = transaction.objectStore('cards');

                transaction.oncomplete = () => {
                    console.log('Database transaction completed for card:', card.card_id);
                };

                transaction.onerror = (event) => {
                    console.error('Database transaction failed for card:', card.card_id, event);
                    reject(event.target.error);
                };

                const request = store.add(card);

                request.onsuccess = () => {
                    console.log('Card successfully added to database:', card.card_id);
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error('Failed to add card to database:', card.card_id, request.error);
                    reject(request.error);
                };
            });
        },

        // Load total card count
        async loadCardCount() {
            try {
                this.totalCards = await this.getCardCount();
                console.log('Total cards:', this.totalCards);
            } catch (error) {
                console.error('Failed to load card count:', error);
                this.totalCards = 0;
            }
        },

        // Get card count from IndexedDB
        getCardCount() {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cards'], 'readonly');
                const store = transaction.objectStore('cards');
                const request = store.count();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        // Validate form data
        validateForm() {
            if (!this.cardData.prompt.trim()) {
                this.showMessage('Please enter a prompt', 'error');
                return false;
            }

            if (!this.cardData.response.trim()) {
                this.showMessage('Please enter a response', 'error');
                return false;
            }

            return true;
        },

        // Clear the form
        clearForm() {
            this.cardData.prompt = '';
            this.cardData.response = '';
            this.cardData.tags = '';
            this.clearMessage();
        },

        // Parse tags from string input
        parseTags(tagsString) {
            if (!tagsString || !tagsString.trim()) {
                return [];
            }

            return tagsString
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
                .map(tag => tag.toLowerCase()); // Normalize to lowercase
        },

        // Dismiss keyboard by removing focus from active element
        dismissKeyboard() {
            if (document.activeElement && document.activeElement.blur) {
                document.activeElement.blur();
            }
        },

        // Handle swipe right (save card)
        async handleSwipeSave() {
            // Prevent rapid successive swipes (debounce)
            const now = Date.now();
            if (now - this.lastSwipeTime < 1000) { // 1 second debounce
                console.log('Swipe ignored - too soon after last swipe');
                return;
            }
            this.lastSwipeTime = now;

            // Only save if form has content and we're not already loading
            if (this.isLoading) {
                console.log('Swipe ignored - already loading');
                return;
            }

            if (!this.cardData.prompt.trim() && !this.cardData.response.trim()) {
                this.showMessage('Add some content before swiping to save', 'error');
                return;
            }

            // Provide visual feedback for swipe action
            this.showMessage('Swipe right detected - saving card...', 'success');

            // Small delay to show the swipe feedback message
            setTimeout(() => {
                this.createCard('swipe');
            }, 500);
        },

        // Handle swipe left (discard/clear card)
        handleSwipeDiscard() {
            // Only clear if we're not loading and there's content to clear
            if (this.isLoading) {
                return;
            }

            if (!this.cardData.prompt.trim() && !this.cardData.response.trim()) {
                this.showMessage('Nothing to discard', 'error');
                return;
            }

            // Provide visual feedback for swipe action
            this.showMessage('Swipe left detected - clearing form...', 'success');

            // Small delay to show the swipe feedback message
            setTimeout(() => {
                this.clearForm();
            }, 500);
        },

        // Generate unique card ID
        generateCardId() {
            return 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        },

        // Show message to user
        showMessage(text, type = 'success') {
            this.message = text;
            this.messageType = type;

            // Auto-hide success messages after 3 seconds
            if (type === 'success') {
                setTimeout(() => {
                    this.clearMessage();
                }, 3000);
            }
        },

        // Clear message
        clearMessage() {
            this.message = '';
        }
    };
}
