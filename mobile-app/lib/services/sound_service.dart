import 'package:audioplayers/audioplayers.dart';

enum AlertKind { newOrder, tableRequest }

/// Owns the "cannot miss" looping alarm — plays until the ticket is opened
/// or 30s pass (per the design's Notification/Sound spec), and respects the
/// master/per-type mute switches and volume set on the More screen.
class SoundService {
  SoundService._();
  static final SoundService instance = SoundService._();

  final AudioPlayer _player = AudioPlayer();

  bool masterOn = true;
  bool newOrdersOn = true;
  bool tableRequestsOn = true;
  double volume = 0.8;

  bool get isMuted => !masterOn;

  Future<void> playOnce(AlertKind kind) async {
    if (!_enabledFor(kind)) return;
    await _player.stop();
    await _player.setReleaseMode(ReleaseMode.release);
    await _player.setVolume(volume);
    await _player.play(AssetSource(_assetFor(kind)));
  }

  /// Loops until [stop] is called or 30s pass, whichever first.
  Future<void> playLooping(AlertKind kind, {Duration timeout = const Duration(seconds: 30)}) async {
    if (!_enabledFor(kind)) return;
    await _player.stop();
    await _player.setReleaseMode(ReleaseMode.loop);
    await _player.setVolume(volume);
    await _player.play(AssetSource(_assetFor(kind)));
    Future.delayed(timeout, () {
      _player.stop();
    });
  }

  Future<void> stop() => _player.stop();

  bool _enabledFor(AlertKind kind) {
    if (!masterOn) return false;
    return kind == AlertKind.newOrder ? newOrdersOn : tableRequestsOn;
  }

  String _assetFor(AlertKind kind) =>
      kind == AlertKind.newOrder ? 'sounds/alarm.wav' : 'sounds/request.wav';
}
