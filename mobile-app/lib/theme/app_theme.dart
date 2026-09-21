import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens shared across the ops app — mirrors the light-theme
/// palette from the Instant Catalog Ops design.
class AppColors {
  AppColors._();

  static const bg = Color(0xFFF4F5F7);
  static const surface = Color(0xFFFFFFFF);
  static const surface2 = Color(0xFFF0F1F3);
  static const surface3 = Color(0xFFE4E6E9);
  static const border = Color(0xFFE4E6E9);
  static const borderStrong = Color(0xFFCBD0D6);

  static const text = Color(0xFF12151A);
  static const textDim = Color(0xFF5B6470);
  static const textFaint = Color(0xFF8B94A0);

  static const newOrder = Color(0xFFEA580C);
  static const newOrderBg = Color(0xFFFFEDE0);
  static const preparing = Color(0xFF2563EB);
  static const preparingBg = Color(0xFFE7EEFF);
  static const ready = Color(0xFF16A34A);
  static const readyBg = Color(0xFFE7F8EC);
  static const done = Color(0xFF6B7280);
  static const doneBg = Color(0xFFEEF0F2);
  static const cancelled = Color(0xFFDC2626);
  static const cancelledBg = Color(0xFFFDEAEA);
  static const request = Color(0xFFC026D3);
  static const requestBg = Color(0xFFFCE9FC);

  static const live = ready;
  static const offline = cancelled;
  static const primary = ready;
}

class AppTheme {
  AppTheme._();

  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.bg,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.light,
        primary: AppColors.primary,
        surface: AppColors.surface,
      ),
      fontFamily: GoogleFonts.spaceGrotesk().fontFamily,
    );
    return base.copyWith(
      textTheme: GoogleFonts.spaceGroteskTextTheme(base.textTheme).apply(
        bodyColor: AppColors.text,
        displayColor: AppColors.text,
      ),
      dividerColor: AppColors.border,
      splashFactory: InkRipple.splashFactory,
    );
  }
}
