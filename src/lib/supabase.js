import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingVars = [];

if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

let validationError = '';

if (supabaseUrl) {
	try {
		const parsed = new URL(supabaseUrl);
		if (!/^https?:$/.test(parsed.protocol)) {
			validationError = 'VITE_SUPABASE_URL must start with http:// or https://';
		}
	} catch {
		validationError = 'VITE_SUPABASE_URL is not a valid URL';
	}
}

let client = null;
let configError = '';

if (missingVars.length > 0) {
	configError = `Missing ${missingVars.join(', ')}`;
} else if (validationError) {
	configError = validationError;
} else {
	try {
		client = createClient(supabaseUrl, supabaseAnonKey);
	} catch (error) {
		configError = error instanceof Error ? error.message : 'Invalid Supabase configuration';
	}
}

const fallbackClient = new Proxy(
	{},
	{
		get() {
			return () => {
				throw new Error(`Supabase is not configured: ${configError || 'missing environment values'}`);
			};
		},
	}
);

export const isSupabaseConfigured = !configError;
export const supabase = client || fallbackClient;
export const supabaseConfigError = configError;
