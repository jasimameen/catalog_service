import 'package:flutter/material.dart';

import '../services/sound_service.dart';
import '../state/app_state_scope.dart';
import '../theme/app_theme.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 14, 20, 0),
            child: Text('More', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14)),
                  child: Row(
                    children: [
                      Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.live, shape: BoxShape.circle)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          state.takingOrders && state.kitchenOpen
                              ? 'Taking orders · Kitchen open'
                              : 'Paused / kitchen closed',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                _sectionLabel('Sound'),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      _switchRow('Sound on this device', state.soundOn, state.setSoundOn, big: true, showDivider: true),
                      _switchRow('New dine-in / pickup / delivery', state.soundNewOrders, state.setSoundNewOrders,
                          dotColor: AppColors.newOrder, showDivider: true),
                      _switchRow('Waiter / bill requests', state.soundTableRequests, state.setSoundTableRequests,
                          dotColor: AppColors.request, showDivider: true),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Text('Volume', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                                const Spacer(),
                                Text('${(state.volume * 100).round()}%',
                                    style: const TextStyle(fontSize: 13, color: AppColors.textFaint)),
                              ],
                            ),
                            Slider(
                              value: state.volume,
                              onChanged: state.setVolume,
                              activeColor: AppColors.ready,
                              inactiveColor: AppColors.surface3,
                            ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(18, 0, 18, 16),
                        child: SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: OutlinedButton.icon(
                            onPressed: () => SoundService.instance.playOnce(AlertKind.newOrder),
                            icon: const Icon(Icons.volume_up_outlined, size: 18),
                            label: const Text('Test sound', style: TextStyle(fontWeight: FontWeight.w700)),
                            style: OutlinedButton.styleFrom(
                              backgroundColor: AppColors.surface2,
                              side: const BorderSide(color: AppColors.borderStrong),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Storefront running behind', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 2),
                            const Text("Tells guests you're busier than usual. Does not pause orders.",
                                style: TextStyle(fontSize: 12, color: AppColors.textFaint, height: 1.3)),
                          ],
                        ),
                      ),
                      Switch(
                        value: state.runningBehind,
                        onChanged: state.setRunningBehind,
                        activeTrackColor: AppColors.ready,
                        activeThumbColor: Colors.white,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                _sectionLabel("Today's reservations"),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    children: const [
                      _ReservationRow(time: '7:30p', name: 'Reyes, party of 4', showDivider: true),
                      _ReservationRow(time: '8:00p', name: 'Okafor, party of 2', showDivider: false),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                const Text('Confirm and manage reservations on the web dashboard',
                    style: TextStyle(fontSize: 12, color: AppColors.textFaint)),
                const SizedBox(height: 20),
                InkWell(
                  onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Opens the full dashboard on the web.')),
                  ),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.desktop_windows_outlined, color: AppColors.textDim, size: 20),
                        SizedBox(width: 12),
                        Expanded(child: Text('Open full dashboard on web', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
                        Icon(Icons.chevron_right, color: AppColors.textFaint),
                      ],
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

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text.toUpperCase(),
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDim, letterSpacing: 0.4)),
      );

  Widget _switchRow(String title, bool value, ValueChanged<bool> onChanged,
      {Color? dotColor, bool big = false, bool showDivider = false}) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 18, vertical: big ? 14 : 12),
      decoration: BoxDecoration(
        border: showDivider ? const Border(bottom: BorderSide(color: AppColors.border)) : null,
      ),
      child: Row(
        children: [
          if (dotColor != null) ...[
            Container(width: 8, height: 8, decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle)),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Text(title,
                style: TextStyle(fontSize: big ? 15 : 14, fontWeight: big ? FontWeight.w700 : FontWeight.w600)),
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

class _ReservationRow extends StatelessWidget {
  const _ReservationRow({required this.time, required this.name, required this.showDivider});

  final String time;
  final String name;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      decoration: BoxDecoration(
        border: showDivider ? const Border(bottom: BorderSide(color: AppColors.border)) : null,
      ),
      child: Row(
        children: [
          SizedBox(width: 56, child: Text(time, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700))),
          Expanded(child: Text(name, style: const TextStyle(fontSize: 14, color: AppColors.textDim))),
        ],
      ),
    );
  }
}
