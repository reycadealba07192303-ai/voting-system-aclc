import 'dart:convert';
import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  // Override at build time: --dart-define=API_BASE_URL=https://api.example.com/api
  // Physical device: use your PC LAN IP (same Wi‑Fi). Emulator: http://10.0.2.2:5000/api
  static const String _configuredBaseUrl = String.fromEnvironment('API_BASE_URL');

  /// Web builds talk to the backend on the same host that served the page, so
  /// the portal keeps working on localhost and over the LAN without a rebuild.
  static String _defaultBaseUrl() {
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host.isNotEmpty) return 'http://$host:5000/api';
      return 'http://localhost:5000/api';
    }
    return 'http://192.168.50.231:5000/api';
  }

  static final String baseUrl =
      _configuredBaseUrl.isNotEmpty ? _configuredBaseUrl : _defaultBaseUrl();
  static const Duration _timeout = Duration(seconds: 15);

  /// Origin without trailing `/api` — for photo URLs under `/uploads`.
  static String get origin {
    final u = baseUrl;
    if (u.endsWith('/api/')) return u.substring(0, u.length - 5);
    if (u.endsWith('/api')) return u.substring(0, u.length - 4);
    return u;
  }

  static const _tokenKey = 'student_token';
  static const _secure = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static Future<String?> _getToken() async {
    final secure = await _secure.read(key: _tokenKey);
    if (secure != null && secure.isNotEmpty) return secure;

    // One-time migration from legacy SharedPreferences
    final prefs = await SharedPreferences.getInstance();
    final legacy = prefs.getString(_tokenKey);
    if (legacy != null && legacy.isNotEmpty) {
      await _secure.write(key: _tokenKey, value: legacy);
      await prefs.remove(_tokenKey);
      return legacy;
    }
    return null;
  }

  static Future<Map<String, String>> _headers({bool auth = true}) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final token = await _getToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<dynamic> get(String path) async {
    try {
      final res = await http
          .get(
            Uri.parse('$baseUrl$path'),
            headers: await _headers(),
          )
          .timeout(_timeout);
      return _handle(res);
    } on TimeoutException {
      throw ApiException(
        'Request timed out. Check your internet or server IP.',
        statusCode: 408,
      );
    }
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body,
      {bool auth = true}) async {
    try {
      final res = await http
          .post(
            Uri.parse('$baseUrl$path'),
            headers: await _headers(auth: auth),
            body: jsonEncode(body),
          )
          .timeout(_timeout);
      return _handle(res);
    } on TimeoutException {
      throw ApiException(
        'Request timed out. Check your internet or server IP.',
        statusCode: 408,
      );
    }
  }

  static dynamic _handle(http.Response res) {
    final dynamic body = res.body.isNotEmpty ? jsonDecode(res.body) : {};
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    throw ApiException(
      body is Map ? (body['message'] ?? 'Request failed') : 'Request failed',
      statusCode: res.statusCode,
    );
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, {required this.statusCode});

  @override
  String toString() => message;
}
