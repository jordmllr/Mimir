// Define login function globally
window.login = async function({ email, password }) {
  const el = document.querySelector('[x-data]');

  try {
    const { data, error } = await window.supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      el.__x.$data.message = `Error: ${error.message}`;
    } else {
      el.__x.$data.message = `Welcome, ${data.user.email}`;
    }
  } catch (err) {
    el.__x.$data.message = `Error: ${err.message}`;
  }
};
