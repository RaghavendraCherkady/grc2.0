import { monitoring } from './monitoring';

interface EnvConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_OPENAI_API_KEY?: string;
}

function validateEnv(): EnvConfig {
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!import.meta.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    monitoring.error(error);
    throw new Error(error);
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  if (!supabaseUrl.startsWith('https://')) {
    const error = 'VITE_SUPABASE_URL must start with https://';
    monitoring.error(error);
    throw new Error(error);
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (anonKey.length < 100) {
    const error = 'VITE_SUPABASE_ANON_KEY appears to be invalid (too short)';
    monitoring.error(error);
    throw new Error(error);
  }

  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    monitoring.warn('VITE_OPENAI_API_KEY not configured - AI features will use fallback');
  }

  monitoring.info('Environment validation passed', {
    hasOpenAI: !!import.meta.env.VITE_OPENAI_API_KEY,
    supabaseUrl: supabaseUrl.split('.')[0] + '...',
  });

  return {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: anonKey,
    VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY as string | undefined,
  };
}

export const env = validateEnv();

export function getEnvStatus() {
  return {
    supabaseConfigured: !!env.VITE_SUPABASE_URL && !!env.VITE_SUPABASE_ANON_KEY,
    openaiConfigured: !!env.VITE_OPENAI_API_KEY,
    environment: import.meta.env.MODE,
    isProduction: import.meta.env.PROD,
  };
}
