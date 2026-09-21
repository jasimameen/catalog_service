import 'package:flutter/material.dart';

import '../models/order.dart';
import '../services/sound_service.dart';
import '../state/app_state_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/status_pill.dart';
import 'order_detail_screen.dart';

/// Full-screen, can't-miss interrupt for a brand new ticket. Solid
/// saturated background — deliberately not a toast — with a looping ringer
/// until it's opened or dismissed.
class NewOrderAlarmScreen extends StatefulWidget {
  const NewOrderAlarmScreen({super.key, required this.order});

  final CatalogOrder order;

  @override
  State<NewOrderAlarmScreen> createState() => _NewOrderAlarmScreenState();
}

class _NewOrderAlarmScreenState extends State<NewOrderAlarmScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))..repeat();

  @override
  void initState() {
    super.initState();
    SoundService.instance.playLooping(AlertKind.newOrder);
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
    final order = widget.order;
    return Scaffold(
      backgroundColor: AppColors.newOrder,
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
                  const _LiveDot(),
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
                              child: const Icon(Icons.receipt_long_outlined, color: AppColors.newOrder, size: 32),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 22),
                  Text(
                    'NEW · ${fulfillmentLabel(order.fulfillment).toUpperCase()}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 1.4),
                  ),
                  const SizedBox(height: 22),
                  if (order.isDineIn) ...[
                    const Text('TABLE', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white70)),
                    Text(
                      order.tableNo ?? '?',
                      style: const TextStyle(fontSize: 128, fontWeight: FontWeight.w700, height: 0.9, color: Colors.white),
                    ),
                  ] else
                    Text(
                      order.shopName,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 44, fontWeight: FontWeight.w700, height: 1.0, color: Colors.white),
                    ),
                  const SizedBox(height: 22),
                  Text('${order.itemCount} items  ·  Placed just now',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
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
                        state.advanceStatus(order.id);
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: order.id)),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.newOrder,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      child: const Text('Accept & start', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('View all new', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
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

class _LiveDot extends StatelessWidget {
  const _LiveDot();
  @override
  Widget build(BuildContext context) {
    return Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle));
  }
}
