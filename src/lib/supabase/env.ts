// Central place that reads + validates the Supabase env vars, so every client
// module fails with one clear message instead of a cryptic fetch error.
//
// New dashboard names are preferred; the old anon / service_role names still work.

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

function required(names: string[]): string {
  const value = firstEnv(...names);
  if (!value) {
    throw new Error(
      `Missing ${names[0]}. Copy .env.example to .env.local and fill in your Supabase project ` +
        `settings (see SETUP.md).`
    );
  }
  return value;
}

const URL_NAMES = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"] as const;

const PUBLISHABLE_NAMES = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
] as const;

const SECRET_NAMES = ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export function getSupabaseUrl(): string {
  return required([...URL_NAMES]);
}

/** Publishable (anon) key — same JWT role, new dashboard name. */
export function getSupabaseAnonKey(): string {
  return required([...PUBLISHABLE_NAMES]);
}

export function getSupabaseServiceRoleKey(): string {
  return required([...SECRET_NAMES]);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(firstEnv(...URL_NAMES) && firstEnv(...PUBLISHABLE_NAMES));
}

export function hasSupabaseSecretKey(): boolean {
  return Boolean(firstEnv(...SECRET_NAMES));
}
