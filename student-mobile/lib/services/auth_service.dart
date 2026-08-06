import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class AuthService extends ChangeNotifier {
  static const _tokenKey = 'student_token';
  static const _secure = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  String? _token;
  Map<String, dynamic>? _student;

  bool get isLoggedIn => _token != null;
  Map<String, dynamic>? get student => _student;
  String? get token => _token;

  Future<void> loadToken() async {
    // Prefer secure storage; migrate legacy SharedPreferences token once.
    _token = await _secure.read(key: _tokenKey);
    final prefs = await SharedPreferences.getInstance();
    if (_token == null || _token!.isEmpty) {
      final legacy = prefs.getString(_tokenKey);
      if (legacy != null && legacy.isNotEmpty) {
        _token = legacy;
        await _secure.write(key: _tokenKey, value: legacy);
        await prefs.remove(_tokenKey);
      }
    }

    final name = prefs.getString('student_name');
    final id = prefs.getString('student_id');
    final sec = prefs.getString('student_section');
    final level = prefs.getString('student_level');
    final voted = prefs.getBool('student_has_voted') ?? false;
    if (_token != null && name != null) {
      _student = {
        'name': name,
        'student_id': id,
        'section': sec,
        'level': level,
        'has_voted': voted,
      };
    }
  }

  /// Check if student ID exists and whether they already have a password.
  Future<Map<String, dynamic>> lookupStudent(String studentId) async {
    final res = await ApiClient.post(
      '/auth/student/lookup',
      {'student_id': studentId},
      auth: false,
    );
    return Map<String, dynamic>.from(res as Map);
  }

  Future<void> login(String studentId, String password) async {
    final res = await ApiClient.post(
      '/auth/student/login',
      {'student_id': studentId, 'password': password},
      auth: false,
    );
    _token = res['token'] as String;
    _student = Map<String, dynamic>.from(res['student'] as Map);

    await _secure.write(key: _tokenKey, value: _token!);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await _saveStudent(prefs);
    notifyListeners();
  }

  /// First-time password creation (no current password required).
  Future<void> createPassword(String studentId, String newPassword) async {
    final res = await ApiClient.post(
      '/auth/student/set-password',
      {'student_id': studentId, 'new_password': newPassword},
      auth: false,
    );
    _token = res['token'] as String;
    _student = Map<String, dynamic>.from(res['student'] as Map);

    await _secure.write(key: _tokenKey, value: _token!);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await _saveStudent(prefs);
    notifyListeners();
  }

  Future<void> _saveStudent(SharedPreferences prefs) async {
    // Non-secret profile fields only — JWT stays in secure storage.
    await prefs.setString('student_name', _student!['name'] as String);
    await prefs.setString('student_id', _student!['student_id'] as String);
    await prefs.setString(
        'student_section', (_student!['section'] as String?) ?? '');
    final level = (_student!['level'] as String?) ?? '';
    if (level.isEmpty) {
      await prefs.remove('student_level');
    } else {
      await prefs.setString('student_level', level);
    }
    await prefs.setBool(
        'student_has_voted', (_student!['has_voted'] as bool?) ?? false);
  }

  Future<void> logout() async {
    _token = null;
    _student = null;
    await _secure.delete(key: _tokenKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }

  void markVoted() {
    if (_student != null) {
      _student = {..._student!, 'has_voted': true};
      notifyListeners();
      SharedPreferences.getInstance().then((prefs) {
        prefs.setBool('student_has_voted', true);
      });
    }
  }
}
