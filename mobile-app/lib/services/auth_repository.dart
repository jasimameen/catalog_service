import 'dart:convert';
import 'package:http/http.dart' as http;

import '../config.dart';
import 'secure_store.dart';

class AuthResult {
  final bool ok;
  final bool needsVerification;
  final int? cooldownSeconds;
  final String? error;
  AuthResult({required this.ok, this.needsVerification = false, this.cooldownSeconds, this.error});
}

/// Talks to the *existing* web auth routes (src/app/api/auth/sign-in and
/// verify-otp) rather than duplicating that logic — they now also return
/// Supabase session tokens for callers with no cookies to read a session
/// back from.
class AuthRepository {
  AuthRepository._();
  static final AuthRepository instance = AuthRepository._();

  Future<AuthResult> signIn({required String email, required String password}) async {
    final response = await http.post(
      Uri.parse('$apiBaseUrl/api/auth/sign-in'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode >= 400) {
      return AuthResult(ok: false, error: data['error'] as String? ?? 'Sign-in failed.');
    }
    if (data['needsVerification'] == true) {
      return AuthResult(ok: true, needsVerification: true, cooldownSeconds: data['cooldownSeconds'] as int?);
    }
    await _storeSession(data['session'] as Map<String, dynamic>?);
    return AuthResult(ok: true);
  }

  Future<AuthResult> verifyOtp({required String email, required String code, String? password}) async {
    final response = await http.post(
      Uri.parse('$apiBaseUrl/api/auth/verify-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'code': code, 'password': ?password}),
    );
    final data = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode >= 400) {
      return AuthResult(ok: false, error: data['error'] as String? ?? "That code didn't work.");
    }
    await _storeSession(data['session'] as Map<String, dynamic>?);
    return AuthResult(ok: true);
  }

  Future<void> _storeSession(Map<String, dynamic>? session) async {
    final accessToken = session?['access_token'] as String?;
    final refreshToken = session?['refresh_token'] as String?;
    if (accessToken != null && refreshToken != null) {
      await SecureStore.instance.saveSession(accessToken: accessToken, refreshToken: refreshToken);
    }
  }

  Future<bool> hasSession() async => (await SecureStore.instance.readAccessToken()) != null;

  Future<void> signOut() => SecureStore.instance.clear();
}
