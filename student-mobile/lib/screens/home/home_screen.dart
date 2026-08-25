import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/election_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/candidate_avatar.dart';
import '../../utils/levels.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  Timer? _syncTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
    _syncTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (!mounted) return;
      context.read<ElectionService>().syncLive(silent: true);
    });
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      context.read<ElectionService>().syncLive(silent: true);
    }
  }

  Future<void> _load() async {
    if (!mounted) return;
    final svc = context.read<ElectionService>();
    await svc.loadActiveElection();
    if (!mounted) return;
    final election = svc.activeElection;
    if (election != null) {
      await svc.loadResults(election['_id'] as String);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final election = context.watch<ElectionService>();
    final student = auth.student;
    final firstName = (student?['name'] ?? '').split(' ').first;
    final initial = firstName.isNotEmpty ? firstName[0].toUpperCase() : 'S';
    final hour = DateTime.now().hour;
    final greeting =
        hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.blue,
          onRefresh: _load,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 18, 22, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$greeting,',
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              firstName.isEmpty ? 'Student' : '$firstName!',
                              style: const TextStyle(
                                color: AppColors.text,
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: AppColors.blueGradient,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.blue.withValues(alpha: 0.28),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            initial,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Compact election strip
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 20, 22, 0),
                  child: election.loading && election.activeElection == null
                      ? const SizedBox(
                          height: 72,
                          child: Center(
                            child: CircularProgressIndicator(
                              color: AppColors.blue,
                              strokeWidth: 2,
                            ),
                          ),
                        )
                      : election.activeElection != null
                          ? _ElectionStrip(
                              election: election.activeElection!,
                              hasVoted: student?['has_voted'] == true,
                              isClosed: election.isElectionClosed,
                            )
                          : _NoElectionCard(
                              studentLevel: student?['level'] as String?,
                            ),
                ),
              ),

              // Live / final standings — primary home content
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 22, 22, 0),
                  child: _LiveStandings(
                    results: election.results,
                    loading: election.resultsLoading,
                    hasElection: election.activeElection != null,
                    isClosed: election.isElectionClosed,
                  ),
                ),
              ),

              // Quick actions
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 22, 22, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: _ActionChip(
                          icon: Icons.people_rounded,
                          label: 'Candidates',
                          color: AppColors.blue,
                          onTap: () => context.go('/candidates'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _ActionChip(
                          icon: Icons.how_to_vote_rounded,
                          label: 'Vote Now',
                          color: AppColors.red,
                          onTap: () => context.go('/voting'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 36)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ElectionStrip extends StatelessWidget {
  final Map<String, dynamic> election;
  final bool hasVoted;
  final bool isClosed;
  const _ElectionStrip({
    required this.election,
    required this.hasVoted,
    this.isClosed = false,
  });

  @override
  Widget build(BuildContext context) {
    final statusLabel = isClosed ? 'ELECTION CLOSED' : 'LIVE ELECTION';
    final statusDot = isClosed ? const Color(0xFF94A3B8) : const Color(0xFF34D399);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppColors.heroGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.blueDark.withValues(alpha: 0.35),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: statusDot,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      statusLabel,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.75),
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  election['title'] ?? 'SSG Election',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          if (isClosed)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
              ),
              child: const Text(
                'Final results',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            )
          else if (hasVoted)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0x2034D399),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0x5034D399)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.check_circle_rounded,
                      color: Color(0xFF34D399), size: 14),
                  SizedBox(width: 4),
                  Text(
                    'Voted',
                    style: TextStyle(
                      color: Color(0xFF34D399),
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            )
          else
            GestureDetector(
              onTap: () => context.go('/voting'),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.red,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  'Vote',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _NoElectionCard extends StatelessWidget {
  final String? studentLevel;
  const _NoElectionCard({this.studentLevel});

  @override
  Widget build(BuildContext context) {
    final hasLevel = studentLevel != null && studentLevel!.isNotEmpty;
    final levelLabel = labelForLevel(studentLevel);
    final subtitle = !hasLevel
        ? 'Ask your admin to set your year level so you can see the right election.'
        : 'No open election for $levelLabel right now. Check back later.';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          const Icon(Icons.hourglass_empty_rounded,
              color: AppColors.textMuted, size: 36),
          const SizedBox(height: 10),
          const Text(
            'No active election',
            style: TextStyle(
              color: AppColors.text,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12, height: 1.4),
          ),
        ],
      ),
    );
  }
}

