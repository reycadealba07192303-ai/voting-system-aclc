/// Talks to the page embedding this app.
///
/// On the web the student portal runs inside an iframe on the public site, so
/// leaving the app (logging out) has to be handed up to the host page — the
/// iframe cannot navigate itself back to a landing page it does not contain.
/// On Android and iOS there is no host, and these calls do nothing.
library;

export 'portal_bridge_stub.dart'
    if (dart.library.js_interop) 'portal_bridge_web.dart';
