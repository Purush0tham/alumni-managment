// Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY
// with values from Supabase Dashboard > Settings > API
const SUPABASE_URL = 'https://uglvwgsnjnpuuqtysoca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbHZ3Z3Nuam5wdXVxdHlzb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzQ5NDEsImV4cCI6MjA5NjQxMDk0MX0.MuzHUdJiBBq2_wy_4w0bk2CN2xFAXe8VOPxg-1Xxrs0';
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
