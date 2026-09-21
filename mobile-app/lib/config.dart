import 'dart:io';

/// Base URL for the Next.js backend (src/app/api/mobile/*).
///
/// Override at build/run time for a real device or a deployed backend:
///   flutter run --dart-define=API_BASE_URL=https://catalog.hevyf.com
///
/// The default targets `next dev` on the same machine — the Android
/// emulator can't reach "localhost" (that's the emulator itself), so it
/// gets the documented 10.0.2.2 alias instead.
String get apiBaseUrl {
  const override = String.fromEnvironment('API_BASE_URL');
  if (override.isNotEmpty) return override;
  if (Platform.isAndroid) return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

/// Same project the Next.js app talks to (src/lib/supabase/env.ts). Anon
/// ("publishable") keys are meant to ship in client code — it's already in
/// the web app's browser bundle — RLS is what actually protects the data.
/// Used only to refresh an expired session token directly against Supabase
/// Auth; every other call goes through the Next.js /api/mobile/* routes.
const supabaseUrl = 'https://pumnvjnxlvsdkgiucrbc.supabase.co';
const supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bW52am54bHZzZGtnaXVjcmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDY2NzcsImV4cCI6MjA2MzUyMjY3N30.E-6iWXWLdgPK6a8i14MH-7XDxmmKqHQAHg1xjjmffrw';
