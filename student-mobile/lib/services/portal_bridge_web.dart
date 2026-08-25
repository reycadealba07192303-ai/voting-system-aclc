import 'dart:js_interop';

import 'package:web/web.dart' as web;

/// Hands the student back to the public landing page (`/`).
///
/// The portal is either:
///   - iframed on `/student-login` (same origin), or
///   - opened as `/student/index.html` on its own.
/// In both cases the landing page is the site root. Cross-origin embeds fall
/// back to postMessage so the host page can navigate.
void notifyPortalLogout() {
  try {
    final top = web.window.top;
    if (top != null) {
      top.location.href = '/';
      return;
    }
  } catch (_) {
    // Cross-origin frame — cannot touch top.location.
  }

  final parent = web.window.parent;
  if (parent != null) {
    parent.postMessage('ssg:portal-logout'.toJS, '*'.toJS);
  }
}
