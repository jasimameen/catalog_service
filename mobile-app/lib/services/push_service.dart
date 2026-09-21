import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'api_client.dart';
import 'sound_service.dart';

/// Must be a top-level function — this is what actually shows "New dine-in
/// · Table 7 · 3 items" when the app is backgrounded or killed, per the
/// design's background/killed notification-copy spec.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Firebase auto-initializes itself here on Android; nothing else to do —
  // the OS already shows the notification from the payload's `notification`
  // block. This handler exists so data-only messages could add local logic
  // later (e.g. pre-fetching the order) without changing the server payload.
}

/// FCM wiring — safe to call even before Firebase is configured for a given
/// platform (Android has google-services.json; iOS needs
/// GoogleService-Info.plist — see MOBILE_FIREBASE_SETUP.md). Every step is
/// wrapped so a missing config file disables push, not the whole app.
class PushService {
  PushService._();
  static final PushService instance = PushService._();

  final _localNotifications = FlutterLocalNotificationsPlugin();
  bool _ready = false;

  static const _channel = AndroidNotificationChannel(
    'orders_high_priority',
    'New orders & table requests',
    description: 'Cannot-miss alerts for new tickets and table requests.',
    importance: Importance.max,
    playSound: false, // SoundService drives the looping alarm itself.
  );

  Future<void> initializeFirebase() async {
    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      _ready = true;
    } catch (error) {
      // No config file for this platform yet — push stays off, rest of the
      // app is unaffected.
      _ready = false;
    }
  }

  /// Call once signed in: requests permission, grabs the FCM token, and
  /// registers it with the backend so it knows where to push this device.
  Future<void> startForSignedInUser() async {
    if (!_ready) return;
    try {
      await FirebaseMessaging.instance.requestPermission(alert: true, badge: true, sound: true);
      await _initLocalNotifications();

      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _registerToken(token);
      FirebaseMessaging.instance.onTokenRefresh.listen(_registerToken);

      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    } catch (error) {
      // Permission denied, or platform not configured — leave push off.
    }
  }

  Future<void> _registerToken(String token) async {
    try {
      await ApiClient.instance.post('/api/mobile/push/register', {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      });
    } catch (_) {
      // Best-effort — a failed registration just means no push until the
      // next app start retries it.
    }
  }

  Future<void> _initLocalNotifications() async {
    await _localNotifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
    );
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);
  }

  void _handleForegroundMessage(RemoteMessage message) {
    final kind = message.data['kind'];
    SoundService.instance.playLooping(
      kind == 'service_request' ? AlertKind.tableRequest : AlertKind.newOrder,
    );

    final notification = message.notification;
    if (notification == null) return;
    _localNotifications.show(
      message.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'orders_high_priority',
          'New orders & table requests',
          importance: Importance.max,
          priority: Priority.max,
          fullScreenIntent: true,
        ),
        iOS: DarwinNotificationDetails(interruptionLevel: InterruptionLevel.timeSensitive),
      ),
    );
  }
}
