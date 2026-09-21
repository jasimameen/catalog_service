import 'package:flutter/material.dart';

import '../models/table_request.dart';
import '../services/sound_service.dart';
import '../state/app_state_scope.dart';
import '../theme/app_theme.dart';

/// Full-screen interrupt for a waiter/bill call — same urgency treatment
/// as a new order, but its own color so it's never confused with one.
class TableRequestScreen extends StatefulWidget {
  const TableRequestScreen({super.key, required this.request});

  final TableRequestItem request;

  @override
  State<TableRequestScreen> createState() => _TableRequestScreenState();
}

class _TableRequestScreenState extends State<TableRequestScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))..repeat();

  @override
  void initState() {
    super.initState();
    SoundService.instance.playLooping(AlertKind.tableRequest);
  }

  @override
  void dispose() {
    SoundService.instance.stop();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final req = widget.request;
    final label = req.kind == 'bill' ? 'Request bill' : 'Call waiter';

    return Scaffold(
      backgroundColor: AppColors.request,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                children: [
                  Text(state.catalogName,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
                  const Spacer(),
                  const _Dot(),
                  const SizedBox(width: 6),
                  const Text('Live', style: TextStyle(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  AnimatedBuilder(
                    animation: _controller,
                    builder: (context, _) {
                      final scale = 0.9 + _controller.value * 0.6;
                      final opacity = (1 - _controller.value).clamp(0.0, 1.0) * 0.5;
                      return SizedBox(
                        width: 84,
                        height: 84,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            Transform.scale(
                              scale: scale,
                              child: Opacity(
                                opacity: opacity,
                                child: Container(
                                  decoration: BoxDecoration(
                                      shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                                ),
                              ),
                            ),
                            Container(
                              width: 72,
                              height: 72,
                              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                              child: const Icon(Icons.campaign_outlined, color: AppColors.request, size: 32),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 22),
                  Text(label.toUpperCase(),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 1.4)),
                  const SizedBox(height: 22),
                  const Text('TABLE', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white70)),
                  Text(
                    req.tableNo ?? '?',
                    style: const TextStyle(fontSize: 128, fontWeight: FontWeight.w700, height: 0.9, color: Colors.white),
                  ),
                  const SizedBox(height: 22),
                  const Text('Requested just now', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                  const SizedBox(height: 22),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.22),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.volume_up, size: 16, color: Colors.white),
                        SizedBox(width: 8),
                        Text('Ringing…', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 68,
                    child: ElevatedButton(
                      onPressed: () {
                        state.markTableRequestSeen(req.id);
                        Navigator.of(context).pop();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.request,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      child: const Text('Mark as seen', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextButton(
                    onPressed: () {
                      state.markTableRequestSeen(req.id);
                      Navigator.of(context).pop();
                    },
                    child: const Text('Dismiss', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot();
  @override
  Widget build(BuildContext context) {
    return Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle));
  }
}
