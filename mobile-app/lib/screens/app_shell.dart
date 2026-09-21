import 'package:flutter/material.dart';

import '../services/push_service.dart';
import '../state/app_state.dart';
import '../state/app_state_scope.dart';
import '../theme/app_theme.dart';
import 'menu_screen.dart';
import 'more_screen.dart';
import 'new_order_alarm_screen.dart';
import 'now_screen.dart';
import 'orders_screen.dart';
import 'sign_in_screen.dart';
import 'table_request_screen.dart';

const double kTabletBreakpoint = 700;

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final AppState _state = AppState();
  int _index = 0;

  static const _destinations = [
    (icon: Icons.show_chart, label: 'Now'),
    (icon: Icons.receipt_long_outlined, label: 'Orders'),
    (icon: Icons.grid_view_outlined, label: 'Menu'),
    (icon: Icons.more_horiz, label: 'More'),
  ];

  @override
  void initState() {
    super.initState();
    _state.onNewOrder = (order) {
      final navigator = Navigator.of(context, rootNavigator: true);
      if (!navigator.mounted) return;
      navigator.push(MaterialPageRoute(builder: (_) => NewOrderAlarmScreen(order: order)));
    };
    _state.onNewTableRequest = (request) {
      final navigator = Navigator.of(context, rootNavigator: true);
      if (!navigator.mounted) return;
      navigator.push(MaterialPageRoute(builder: (_) => TableRequestScreen(request: request)));
    };
    _state.onSessionExpired = () {
      Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const SignInScreen()),
        (route) => false,
      );
    };
    _state.bootstrap().then((_) {
      if (_state.loadError == null) PushService.instance.startForSignedInUser();
    });
  }

  @override
  void dispose() {
    _state.dispose();
    super.dispose();
  }

  void _goToOrders() => setState(() => _index = 1);

  @override
  Widget build(BuildContext context) {
    return AppStateScope(
      state: _state,
      child: AnimatedBuilder(
        animation: _state,
        builder: (context, _) {
          if (_state.isLoading) {
            return const Scaffold(
              backgroundColor: AppColors.bg,
              body: Center(child: CircularProgressIndicator()),
            );
          }
          if (_state.loadError != null) {
            return Scaffold(
              backgroundColor: AppColors.bg,
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_off, color: AppColors.textFaint, size: 32),
                      const SizedBox(height: 12),
                      Text(_state.loadError!,
                          textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textDim)),
                      const SizedBox(height: 16),
                      OutlinedButton(onPressed: _state.bootstrap, child: const Text('Retry')),
                    ],
                  ),
                ),
              ),
            );
          }

          final screens = [
            NowScreen(onViewOrders: _goToOrders),
            const OrdersScreen(),
            const MenuScreen(),
            const MoreScreen(),
          ];

          return LayoutBuilder(
            builder: (context, constraints) {
              final isTablet = constraints.maxWidth >= kTabletBreakpoint;
              if (isTablet) {
                return Scaffold(
                  backgroundColor: AppColors.bg,
                  body: Row(
                    children: [
                      _RailNav(
                        index: _index,
                        onChanged: (i) => setState(() => _index = i),
                        badge: _state.newOrders.length,
                      ),
                      Expanded(child: screens[_index]),
                    ],
                  ),
                );
              }
              return Scaffold(
                backgroundColor: AppColors.bg,
                body: screens[_index],
                bottomNavigationBar: _BottomNav(
                  index: _index,
                  onChanged: (i) => setState(() => _index = i),
                  badge: _state.newOrders.length,
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  const _BottomNav({required this.index, required this.onChanged, required this.badge});

  final int index;
  final ValueChanged<int> onChanged;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: List.generate(_AppShellState._destinations.length, (i) {
              final dest = _AppShellState._destinations[i];
              final active = i == index;
              final color = active ? AppColors.ready : AppColors.textDim;
              return Expanded(
                child: InkWell(
                  onTap: () => onChanged(i),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Icon(dest.icon, size: 22, color: color),
                          if (i == 1 && badge > 0)
                            Positioned(
                              top: -4,
                              right: -8,
                              child: Container(
                                width: 16,
                                height: 16,
                                decoration: const BoxDecoration(
                                  color: AppColors.newOrder,
                                  shape: BoxShape.circle,
                                ),
                                alignment: Alignment.center,
                                child: Text('$badge',
                                    style: const TextStyle(
                                        fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(dest.label,
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                              color: color)),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _RailNav extends StatelessWidget {
  const _RailNav({required this.index, required this.onChanged, required this.badge});

  final int index;
  final ValueChanged<int> onChanged;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 76,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(right: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 18),
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(9)),
              child: const Icon(Icons.check, color: Colors.white, size: 18),
            ),
            const SizedBox(height: 28),
            ...List.generate(_AppShellState._destinations.length, (i) {
              final dest = _AppShellState._destinations[i];
              final active = i == index;
              final color = active ? AppColors.ready : AppColors.textDim;
              return Padding(
                padding: const EdgeInsets.only(bottom: 22),
                child: InkWell(
                  onTap: () => onChanged(i),
                  child: Column(
                    children: [
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Icon(dest.icon, size: 24, color: color),
                          if (i == 1 && badge > 0)
                            Positioned(
                              top: -4,
                              right: -8,
                              child: Container(
                                width: 15,
                                height: 15,
                                decoration: const BoxDecoration(color: AppColors.newOrder, shape: BoxShape.circle),
                                alignment: Alignment.center,
                                child: Text('$badge',
                                    style: const TextStyle(
                                        fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white)),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      Text(dest.label,
                          style: TextStyle(
                              fontSize: 10, fontWeight: active ? FontWeight.w700 : FontWeight.w600, color: color)),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
