(function() {
  // Get environment variables from Vercel
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Use the global supabaseClient from CDN
  window.supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
})();

