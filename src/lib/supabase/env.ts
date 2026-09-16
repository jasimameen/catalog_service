// Central place that reads + validates the Supabase env vars, so every client
// module fails with one clear message instead of a cryptic fetch error.
//
// New dashboard names are preferred; the old anon / service_role names still work.
//
// NEXT_PUBLIC_* must be read as process.env.NEXT_PUBLIC_* literals. Next.js only
// inlines those exact expressions into the client bundle — process.env[name] is
// always undefined in the browser even when the var is set.

function required(label: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${label}. Copy .env.example to .env.local and fill in your Supabase project ` +
        `settings (see SETUP.md).`
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  );
}

/** Publishable (anon) key — same JWT role, new dashboard name. */
export function getSupabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY
  );
}

export function getSupabaseServiceRoleKey(): string {
  return required(
    "SUPABASE_SECRET_KEY",
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_ANON_KEY)
  );
}

export function hasSupabaseSecretKey(): boolean {
  return Boolean(
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
