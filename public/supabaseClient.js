import { createClient } from '@supabase/supabase-js'

// Use a self-executing function to create the client
(function() {
  // Get environment variables from Vercel
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Create and expose the client globally
  window.supabase = createClient(supabaseUrl, supabaseAnonKey);
})();
