document.addEventListener('DOMContentLoaded', () => {
    const cardForm = document.getElementById('card-form');
    
    cardForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const prompt = document.getElementById('card-prompt').value.trim();
        const response = document.getElementById('card-response').value.trim();
        
        if (prompt && response) {
            const newCard = {
                prompt: prompt,
                response: response
            };
            
            addCard(newCard)
                .then(() => {
                    alert('Card created successfully!');
                    cardForm.reset();
                })
                .catch(error => {
                    console.error('Error creating card:', error);
                    alert('Failed to create card: ' + error.message);
                });
        }
    });
});