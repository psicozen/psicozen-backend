export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  secretKey: string;
  jwtSecret: string;
}

export const getSupabaseConfig = (): SupabaseConfig => ({
  url: process.env.SUPABASE_URL || '',
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  secretKey: process.env.SUPABASE_SECRET_KEY || '',
  jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
});
