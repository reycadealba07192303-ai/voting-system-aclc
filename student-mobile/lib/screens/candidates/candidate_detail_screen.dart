import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/election_service.dart';
import '../../theme/app_colors.dart';

class CandidateDetailScreen extends StatelessWidget {
  final String candidateId;
  const CandidateDetailScreen({super.key, required this.candidateId});

  @override
  Widget build(BuildContext context) {
    final svc = context.read<ElectionService>();
    final candidate = svc.candidates.firstWhere(
      (c) => c['_id'] == candidateId,
      orElse: () => {},
    );

    if (candidate.isEmpty) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('Candidate not found')),
      );
    }

    final pos = candidate['position_id'];
    final posTitle = pos is Map ? pos['title'] as String? ?? '' : '';
    final apiBase = ApiClient.origin;

    return Scaffold(
      backgroundColor: AppColors.white,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            backgroundColor: AppColors.white,
            foregroundColor: AppColors.text,
            flexibleSpace: FlexibleSpaceBar(
              background: candidate['photo_url'] != null
                  ? Image.network(
                      '$apiBase${candidate['photo_url']}',
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const _PhotoPlaceholder(),
                    )
                  : const _PhotoPlaceholder(),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.blueSoft,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      posTitle,
                      style: const TextStyle(
                        color: AppColors.blue,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    candidate['name'] ?? '',
                    style: const TextStyle(
                      color: AppColors.text,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (candidate['partylist'] != null &&
                      (candidate['partylist'] as String).isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.group_rounded,
                            color: AppColors.textMuted, size: 15),
                        const SizedBox(width: 6),
                        Text(
                          candidate['partylist'],
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 28),
                  const Divider(color: AppColors.border, height: 1),
                  const SizedBox(height: 24),
                  if (candidate['platform'] != null &&
                      (candidate['platform'] as String).isNotEmpty)
                    _InfoSection(
                      icon: Icons.campaign_rounded,
                      title: 'Platform',
                      content: candidate['platform'],
                    ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoSection extends StatelessWidget {
  final IconData icon;
  final String title, content;
  const _InfoSection({
    required this.icon,
    required this.title,
    required this.content,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: AppColors.blueSoft,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: AppColors.blue, size: 16),
            ),
            const SizedBox(width: 10),
            Text(
              title,
              style: const TextStyle(
                color: AppColors.text,
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.bg,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Text(
            content,
            style: const TextStyle(
              color: AppColors.text,
              fontSize: 14,
              height: 1.7,
            ),
          ),
        ),
      ],
    );
  }
}

class _PhotoPlaceholder extends StatelessWidget {
  const _PhotoPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.blueSoft,
      child: const Center(
        child: Icon(Icons.person_rounded, color: AppColors.blueMuted, size: 80),
      ),
    );
  }
}
