import { supabase } from '/supabaseClient.js'

window.login = async ({ email, password }) => {
  const el = document.querySelector('[x-data]')

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    el.__x.$data.message = `Error: ${error.message}`
  } else {
    el.__x.$data.message = `Welcome, ${data.user.email}`
  }
}
