import 'package:flutter/material.dart';

/// Philippine civic palette — blue, white, red.
class AppColors {
  AppColors._();

  static const blue = Color(0xFF2333B4);
  static const blueDark = Color(0xFF1D248F);
  static const blueDeep = Color(0xFF161D73);
  static const blueSoft = Color(0xFFDBEAFE);
  static const blueMuted = Color(0xFF93C5FD);

  static const red = Color(0xFFFF4B3A);
  static const redSoft = Color(0xFFFEE2E2);
  static const redDark = Color(0xFF991B1B);

  static const white = Color(0xFFFFFFFF);
  static const bg = Color(0xFFF5F8FC);
  static const surface = Color(0xFFFFFFFF);
  static const border = Color(0xFFE2E8F0);

  static const text = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF64748B);
  static const textMuted = Color(0xFF94A3B8);

  static const success = Color(0xFF059669);
  static const successSoft = Color(0xFFD1FAE5);
  static const warning = Color(0xFFD97706);
  static const warningSoft = Color(0xFFFFFBEB);

  static const blueGradient = LinearGradient(
    colors: [blueDark, blue],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const heroGradient = LinearGradient(
    colors: [blueDeep, blueDark, Color(0xFF1E40AF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Alternating bar accents for standings (blue / red).
  static Color barColor(int index) => index % 2 == 0 ? blue : red;
}
