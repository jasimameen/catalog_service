import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Thin wrapper around the platform keychain/keystore for the Supabase
/// session tokens — nothing else in this app needs persisting locally.
class SecureStore {
  SecureStore._();
  static final SecureStore instance = SecureStore._();

  final _storage = const FlutterSecureStorage();

  static const _accessTokenKey = 'ic_access_token';
  static const _refreshTokenKey = 'ic_refresh_token';

  Future<void> saveSession({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  Future<String?> readAccessToken() => _storage.read(key: _accessTokenKey);
  Future<String?> readRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}
