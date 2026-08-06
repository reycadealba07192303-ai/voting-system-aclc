import 'package:go_router/go_router.dart';

import 'services/auth_service.dart';
import 'screens/login/login_screen.dart';
import 'screens/login/set_password_screen.dart';
import 'screens/home/home_screen.dart';
import 'screens/candidates/candidates_screen.dart';
import 'screens/candidates/candidate_detail_screen.dart';
import 'screens/voting/voting_screen.dart';
import 'screens/voting/confirmation_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/shell_screen.dart';

GoRouter createAppRouter(AuthService auth) {
  return GoRouter(
    initialLocation: '/login',
    refreshListenable: auth,
    redirect: (context, state) {
      final isLoggedIn = auth.isLoggedIn;
      final loc = state.matchedLocation;
      const publicRoutes = ['/login', '/set-password'];

      if (!isLoggedIn && !publicRoutes.contains(loc)) {
        return '/login';
      }

      if (isLoggedIn && loc == '/login') {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/set-password',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return SetPasswordScreen(
            studentId: extra['studentId'] as String? ?? '',
            studentName: extra['studentName'] as String? ?? '',
          );
        },
      ),
      ShellRoute(
        builder: (context, state, child) => ShellScreen(child: child),
        routes: [
          GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          GoRoute(
              path: '/candidates',
              builder: (_, __) => const CandidatesScreen()),
          GoRoute(
            path: '/candidates/:id',
            builder: (context, state) => CandidateDetailScreen(
              candidateId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(path: '/voting', builder: (_, __) => const VotingScreen()),
          GoRoute(
              path: '/confirmation',
              builder: (_, __) => const ConfirmationScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),
    ],
  );
}
