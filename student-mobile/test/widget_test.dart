import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:student_mobile/main.dart';
import 'package:student_mobile/services/auth_service.dart';
import 'package:student_mobile/services/election_service.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    final authService = AuthService();
    await authService.loadToken();
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthService>(create: (_) => authService),
          ChangeNotifierProvider<ElectionService>(create: (_) => ElectionService()),
        ],
        child: SSGElectionApp(authService: authService),
      ),
    );
  });
}
