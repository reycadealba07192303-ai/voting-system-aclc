import 'package:flutter/material.dart';
import 'api_client.dart';

class ElectionService extends ChangeNotifier {
  Map<String, dynamic>? _activeElection;
  List<dynamic> _ballot     = [];
  List<dynamic> _candidates = [];
  List<dynamic> _sections   = [];
  List<dynamic> _results    = [];
  bool _loading = false;
  bool _resultsLoading = false;

  Map<String, dynamic>? get activeElection => _activeElection;
  List<dynamic> get ballot     => _ballot;
  List<dynamic> get candidates => _candidates;
  List<dynamic> get sections   => _sections;
  List<dynamic> get results    => _results;
  bool get loading             => _loading;
  bool get resultsLoading      => _resultsLoading;

  Future<void> loadActiveElection() async {
    _loading = true;
    // Schedule the notify after the current frame to avoid setState-during-build
    Future.microtask(notifyListeners);
    try {
      _activeElection = await ApiClient.get('/mobile/election/active');
    } catch (_) { _activeElection = null; }
    _loading = false;
    notifyListeners();
  }

  Future<void> loadBallot(String electionId) async {
    _loading = true;
    Future.microtask(notifyListeners);
    try {
      final res = await ApiClient.get('/mobile/election/$electionId/ballot');
      _ballot = res as List<dynamic>;
    } catch (_) { _ballot = []; }
    _loading = false;
    notifyListeners();
  }

  Future<void> loadCandidates(String electionId) async {
    _loading = true;
    Future.microtask(notifyListeners);
    try {
      final res = await ApiClient.get('/mobile/election/$electionId/candidates');
      _candidates = res as List<dynamic>;
    } catch (_) { _candidates = []; }
    _loading = false;
    notifyListeners();
  }

  Future<void> loadSections() async {
    try {
      final res = await ApiClient.get('/mobile/sections');
      _sections = res as List<dynamic>;
      notifyListeners();
    } catch (_) { _sections = []; }
  }

  Future<List<dynamic>> loadStudentsInSection(String section) async {
    final res = await ApiClient.get('/mobile/sections/${Uri.encodeComponent(section)}/students');
    return res as List<dynamic>;
  }

  Future<Map<String, dynamic>> submitVote(
      String electionId, List<Map<String, dynamic>> votes) async {
    final res = await ApiClient.post('/votes', {
      'election_id': electionId,
      'votes': votes,
    });
    return res as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getVoteStatus(String electionId) async {
    final res = await ApiClient.get('/mobile/vote-status/$electionId');
    return res as Map<String, dynamic>;
  }

  Future<void> loadResults(String electionId, {bool silent = false}) async {
    if (!silent) {
      _resultsLoading = true;
      Future.microtask(notifyListeners);
    }
    try {
      final res = await ApiClient.get('/mobile/election/$electionId/results');
      _results = res as List<dynamic>;
    } catch (_) {
      if (!silent) _results = [];
    }
    if (!silent) _resultsLoading = false;
    notifyListeners();
  }

  /// Refresh active election + results without full-screen loaders.
  Future<void> syncLive({bool silent = true}) async {
    try {
      final active = await ApiClient.get('/mobile/election/active');
      _activeElection = active as Map<String, dynamic>?;
    } catch (_) {
      // keep previous
    }
    final id = _activeElection?['_id']?.toString();
    if (id != null) {
      await loadResults(id, silent: silent);
    } else {
      notifyListeners();
    }
  }
}
