import 'package:flutter/material.dart';

import '../models/order.dart';
import '../theme/app_theme.dart';

(Color fg, Color bg) laneColors(OrderLane lane) {
  switch (lane) {
    case OrderLane.newOrder:
      return (AppColors.newOrder, AppColors.newOrderBg);
    case OrderLane.kitchen:
      return (AppColors.preparing, AppColors.preparingBg);
    case OrderLane.ready:
      return (AppColors.ready, AppColors.readyBg);
    case OrderLane.done:
      return (AppColors.done, AppColors.doneBg);
  }
}

String fulfillmentLabel(String? fulfillment) {
  switch (fulfillment) {
    case 'dine_in':
      return 'Dine-in';
    case 'delivery':
      return 'Delivery';
    case 'pickup':
      return 'Pickup';
    default:
      return 'Order';
  }
}

/// A status pill driven by the order's own label from the catalog's
/// order-statuses config (never a hardcoded "New"/"Preparing" string), so a
/// merchant who renamed their statuses on the web sees the same words here.
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.label, required this.lane, this.dense = false});

  final String label;
  final OrderLane lane;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final (fg, bg) = laneColors(lane);
    return Container(
      padding: EdgeInsets.symmetric(horizontal: dense ? 8 : 10, vertical: dense ? 2 : 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: fg,
          fontSize: dense ? 10 : 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
