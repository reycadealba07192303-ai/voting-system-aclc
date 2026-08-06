import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/election_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/candidate_avatar.dart';
import '../../utils/levels.dart';

class VotingScreen extends StatefulWidget {
  const VotingScreen({super.key});
  @override
  State<VotingScreen> createState() => _VotingScreenState();
}

class _VotingScreenState extends State<VotingScreen> {
  /// positionId -> candidateId (one pick per position; optional)
  final Map<String, String> _selections = {};
  bool _submitting = false;
  Map<String, dynamic>? _voteStatus;
  bool _loadingVotes = false;
  int _pageIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    if (!mounted) return;
    final svc = context.read<ElectionService>();
    final auth = context.read<AuthService>();
    await svc.loadActiveElection();
    if (!mounted) return;
    final election = svc.activeElection;
    if (election == null) return;

    final electionId = election['_id'] as String;
    final hasVoted = auth.student?['has_voted'] == true;

    if (hasVoted) {
      setState(() => _loadingVotes = true);
      try {
        final status = await svc.getVoteStatus(electionId);
        if (mounted) setState(() => _voteStatus = status);
      } catch (_) {}
      if (mounted) setState(() => _loadingVotes = false);
    } else {
      await svc.loadBallot(electionId);
      if (mounted &&
          svc.ballot.isNotEmpty &&
          svc.ballot.every((p) =>
              (p['candidates'] as List?) == null ||
              (p['candidates'] as List).isEmpty)) {
        await svc.loadCandidates(electionId);
      }
    }
  }

  List<dynamic> _candidatesFor(Map<String, dynamic> position) {
    final nested = position['candidates'];
    if (nested is List && nested.isNotEmpty) return nested;

    final posId = position['_id']?.toString();
    final all = context.read<ElectionService>().candidates;
    return all.where((c) {
      final pos = c['position_id'];
      if (pos is Map) return pos['_id']?.toString() == posId;
      return pos?.toString() == posId;
    }).toList();
  }

  void _select(String posId, String candId) {
    setState(() {
      // Tap again to clear — skip this position
      if (_selections[posId] == candId) {
        _selections.remove(posId);
      } else {
        _selections[posId] = candId; // one only
      }
    });
  }

  void _review() {
    if (_selections.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: const Text('Select at least one candidate to submit.'),
        backgroundColor: AppColors.red,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ));
      return;
    }
    _showReviewSheet();
  }

  void _showReviewSheet() {
    final ballot = context.read<ElectionService>().ballot;
    final skipped = ballot
        .where((pos) => !_selections.containsKey(pos['_id'].toString()))
        .toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        minChildSize: 0.45,
        expand: false,
        builder: (_, scroll) => Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 4),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Review your votes',
                  style: TextStyle(
                    color: AppColors.text,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            const Divider(height: 1, color: AppColors.border),
            Expanded(
              child: ListView(
                controller: scroll,
                padding: const EdgeInsets.all(20),
                children: [
                  ...ballot
                      .where((pos) =>
                          _selections.containsKey(pos['_id'].toString()))
                      .map((pos) {
                    final posId = pos['_id'].toString();
                    final candId = _selections[posId]!;
                    final cands =
                        _candidatesFor(pos as Map<String, dynamic>);
                    final cand = cands.firstWhere(
                      (c) => c['_id'].toString() == candId,
                      orElse: () => {'name': 'Unknown'},
                    );
                    return _ReceiptRow(
                      position: pos['title'] ?? '',
                      candidate: cand['name'] ?? '',
                      partylist: cand['partylist'] as String?,
                    );
                  }),
                  if (skipped.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Skipped (${skipped.length})',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...skipped.map((pos) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Text(
                            '• ${pos['title']} — no vote',
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 12,
                            ),
                          ),
                        )),
                  ],
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.warningSoft,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: const Row(children: [
                      Icon(Icons.info_outline_rounded,
                          color: AppColors.warning, size: 16),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Your vote is final and cannot be changed after submission.',
                          style: TextStyle(
                            color: Color(0xFF92400E),
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ]),
                  ),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(
                  20, 8, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
              child: Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.border),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Go Back'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _submitting
                        ? null
                        : () {
                            Navigator.pop(ctx);
                            _submit();
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Submit Vote',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final svc = context.read<ElectionService>();
    final authSvc = context.read<AuthService>();
    try {
      final electionId = svc.activeElection!['_id'];
      final votes = _selections.entries
          .map((e) => {'position_id': e.key, 'candidate_id': e.value})
          .toList();
      await svc.submitVote(electionId, votes);
      authSvc.markVoted();
      if (mounted) context.go('/confirmation');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString()),
          backgroundColor: AppColors.red,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final svc = context.watch<ElectionService>();
    final auth = context.watch<AuthService>();
    final ballot = svc.ballot;
    final hasVoted = auth.student?['has_voted'] == true;

    // ── RECEIPT (after voting) ──
    if (hasVoted) {
      return _VoteReceiptView(
        loading: _loadingVotes,
        voteStatus: _voteStatus,
        electionTitle: svc.activeElection?['title'] as String?,
        electionId: svc.activeElection?['_id']?.toString(),
      );
    }

    if (svc.activeElection == null && !svc.loading) {
      final level = context.read<AuthService>().student?['level'] as String?;
      final hasLevel = level != null && level.isNotEmpty;
      final message = !hasLevel
          ? 'No election for you yet.\nAsk your admin to set your year level.'
          : 'No open election for ${labelForLevel(level)}.\nCheck back when voting opens for your level.';
      return Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(
          backgroundColor: AppColors.bg,
          title: const Text('Vote'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textMuted,
                height: 1.45,
              ),
            ),
          ),
        ),
      );
    }

    if (svc.loading && ballot.isEmpty) {
      return const Scaffold(
        backgroundColor: AppColors.bg,
        body: Center(child: CircularProgressIndicator(color: AppColors.blue)),
      );
    }

    if (ballot.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(
          backgroundColor: AppColors.bg,
          title: const Text('Vote'),
        ),
        body: const Center(
          child: Text(
            'Ballot not ready yet.',
            style: TextStyle(color: AppColors.textMuted),
          ),
        ),
      );
    }

    // Clamp page index
    final index = _pageIndex.clamp(0, ballot.length - 1);
    final pos = ballot[index] as Map<String, dynamic>;
    final posId = pos['_id'].toString();
    final cands = _candidatesFor(pos);
    final selectedId = _selections[posId];
    final isLast = index == ballot.length - 1;

    // ── VOTING UI (separate from receipt) ──
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        title: const Text('Cast Your Vote'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Position ${index + 1} of ${ballot.length}',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${_selections.length} voted · ${ballot.length - _selections.length} skipped',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: (index + 1) / ballot.length,
                    backgroundColor: AppColors.border,
                    color: AppColors.blue,
                    minHeight: 5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              children: [
                Text(
                  pos['title'] ?? '',
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Choose one candidate, or skip this position.',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 18),
                if (cands.isEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 36),
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.person_off_outlined,
                            color: AppColors.textMuted, size: 36),
                        SizedBox(height: 10),
                        Text(
                          'No candidates for this position',
                          style: TextStyle(
                            color: AppColors.text,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'You can skip and continue.',
                          style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  ...cands.map((c) {
                    final id = c['_id'].toString();
                    final selected = selectedId == id;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _VoteOption(
                        name: c['name'] ?? '',
                        partylist: c['partylist'] as String?,
                        selected: selected,
                        onTap: () => _select(posId, id),
                      ),
                    );
                  }),
                if (selectedId != null) ...[
                  const SizedBox(height: 4),
                  TextButton(
                    onPressed: () => setState(() => _selections.remove(posId)),
                    child: const Text(
                      'Clear selection (skip this position)',
                      style: TextStyle(
                        color: AppColors.red,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            color: AppColors.bg,
            child: Row(
              children: [
                if (index > 0)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() => _pageIndex = index - 1),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.text,
                        backgroundColor: AppColors.white,
                        side: const BorderSide(color: AppColors.border),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Back'),
                    ),
                  ),
                if (index > 0) const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: () {
                      if (isLast) {
                        _review();
                      } else {
                        setState(() => _pageIndex = index + 1);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          isLast ? AppColors.red : AppColors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      isLast ? 'Review & Submit' : 'Next',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _VoteOption extends StatelessWidget {
  final String name;
  final String? partylist;
  final bool selected;
  final VoidCallback onTap;

  const _VoteOption({
    required this.name,
    required this.partylist,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? AppColors.blueSoft : AppColors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppColors.blue : AppColors.border,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? AppColors.blue : Colors.transparent,
                border: Border.all(
                  color: selected ? AppColors.blue : AppColors.textMuted,
                  width: 2,
                ),
              ),
              child: selected
                  ? const Icon(Icons.check_rounded,
                      color: Colors.white, size: 13)
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      color: selected ? AppColors.blueDark : AppColors.text,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (partylist != null && partylist!.isNotEmpty)
                    Text(
                      partylist!,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Post-vote: polished receipt card → opens full "Your Votes" UI on tap.
class _VoteReceiptView extends StatefulWidget {
  final bool loading;
  final Map<String, dynamic>? voteStatus;
  final String? electionTitle;
  final String? electionId;

  const _VoteReceiptView({
    required this.loading,
    required this.voteStatus,
    this.electionTitle,
    this.electionId,
  });

  @override
  State<_VoteReceiptView> createState() => _VoteReceiptViewState();
}

class _VoteReceiptViewState extends State<_VoteReceiptView>
    with WidgetsBindingObserver {
  Timer? _syncTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final id = widget.electionId;
      if (id != null && mounted) {
        context.read<ElectionService>().loadResults(id);
      }
    });
    _syncTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      final id = widget.electionId;
      if (!mounted || id == null) return;
      context.read<ElectionService>().loadResults(id, silent: true);
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
    final id = widget.electionId;
    if (state == AppLifecycleState.resumed && mounted && id != null) {
      context.read<ElectionService>().loadResults(id, silent: true);
    }
  }

  List<Map<String, dynamic>> get _voteRows {
    final votes = (widget.voteStatus?['votes'] as List?) ?? [];
    return votes.map((v) {
      final pos = v['position_id'];
      final cand = v['candidate_id'];
      return {
        'position': pos is Map ? (pos['title'] ?? '—') : '—',
        'candidate': cand is Map ? (cand['name'] ?? '—') : '—',
        'partylist': cand is Map ? cand['partylist'] as String? : null,
        'photo_url': cand is Map ? cand['photo_url'] as String? : null,
      };
    }).toList();
  }

  void _openMyVotes() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _MyVotesScreen(
          electionTitle: widget.electionTitle ?? 'SSG Election',
          votes: _voteRows,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final votes = _voteRows;
    final election = context.watch<ElectionService>();
    final results = election.results;
    final myCandidateIds = ((widget.voteStatus?['votes'] as List?) ?? [])
        .map((v) {
          final c = v['candidate_id'];
          if (c is Map) return c['_id']?.toString();
          return c?.toString();
        })
        .whereType<String>()
        .toSet();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        title: const Text('Vote Receipt'),
      ),
      body: widget.loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.blue))
          : RefreshIndicator(
              color: AppColors.blue,
              onRefresh: () async {
                final id = widget.electionId;
                if (id != null) {
                  await context.read<ElectionService>().loadResults(id);
                }
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                children: [
                  // ── Clickable receipt summary ──
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: _openMyVotes,
                      borderRadius: BorderRadius.circular(22),
                      child: Ink(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(22),
                          gradient: AppColors.heroGradient,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.blue.withValues(alpha: 0.28),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 20, 20, 22),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: const Color(0x2534D399),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                          color: const Color(0x5534D399)),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.receipt_long_rounded,
                                          color: Color(0xFF34D399),
                                          size: 14,
                                        ),
                                        SizedBox(width: 6),
                                        Text(
                                          'RECEIPT',
                                          style: TextStyle(
                                            color: Color(0xFF34D399),
                                            fontSize: 10,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 0.7,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Spacer(),
                                  Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(
                                      Icons.arrow_forward_ios_rounded,
                                      color: Colors.white,
                                      size: 14,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 18),
                              Text(
                                widget.electionTitle ?? 'SSG Election',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  height: 1.2,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                votes.isEmpty
                                    ? 'No vote details found'
                                    : 'You voted for ${votes.length} position${votes.length == 1 ? '' : 's'}',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.8),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.18),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.touch_app_rounded,
                                      color:
                                          Colors.white.withValues(alpha: 0.9),
                                      size: 18,
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        'Tap to see everyone you voted for',
                                        style: TextStyle(
                                          color: Colors.white
                                              .withValues(alpha: 0.92),
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 28),

                  const Text(
                    'LIVE TALLIES',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'All candidates and vote counts',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (election.resultsLoading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Center(
                        child: CircularProgressIndicator(
                          color: AppColors.blue,
                          strokeWidth: 2,
                        ),
                      ),
                    )
                  else if (results.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 36),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Center(
                        child: Text(
                          'No tallies yet.',
                          style: TextStyle(color: AppColors.textMuted),
                        ),
                      ),
                    )
                  else
                    ...results.map((pos) => _TallyPositionCard(
                          position: pos as Map<String, dynamic>,
                          myCandidateIds: myCandidateIds,
                        )),
                ],
              ),
            ),
    );
  }
}

/// Full-screen list of everyone the student voted for.
class _MyVotesScreen extends StatelessWidget {
  final String electionTitle;
  final List<Map<String, dynamic>> votes;

  const _MyVotesScreen({
    required this.electionTitle,
    required this.votes,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        title: const Text('Your Votes'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: AppColors.heroGradient,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.blue.withValues(alpha: 0.22),
                  blurRadius: 16,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0x2534D399),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0x5534D399)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded,
                          color: Color(0xFF34D399), size: 14),
                      SizedBox(width: 6),
                      Text(
                        'SUBMITTED',
                        style: TextStyle(
                          color: Color(0xFF34D399),
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.7,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  electionTitle,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  votes.isEmpty
                      ? 'No votes on this receipt'
                      : '${votes.length} candidate${votes.length == 1 ? '' : 's'} you voted for',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.78),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          const Text(
            'YOUR BALLOT',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 12),
          if (votes.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 40),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: const Center(
                child: Text(
                  'No vote details found.',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ),
            )
          else
            ...votes.map((v) => _VotedCandidateCard(
                  position: v['position'] as String,
                  candidate: v['candidate'] as String,
                  partylist: v['partylist'] as String?,
                  photoUrl: v['photo_url'] as String?,
                )),
        ],
      ),
    );
  }
}

