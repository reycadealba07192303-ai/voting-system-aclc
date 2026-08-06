import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'services/auth_service.dart';
import 'services/election_service.dart';
import 'theme/app_colors.dart';
import 'router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));

  final authService = AuthService();
  await authService.loadToken();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => authService),
        ChangeNotifierProvider(create: (_) => ElectionService()),
      ],
      child: SSGElectionApp(authService: authService),
    ),
  );
}

class SSGElectionApp extends StatefulWidget {
  final AuthService authService;
  const SSGElectionApp({super.key, required this.authService});

  @override
  State<SSGElectionApp> createState() => _SSGElectionAppState();
}

class _SSGElectionAppState extends State<SSGElectionApp> {
  late final GoRouter _router = createAppRouter(widget.authService);

  @override
  Widget build(BuildContext context) {
    final base = GoogleFonts.plusJakartaSansTextTheme();

    return MaterialApp.router(
      title: 'SSG Elections',
      debugShowCheckedModeBanner: false,
      color: AppColors.bg,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.blue,
          primary: AppColors.blue,
          secondary: AppColors.red,
          brightness: Brightness.light,
          surface: AppColors.white,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: AppColors.bg,
        canvasColor: AppColors.bg,
        fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
        textTheme: base.apply(
          bodyColor: AppColors.text,
          displayColor: AppColors.text,
        ),
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
            TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          },
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.bg,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          foregroundColor: AppColors.text,
          titleTextStyle: GoogleFonts.plusJakartaSans(
            color: AppColors.text,
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: AppColors.white,
          selectedItemColor: AppColors.blue,
          unselectedItemColor: AppColors.textMuted,
        ),
      ),
      routerConfig: _router,
    );
  }
}
