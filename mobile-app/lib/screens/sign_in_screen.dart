import 'package:flutter/material.dart';

import '../services/auth_repository.dart';
import '../theme/app_theme.dart';
import 'app_shell.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _codeController = TextEditingController();

  bool _needsCode = false;
  bool _submitting = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });

    final result = _needsCode
        ? await AuthRepository.instance.verifyOtp(
            email: _emailController.text.trim(),
            code: _codeController.text.trim(),
            password: _passwordController.text,
          )
        : await AuthRepository.instance.signIn(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );

    if (!mounted) return;
    setState(() => _submitting = false);

    if (!result.ok) {
      setState(() => _error = result.error);
      return;
    }
    if (result.needsVerification) {
      setState(() => _needsCode = true);
      return;
    }

    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const AppShell()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(7)),
                    child: const Icon(Icons.check, color: Colors.white, size: 16),
                  ),
                  const SizedBox(width: 8),
                  const Text('INSTANT CATALOG',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 1.0)),
                ],
              ),
              const Padding(
                padding: EdgeInsets.only(left: 36, top: 2),
                child: Text('Operations', style: TextStyle(fontSize: 12, color: AppColors.textFaint)),
              ),
              const Spacer(),
              Text(_needsCode ? 'Check your email' : 'Sign in',
                  style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(
                _needsCode
                    ? "We sent a 6-digit code to ${_emailController.text.trim()}."
                    : 'Use your work email — same login as the web dashboard.',
                style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.textDim),
              ),
              const SizedBox(height: 28),
              if (!_needsCode) ...[
                const Text('Work email',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDim)),
                const SizedBox(height: 8),
                _field(controller: _emailController, hint: 'you@yourrestaurant.com', keyboardType: TextInputType.emailAddress),
                const SizedBox(height: 16),
                const Text('Password',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDim)),
                const SizedBox(height: 8),
                _field(controller: _passwordController, hint: '••••••••', obscure: true),
              ] else ...[
                const Text('6-digit code',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDim)),
                const SizedBox(height: 8),
                _field(controller: _codeController, hint: '123456', keyboardType: TextInputType.number),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.cancelled, fontSize: 13, fontWeight: FontWeight.w600)),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 60,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _submitting
                      ? const SizedBox(
                          width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.4))
                      : Text(_needsCode ? 'Verify' : 'Sign in',
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                ),
              ),
              const Spacer(),
              const Text(
                'Trouble signing in? Ask your owner for access on the web dashboard.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: AppColors.textFaint),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String hint,
    bool obscure = false,
    TextInputType? keyboardType,
  }) {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderStrong),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      alignment: Alignment.centerLeft,
      child: TextField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        decoration: InputDecoration(border: InputBorder.none, hintText: hint),
        style: const TextStyle(fontSize: 17),
      ),
    );
  }
}
