import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../theme/app_colors.dart';

class MediaUrls {
  static String get origin =>
      ApiClient.baseUrl.replaceFirst(RegExp(r'/api/?$'), '');

  static String? absolute(String? path) {
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http')) return path;
    return '$origin$path';
  }
}

class CandidateAvatar extends StatelessWidget {
  final String? photoUrl;
  final String name;
  final double size;
  final bool isLead;

  const CandidateAvatar({
    super.key,
    required this.photoUrl,
    required this.name,
    this.size = 40,
    this.isLead = false,
  });

  @override
  Widget build(BuildContext context) {
    final url = MediaUrls.absolute(photoUrl);
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: isLead ? AppColors.red : AppColors.blueSoft,
          width: isLead ? 2 : 1.5,
        ),
        boxShadow: isLead
            ? [
                BoxShadow(
                  color: AppColors.red.withValues(alpha: 0.25),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: ClipOval(
        child: url != null
            ? Image.network(
                url,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _fallback(initial),
              )
            : _fallback(initial),
      ),
    );
  }

  Widget _fallback(String initial) {
    return Container(
      color: isLead ? AppColors.redSoft : AppColors.blueSoft,
      alignment: Alignment.center,
      child: Text(
        initial,
        style: TextStyle(
          color: isLead ? AppColors.red : AppColors.blue,
          fontWeight: FontWeight.w800,
          fontSize: size * 0.38,
        ),
      ),
    );
  }
}
