// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signInBtn = document.getElementById('sign-in-btn');
const signUpBtn = document.getElementById('sign-up-btn');
const messageDiv = document.getElementById('message');

// Check if user is already signed in
async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // User is already signed in, redirect to main page
        window.location.href = 'main.html';
    }
}

// Show message function
function showMessage(text, isError = false) {
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    
    if (isError) {
        messageDiv.classList.add('error');
        messageDiv.classList.remove('success');
    } else {
        messageDiv.classList.add('success');
        messageDiv.classList.remove('error');
    }
}

// Sign in function
async function signIn() {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        showMessage('Please enter both email and password', true);
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        showMessage('Sign in successful! Redirecting...');
        
        // Redirect to main page after successful sign in
        setTimeout(() => {
            window.location.href = 'main.html';
        }, 1000);
        
    } catch (error) {
        showMessage(error.message || 'Error signing in', true);
    }
}

// Sign up function
async function signUp() {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        showMessage('Please enter both email and password', true);
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        
        if (error) throw error;
        
        showMessage('Sign up successful! Please check your email for confirmation.');
        
    } catch (error) {
        showMessage(error.message || 'Error signing up', true);
    }
}

// Event listeners
signInBtn.addEventListener('click', signIn);
signUpBtn.addEventListener('click', signUp);

// Check if user is already signed in when page loads
checkUser();
