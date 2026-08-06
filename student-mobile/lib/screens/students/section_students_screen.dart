import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/election_service.dart';

class SectionStudentsScreen extends StatefulWidget {
  final String section;
  const SectionStudentsScreen({super.key, required this.section});
  @override
  State<SectionStudentsScreen> createState() => _SectionStudentsScreenState();
}

class _SectionStudentsScreenState extends State<SectionStudentsScreen> {
  List<dynamic> _students = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final svc = context.read<ElectionService>();
      final data = await svc.loadStudentsInSection(widget.section);
      if (mounted) setState(() { _students = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: const Color(0xFF0F172A),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.section, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: Color(0xFF0F172A))),
            Text('${_students.length} students', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.normal)),
          ],
        ),
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
        : _students.isEmpty
          ? const Center(child: Text('No students in this section.', style: TextStyle(color: Color(0xFF94A3B8))))
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              itemCount: _students.length,
              itemBuilder: (_, i) {
                final s = _students[i];
                final initial = (s['name'] as String).isNotEmpty ? (s['name'] as String)[0].toUpperCase() : '?';
                final voted = s['has_voted'] == true;
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
                    ],
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: const Color(0xFFEEF2FF),
                        child: Text(initial, style: const TextStyle(
                            color: Color(0xFF6366F1), fontWeight: FontWeight.w700, fontSize: 16)),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(s['name'], style: const TextStyle(color: Color(0xFF0F172A),
                                fontSize: 14, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 2),
                            Text(s['student_id'], style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: voted ? const Color(0xFFD1FAE5) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6, height: 6,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: voted ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(voted ? 'Voted' : 'Not voted',
                              style: TextStyle(
                                color: voted ? const Color(0xFF059669) : const Color(0xFF64748B),
                                fontSize: 11, fontWeight: FontWeight.w600,
                              )),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
