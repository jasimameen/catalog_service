import 'dart:convert';
import 'package:http/http.dart' as http;

import '../config.dart';
import 'secure_store.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override
  String toString() => message;
}

/// Thrown when the refresh token itself is no longer valid — the app should
/// drop back to the sign-in screen.
class SessionExpiredException implements Exception {}

/// Talks to the Next.js mobile API (src/app/api/mobile/*), attaching the
/// signed-in user's Supabase access token and transparently refreshing it
/// once on a 401 before giving up.
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  Future<Map<String, dynamic>> get(String path) => _send('GET', path);
  Future<Map<String, dynamic>> post(String path, [Map<String, dynamic>? body]) =>
      _send('POST', path, body);
  Future<Map<String, dynamic>> delete(String path, [Map<String, dynamic>? body]) =>
      _send('DELETE', path, body);

  Future<Map<String, dynamic>> _send(String method, String path, [Map<String, dynamic>? body]) =>
      _sendImpl(method, path, body, isRetry: false);

  Future<Map<String, dynamic>> _sendImpl(
    String method,
    String path,
    Map<String, dynamic>? body, {
    required bool isRetry,
  }) async {
    final token = await SecureStore.instance.readAccessToken();
    final uri = Uri.parse('$apiBaseUrl$path');
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    final http.Response response;
    switch (method) {
      case 'POST':
        response = await http.post(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      case 'DELETE':
        response = await http.delete(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      default:
        response = await http.get(uri, headers: headers);
    }

    if (response.statusCode == 401 && !isRetry) {
      final refreshed = await _tryRefresh();
      if (refreshed) return _sendImpl(method, path, body, isRetry: true);
      throw SessionExpiredException();
    }

    final decoded = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      final message = decoded is Map && decoded['error'] is String
          ? decoded['error'] as String
          : 'Something went wrong (${response.statusCode}).';
      throw ApiException(response.statusCode, message);
    }
    return decoded as Map<String, dynamic>;
  }

  Future<bool> _tryRefresh() async {
    final refreshToken = await SecureStore.instance.readRefreshToken();
    if (refreshToken == null) return false;

    final uri = Uri.parse('$supabaseUrl/auth/v1/token?grant_type=refresh_token');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json', 'apikey': supabaseAnonKey},
      body: jsonEncode({'refresh_token': refreshToken}),
    );
    if (response.statusCode >= 400) return false;

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final accessToken = data['access_token'] as String?;
    final newRefreshToken = data['refresh_token'] as String?;
    if (accessToken == null || newRefreshToken == null) return false;

    await SecureStore.instance.saveSession(accessToken: accessToken, refreshToken: newRefreshToken);
    return true;
  }
}
