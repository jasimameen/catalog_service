import 'package:flutter/material.dart';

import '../services/sound_service.dart';
import '../state/app_state_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/store_strip.dart';
import 'store_closed_screen.dart';
import 'table_request_screen.dart';

class NowScreen extends StatelessWidget {
  const NowScreen({super.key, required this.onViewOrders});

  final VoidCallback onViewOrders;

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final newCount = state.newOrders.length;
    final pendingRequests = state.pendingTableRequests;

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StoreStrip(state: state),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
              children: [
                InkWell(
                  onTap: onViewOrders,
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('NEW ORDERS',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDim)),
                        Text('$newCount',
                            style: const TextStyle(fontSize: 56, fontWeight: FontWeight.w700, height: 1.05)),
                        Text(
                          newCount == 0 ? 'All caught up — kitchen is quiet' : 'Waiting to be accepted',
                          style: const TextStyle(fontSize: 13, color: AppColors.textFaint),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('TABLE REQUESTS',
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDim, letterSpacing: 0.4)),
                const SizedBox(height: 8),
                if (pendingRequests.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      border: Border.all(color: AppColors.borderStrong, style: BorderStyle.solid),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    alignment: Alignment.center,
                    child: const Text('No one is waiting', style: TextStyle(fontSize: 14, color: AppColors.textFaint)),
                  )
                else
                  ...pendingRequests.map((req) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: InkWell(
                          onTap: () => Navigator.of(context).push(MaterialPageRoute(
                              builder: (_) => TableRequestScreen(request: req))),
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            decoration: BoxDecoration(
                              color: AppColors.requestBg,
                              border: Border.all(color: AppColors.request),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.campaign_outlined, color: AppColors.request, size: 20),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Table ${req.tableNo ?? '?'} · ${req.kind == 'bill' ? 'Request bill' : 'Call waiter'}',
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                                  ),
                                ),
                                const Icon(Icons.chevron_right, color: AppColors.request),
                              ],
                            ),
                          ),
                        ),
                      )),
                const SizedBox(height: 20),
                const Text('STORE CONTROLS',
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDim, letterSpacing: 0.4)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      _controlRow(
                        title: 'Pause new orders',
                        subtitle: "Guests can't check out. Tickets in progress still finish.",
                        value: !state.takingOrders,
                        onChanged: (_) => state.togglePause(),
                        showDivider: true,
                      ),
                      _controlRow(
                        title: 'Close kitchen',
                        subtitle: 'Guests see the store as closed.',
                        value: !state.kitchenOpen,
                        onChanged: (_) => state.toggleKitchen(),
                        showDivider: false,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton(
                    onPressed: () {
                      state.closeRestaurant();
                      Navigator.of(context)
                          .push(MaterialPageRoute(builder: (_) => const StoreClosedScreen()));
                    },
                    style: OutlinedButton.styleFrom(
                      backgroundColor: AppColors.cancelledBg,
                      foregroundColor: AppColors.cancelled,
                      side: const BorderSide(color: AppColors.cancelled),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text('Close restaurant', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: () => SoundService.instance.playOnce(AlertKind.newOrder),
                    icon: const Icon(Icons.volume_up_outlined, size: 18, color: AppColors.textDim),
                    label: const Text('Test sound', style: TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w600)),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: AppColors.surface,
                      side: const BorderSide(color: AppColors.border),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _controlRow({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    required bool showDivider,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        border: showDivider ? const Border(bottom: BorderSide(color: AppColors.border)) : null,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textFaint, height: 1.3)),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeTrackColor: AppColors.ready,
            activeThumbColor: Colors.white,
          ),
        ],
      ),
    );
  }
}
