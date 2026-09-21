import 'package:flutter/material.dart';

import '../state/app_state.dart';
import '../theme/app_theme.dart';

/// Persistent header shown on every screen after sign-in: catalog name,
/// connection state, and the taking-orders / kitchen-open pills.
class StoreStrip extends StatelessWidget {
  const StoreStrip({super.key, required this.state, this.trailing});

  final AppState state;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(state.catalogName,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(width: 4),
              const Icon(Icons.expand_more, size: 18, color: AppColors.textDim),
              const Spacer(),
              ?trailing,
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(right: 6),
                decoration: const BoxDecoration(color: AppColors.live, shape: BoxShape.circle),
              ),
              const Text('Live',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDim)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _pill(
                state.takingOrders ? 'Taking orders' : 'Paused',
                state.takingOrders ? AppColors.ready : AppColors.cancelled,
                state.takingOrders ? AppColors.readyBg : AppColors.cancelledBg,
              ),
              const SizedBox(width: 8),
              _pill(
                state.kitchenOpen ? 'Kitchen open' : 'Kitchen closed',
                state.kitchenOpen ? AppColors.textDim : AppColors.cancelled,
                state.kitchenOpen ? AppColors.surface2 : AppColors.cancelledBg,
                bordered: state.kitchenOpen,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _pill(String label, Color fg, Color bg, {bool bordered = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: bordered ? AppColors.borderStrong : fg.withValues(alpha: 0.4)),
      ),
      child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: fg)),
    );
  }
}
