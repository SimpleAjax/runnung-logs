// Supabase Configuration File

// IMPORTANT: Replace with your actual Supabase Project URL and Anon Key
const SUPABASE_URL = 'https://gfhgriudfrdgxgsoawgx.supabase.co'; // Replace! Example: 'https://xyz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmaGdyaXVkZnJkZ3hnc29hd2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMjU0ODIsImV4cCI6MjA2MTkwMTQ4Mn0.fjpfsTGiyrf7czmLlURFgvZQc47rbg1tG9bM3i31ycM'; // Replace!

// --- DO NOT EDIT BELOW THIS LINE ---
// Make variables accessible globally (simple approach for this app)
window.SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};

// Basic check to remind user if placeholders are still present
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('CONFIG WARNING: Supabase URL or Anon Key in config.js still contains placeholder values!');
    // You could add an alert here too if desired
    // alert('WARNING: Please update your Supabase credentials in config.js');
}
