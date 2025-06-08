// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered');
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}

// Handle install button
let deferredPrompt;
const installButton = document.getElementById('install-button');

// Initially hide the install button
installButton.style.display = 'none';

// For Android/Chrome: Use the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install button
    installButton.style.display = 'block';
});

// For iOS: Show instructions for manual installation
if (navigator.userAgent.match(/iPhone|iPad|iPod/)) {
    installButton.style.display = 'block';
    installButton.textContent = 'Install on iOS';
}

installButton.addEventListener('click', () => {
    // For Android/Chrome: Use the install prompt
    if (deferredPrompt) {
        deferredPrompt.prompt();
        
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    } 
    // For iOS: Show instructions
    else if (navigator.userAgent.match(/iPhone|iPad|iPod/)) {
        alert('To install this app on your iPhone:\n\n1. Tap the share icon (rectangle with arrow) at the bottom of the screen\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right corner');
    }
    // For other devices where installation isn't possible
    else {
        alert('This app is either already installed or cannot be installed on your device.');
    }
});