class _LiveStandings extends StatelessWidget {
  final List<dynamic> results;
  final bool loading;
  final bool hasElection;
  final bool isClosed;

  const _LiveStandings({
    required this.results,
    required this.loading,
    required this.hasElection,
    this.isClosed = false,
  });

  @override
  Widget build(BuildContext context) {
    final title = isClosed ? 'Final Standings' : 'Live Standings';
    final badge = isClosed ? 'FINAL' : 'LIVE';
    final subtitle = isClosed
        ? 'Official results per position — with photos'
        : 'Top leaders per position — with photos';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 3,
              height: 16,
              decoration: BoxDecoration(
                color: AppColors.red,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            if (hasElection)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isClosed ? const Color(0xFFF1F5F9) : AppColors.blueSoft,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  badge,
                  style: TextStyle(
                    color: isClosed ? AppColors.textSecondary : AppColors.blue,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
        ),
        const SizedBox(height: 14),
        if (loading)
          const SizedBox(
            height: 120,
            child: Center(
              child: CircularProgressIndicator(
                color: AppColors.blue,
                strokeWidth: 2,
              ),
            ),
          )
        else if (!hasElection || results.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                const Icon(Icons.bar_chart_rounded,
                    color: AppColors.textMuted, size: 36),
                const SizedBox(height: 10),
                Text(
                  isClosed ? 'No votes were cast' : 'No tallies yet',
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isClosed
                      ? 'This election closed without recorded tallies.'
                      : 'Results will appear once votes start coming in.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                ),
              ],
            ),
          )
        else
          ...results.map((pos) => _PositionChart(position: pos as Map<String, dynamic>)),
      ],
    );
  }
}

class _PositionChart extends StatelessWidget {
  final Map<String, dynamic> position;
  const _PositionChart({required this.position});

  @override
  Widget build(BuildContext context) {
    final candidates = (position['candidates'] as List<dynamic>? ?? []);
    if (candidates.isEmpty) return const SizedBox.shrink();

    final maxVotes = candidates
        .map((c) => (c['votes'] as num?)?.toInt() ?? 0)
        .fold<int>(0, (a, b) => a > b ? a : b);
    final totalVotes = candidates.fold<int>(
        0, (sum, c) => sum + ((c['votes'] as num?)?.toInt() ?? 0));

    // Show top 3 leaders overview with photos
    final shown = candidates.take(3).toList();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  position['title'] ?? '',
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                '$totalVotes votes',
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...shown.asMap().entries.map((entry) {
            final i = entry.key;
            final c = entry.value as Map<String, dynamic>;
            final votes = (c['votes'] as num?)?.toInt() ?? 0;
            final ratio = maxVotes > 0 ? votes / maxVotes : 0.0;
            final isLead = i == 0 && votes > 0;
            final barColor = isLead ? AppColors.red : AppColors.blue;
            final name = c['name'] as String? ?? '';

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CandidateAvatar(
                        photoUrl: c['photo_url'] as String?,
                        name: name,
                        size: 42,
                        isLead: isLead,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                if (isLead) ...[
                                  const Icon(Icons.emoji_events_rounded,
                                      color: AppColors.red, size: 14),
                                  const SizedBox(width: 4),
                                ],
                                Expanded(
                                  child: Text(
                                    name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: isLead
                                          ? AppColors.redDark
                                          : AppColors.text,
                                      fontSize: 13,
                                      fontWeight: isLead
                                          ? FontWeight.w800
                                          : FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (c['partylist'] != null &&
                                (c['partylist'] as String).isNotEmpty)
                              Text(
                                c['partylist'],
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 10,
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '$votes',
                        style: TextStyle(
                          color: barColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: SizedBox(
                      height: 8,
                      child: Stack(
                        children: [
                          Container(color: const Color(0xFFF1F5F9)),
                          FractionallySizedBox(
                            widthFactor: ratio.clamp(0.0, 1.0),
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: isLead
                                      ? [
                                          AppColors.red,
                                          AppColors.red.withValues(alpha: 0.75),
                                        ]
                                      : [
                                          AppColors.blue,
                                          AppColors.blueMuted,
                                        ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
          if (candidates.length > 3)
            Text(
              '+${candidates.length - 3} more on Vote tab',
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
        ],
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
