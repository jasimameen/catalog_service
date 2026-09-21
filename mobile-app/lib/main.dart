import 'package:flutter/material.dart';

import 'screens/app_shell.dart';
import 'screens/sign_in_screen.dart';
import 'services/auth_repository.dart';
import 'services/push_service.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const InstantCatalogOpsApp());
}

class InstantCatalogOpsApp extends StatelessWidget {
  const InstantCatalogOpsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Instant Catalog — Ops',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: const _StartupGate(),
    );
  }
}

/// Initializes Firebase (safe no-op until the platform's config file is in
/// place — see MOBILE_FIREBASE_SETUP.md) and skips straight to the app
/// shell when a session is already stored, instead of always landing on
/// sign-in.
class _StartupGate extends StatefulWidget {
  const _StartupGate();

  @override
  State<_StartupGate> createState() => _StartupGateState();
}

class _StartupGateState extends State<_StartupGate> {
  bool? _hasSession;

  @override
  void initState() {
    super.initState();
    _prepare();
  }

  Future<void> _prepare() async {
    await PushService.instance.initializeFirebase();
    final hasSession = await AuthRepository.instance.hasSession();
    if (mounted) setState(() => _hasSession = hasSession);
  }

  @override
  Widget build(BuildContext context) {
    if (_hasSession == null) {
      return const Scaffold(backgroundColor: AppColors.bg, body: SizedBox.shrink());
    }
    return _hasSession! ? const AppShell() : const SignInScreen();
  }
}
