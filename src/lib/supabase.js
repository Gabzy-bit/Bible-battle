import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client = null;
let configError = '';

if (isSupabaseConfigured) {
	try {
		client = createClient(supabaseUrl, supabaseAnonKey);
	} catch (error) {
		configError = error instanceof Error ? error.message : 'Invalid Supabase configuration';
	}
} else {
	configError = 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY';
}

export const supabase = client;
export const supabaseConfigError = configError;
