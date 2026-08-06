import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/election_service.dart';
import '../../theme/app_colors.dart';

class CandidatesScreen extends StatefulWidget {
  const CandidatesScreen({super.key});
  @override
  State<CandidatesScreen> createState() => _CandidatesScreenState();
}

class _CandidatesScreenState extends State<CandidatesScreen> {
  // 'teams' | 'list'
  String _view = 'teams';
  String? _selectedTeam;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final svc = context.read<ElectionService>();
      await svc.loadActiveElection();
      if (!mounted) return;
      if (svc.activeElection != null) {
        await svc.loadCandidates(svc.activeElection!['_id']);
      }
    });
  }

  List<dynamic> get _candidates {
    final svc = context.read<ElectionService>();
    return svc.candidates;
  }

  List<String> get _teams {
    final seen = <String>{};
    for (final c in _candidates) {
      seen.add((c['partylist'] as String?)?.trim().isNotEmpty == true
          ? c['partylist'] as String
          : 'Independent');
    }
    return seen.toList()..sort();
  }

  List<dynamic> get _candidatesForTeam {
    return _candidates.where((c) {
      final team = (c['partylist'] as String?)?.trim().isNotEmpty == true
          ? c['partylist'] as String
          : 'Independent';
      return team == _selectedTeam;
    }).toList();
  }

  int _countForTeam(String team) {
    return _candidates.where((c) {
      final t = (c['partylist'] as String?)?.trim().isNotEmpty == true
          ? c['partylist'] as String
          : 'Independent';
      return t == team;
    }).length;
  }

  static const _teamColors = [
    AppColors.blue,
    AppColors.red,
    AppColors.blueDark,
    Color(0xFF1E40AF),
    Color(0xFFB91C1C),
    Color(0xFF2563EB),
  ];

  @override
  Widget build(BuildContext context) {
    final svc = context.watch<ElectionService>();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: _view != 'teams'
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_rounded,
                    size: 18, color: AppColors.text),
                onPressed: () {
                  setState(() {
                    _view = 'teams';
                    _selectedTeam = null;
                  });
                },
              )
            : null,
        title: Text(
          _view == 'teams' ? 'Candidates' : (_selectedTeam ?? 'Team'),
          style: const TextStyle(
            color: AppColors.text,
            fontWeight: FontWeight.w800,
            fontSize: 17,
          ),
        ),
      ),
      body: svc.loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.blue))
          : _view == 'teams'
              ? _TeamsView(
                  teams: _teams,
                  colors: _teamColors,
                  countFor: _countForTeam,
                  onTap: (team) => setState(() {
                    _selectedTeam = team;
                    _view = 'list';
                  }),
                )
              : _CandidateListView(
                  candidates: _candidatesForTeam,
                  teamName: _selectedTeam ?? '',
                  onTap: (id) => context.push('/candidates/$id'),
                ),
    );
  }
}

class _TeamsView extends StatelessWidget {
  final List<String> teams;
  final List<Color> colors;
  final int Function(String) countFor;
  final void Function(String) onTap;

  const _TeamsView({
    required this.teams,
    required this.colors,
    required this.countFor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (teams.isEmpty) {
      return const Center(
        child: Text('No teams yet.',
            style: TextStyle(color: AppColors.textMuted)),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        const Text(
          'Browse by team',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
          ),
        ),
        const SizedBox(height: 12),
        ...teams.asMap().entries.map((entry) {
          final i = entry.key;
          final team = entry.value;
          final color = colors[i % colors.length];
          final count = countFor(team);

          return GestureDetector(
            onTap: () => onTap(team),
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
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
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Center(
                      child: Text(
                        team.isNotEmpty ? team[0].toUpperCase() : 'T',
                        style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.w800,
                          fontSize: 20,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          team,
                          style: const TextStyle(
                            color: AppColors.text,
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '$count candidate${count == 1 ? '' : 's'}',
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.blueSoft,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Team',
                      style: TextStyle(
                        color: AppColors.blue,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(Icons.chevron_right_rounded,
                      color: AppColors.textMuted),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}

class _CandidateListView extends StatelessWidget {
  final List<dynamic> candidates;
  final String teamName;
  final void Function(String) onTap;

  const _CandidateListView({
    required this.candidates,
    required this.teamName,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (candidates.isEmpty) {
      return const Center(
        child:
            Text('No candidates.', style: TextStyle(color: AppColors.textMuted)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: candidates.length,
      itemBuilder: (_, i) {
        final c = candidates[i];
        final pos = c['position_id'];
        final posTitle = pos is Map ? pos['title'] as String? ?? '' : '';
        final apiBase = ApiClient.origin;

        return GestureDetector(
          onTap: () => onTap(c['_id'] as String),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                  ),
                  child: c['photo_url'] != null
                      ? Image.network(
                          '$apiBase${c['photo_url']}',
                          width: 80,
                          height: 90,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _placeholder(),
                        )
                      : _placeholder(),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          c['name'] ?? '',
                          style: const TextStyle(
                            color: AppColors.text,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          posTitle,
                          style: const TextStyle(
                            color: AppColors.blue,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (c['platform'] != null &&
                            (c['platform'] as String).isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            c['platform'],
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 11,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.only(right: 12),
                  child: Icon(Icons.chevron_right_rounded,
                      color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _placeholder() => Container(
        width: 80,
        height: 90,
        color: AppColors.blueSoft,
        child: const Icon(Icons.person_rounded,
            color: AppColors.blueMuted, size: 32),
      );
}