class _VotedCandidateCard extends StatelessWidget {
  final String position;
  final String candidate;
  final String? partylist;
  final String? photoUrl;

  const _VotedCandidateCard({
    required this.position,
    required this.candidate,
    this.partylist,
    this.photoUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(18),
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
          CandidateAvatar(
            photoUrl: photoUrl,
            name: candidate,
            size: 52,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  position.toUpperCase(),
                  style: const TextStyle(
                    color: AppColors.blue,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  candidate,
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    height: 1.2,
                  ),
                ),
                if (partylist != null && partylist!.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    partylist!,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: AppColors.successSoft,
              borderRadius: BorderRadius.circular(11),
            ),
            child: const Icon(
              Icons.check_rounded,
              color: AppColors.success,
              size: 18,
            ),
          ),
        ],
      ),
    );
  }
}

class _TallyPositionCard extends StatelessWidget {
  final Map<String, dynamic> position;
  final Set<String> myCandidateIds;

  const _TallyPositionCard({
    required this.position,
    this.myCandidateIds = const {},
  });

  @override
  Widget build(BuildContext context) {
    final candidates = (position['candidates'] as List<dynamic>? ?? []);
    if (candidates.isEmpty) return const SizedBox.shrink();

    final maxVotes = candidates
        .map((c) => (c['votes'] as num?)?.toInt() ?? 0)
        .fold<int>(0, (a, b) => a > b ? a : b);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            position['title'] ?? '',
            style: const TextStyle(
              color: AppColors.text,
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          ...candidates.asMap().entries.map((entry) {
            final i = entry.key;
            final c = entry.value as Map<String, dynamic>;
            final votes = (c['votes'] as num?)?.toInt() ?? 0;
            final ratio = maxVotes > 0 ? votes / maxVotes : 0.0;
            final isLead = i == 0 && votes > 0;
            final name = c['name'] as String? ?? '';
            final id = c['_id']?.toString() ?? '';
            final isMine = id.isNotEmpty && myCandidateIds.contains(id);

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                children: [
                  Row(
                    children: [
                      CandidateAvatar(
                        photoUrl: c['photo_url'] as String?,
                        name: name,
                        size: 44,
                        isLead: isLead,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: isLead
                                          ? AppColors.redDark
                                          : AppColors.text,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                if (isMine) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.successSoft,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'YOU',
                                      style: TextStyle(
                                        color: AppColors.success,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            if (c['partylist'] != null &&
                                (c['partylist'] as String).isNotEmpty)
                              Text(
                                c['partylist'],
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 11,
                                ),
                              ),
                          ],
                        ),
                      ),
                      Text(
                        '$votes',
                        style: TextStyle(
                          color: isLead ? AppColors.red : AppColors.blue,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: ratio.clamp(0.0, 1.0),
                      minHeight: 6,
                      backgroundColor: const Color(0xFFF1F5F9),
                      color: isLead ? AppColors.red : AppColors.blue,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _ReceiptRow extends StatelessWidget {
  final String position;
  final String candidate;
  final String? partylist;
  final bool compact;

  const _ReceiptRow({
    required this.position,
    required this.candidate,
    this.partylist,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: EdgeInsets.only(bottom: compact ? 8 : 10),
      padding: EdgeInsets.all(compact ? 12 : 14),
      decoration: BoxDecoration(
        color: compact ? AppColors.bg : AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.successSoft,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.check_rounded,
                color: AppColors.success, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  position,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  candidate,
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (partylist != null && partylist!.isNotEmpty)
                  Text(
                    partylist!,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

