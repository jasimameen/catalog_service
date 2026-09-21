import 'package:flutter/material.dart';

import '../models/order.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import 'status_pill.dart';

String timeAgo(String isoAt) {
  final at = DateTime.tryParse(isoAt);
  if (at == null) return '';
  final diff = DateTime.now().toUtc().difference(at.toUtc());
  if (diff.inSeconds < 60) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m';
  return '${diff.inHours}h';
}

/// One order ticket. [compact] renders the narrow tablet-lane variant;
/// otherwise it renders the full-width phone-list variant.
class TicketCard extends StatelessWidget {
  const TicketCard({
    super.key,
    required this.order,
    required this.state,
    required this.onOpen,
    required this.onPrimaryAction,
    this.compact = false,
    this.selected = false,
  });

  final CatalogOrder order;
  final AppState state;
  final VoidCallback onOpen;
  final VoidCallback onPrimaryAction;
  final bool compact;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final isNew = order.lane == OrderLane.newOrder;
    final (btnFg, btnBg) = _actionColors(order.lane);

    return InkWell(
      onTap: onOpen,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: EdgeInsets.all(compact ? 12 : 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(compact ? 12 : 16),
          border: Border.all(
            color: selected || isNew ? AppColors.newOrder : AppColors.border,
            width: selected || isNew ? 2 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                StatusPill(label: order.statusLabel, lane: order.lane, dense: compact),
                const SizedBox(width: 8),
                if (!compact)
                  Text(fulfillmentLabel(order.fulfillment),
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textDim)),
                const Spacer(),
                Text(timeAgo(order.createdAt),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textFaint)),
              ],
            ),
            if (compact) ...[
              const SizedBox(height: 2),
              Text(fulfillmentLabel(order.fulfillment).toUpperCase(),
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textFaint)),
            ],
            SizedBox(height: compact ? 6 : 10),
            Text(
              order.heroLabel,
              style: TextStyle(
                fontSize: compact ? 22 : (order.isDineIn ? 32 : 24),
                fontWeight: FontWeight.w700,
                height: 1.0,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 6),
            Text('${order.itemCount} item${order.itemCount == 1 ? '' : 's'}${compact ? '' : ' · ${order.itemSummary}'}',
                style: const TextStyle(fontSize: 13, color: AppColors.textDim),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            SizedBox(height: compact ? 8 : 12),
            if (!order.isDone)
              SizedBox(
                width: double.infinity,
                height: compact ? 44 : 52,
                child: ElevatedButton(
                  onPressed: onPrimaryAction,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: btnBg,
                    foregroundColor: btnFg,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(state.nextActionLabel(order),
                      style: TextStyle(fontSize: compact ? 12 : 15, fontWeight: FontWeight.w700)),
                ),
              ),
          ],
        ),
      ),
    );
  }

  (Color, Color) _actionColors(OrderLane lane) {
    switch (lane) {
      case OrderLane.kitchen:
        return (Colors.white, AppColors.preparing);
      default:
        return (Colors.white, AppColors.ready);
    }
  }
}
