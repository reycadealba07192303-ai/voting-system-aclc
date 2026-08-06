import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../services/election_service.dart';

class SectionsScreen extends StatefulWidget {
  const SectionsScreen({super.key});
  @override
  State<SectionsScreen> createState() => _SectionsScreenState();
}

class _SectionsScreenState extends State<SectionsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<ElectionService>().loadSections();
    });
  }

  @override
  Widget build(BuildContext context) {
    final sections = context.watch<ElectionService>().sections;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: const Color(0xFF0F172A),
        title: const Text('Students', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Color(0xFF0F172A))),
      ),
      body: sections.isEmpty
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
        : ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            itemCount: sections.length,
            itemBuilder: (_, i) {
              final sec = sections[i]['section'] as String;
              return _SectionTile(section: sec, index: i);
            },
          ),
    );
  }
}

class _SectionTile extends StatelessWidget {
  final String section;
  final int index;

  static const _colors = [
    Color(0xFF6366F1), Color(0xFF8B5CF6), Color(0xFF06B6D4),
    Color(0xFF10B981), Color(0xFFF59E0B), Color(0xFFEF4444),
  ];

  const _SectionTile({required this.section, required this.index});

  @override
  Widget build(BuildContext context) {
    final color = _colors[index % _colors.length];
    return GestureDetector(
      onTap: () => context.push('/students/$section'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 12, offset: const Offset(0, 4)),
          ],
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(section.substring(0, 1).toUpperCase(),
                  style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 18)),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(section, style: const TextStyle(color: Color(0xFF0F172A),
                      fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  const Text('Tap to view members', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: Colors.grey.shade300, size: 22),
          ],
        ),
      ),
    );
  }
}
