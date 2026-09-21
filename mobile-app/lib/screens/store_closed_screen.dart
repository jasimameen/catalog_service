import 'package:flutter/material.dart';

import '../state/app_state_scope.dart';
import '../theme/app_theme.dart';

class StoreClosedScreen extends StatelessWidget {
  const StoreClosedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              color: AppColors.cancelledBg,
              child: Row(
                children: const [
                  Icon(Icons.lock_outline, color: AppColors.cancelled, size: 18),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      "Guests see your storefront as closed and can't check out",
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.cancelled),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  const SizedBox(height: 12),
                  Center(
                    child: Column(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppColors.cancelledBg,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.cancelled),
                          ),
                          child: const Icon(Icons.lock_outline, color: AppColors.cancelled, size: 30),
                        ),
                        const SizedBox(height: 12),
                        const Text('Store is closed', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 24),
                          child: Text(
                            'New orders and table requests are turned off until you reopen.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 14, color: AppColors.textDim, height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.receipt_long_outlined, color: AppColors.textDim, size: 20),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Tickets still in the kitchen', style: TextStyle(fontWeight: FontWeight.w600)),
                              Text("They'll finish normally", style: TextStyle(fontSize: 12, color: AppColors.textFaint)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 22),
              child: SizedBox(
                width: double.infinity,
                height: 64,
                child: ElevatedButton(
                  onPressed: () {
                    state.resumeRestaurant();
                    Navigator.of(context).pop();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text('Resume taking orders', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
