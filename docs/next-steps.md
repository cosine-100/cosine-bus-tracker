# Next steps: device testing, settings, and guided tours

## 1. Preview release (current step)

Publish the current app and test the welcome, sign-in, student and driver pages on real phones. Keep demo access explicitly identified, use normal form labels, and avoid another broad theme change before collecting device feedback.

Verify at 320px, 390px, tablet and desktop widths: readability, gold button contrast, card/background separation, menu behavior, keyboard navigation, sign-in redirects, map loading and footer links. Record the device, browser and screenshot for any issue.

## 2. Settings and profile (implemented; field verification next)

Settings and Profile are now available from desktop navigation and the mobile menu. Group settings by actual user needs: appearance and reduced motion, preferred student pickup/bus, and controls for clearing local preferences or the demo session. Explain which preferences are saved on this device. Never expose or persist the private driver key in settings.

Acceptance: both themes, keyboard and screen-reader navigation, mobile layout, persistence after reload, and clear/reset behavior all work.

## 3. Guided tour (next implementation)

Use a short role-specific spotlight tour, with Next, Back, Skip and progress. Student steps: bus search, live map, choosing a stop, understanding freshness/ETA. Driver steps: assigned-bus connection, start trip, GPS permission, stop sharing, end trip.

Offer the tour once after first entry, save completion locally, and provide Replay tour from Settings. Never trigger location permission or start a trip automatically. Keep focus in the current tour dialog, support Escape, avoid covering the highlighted control, and remove motion when requested. Missing or unavailable controls must be skipped safely.

Acceptance: dismissal and replay work, no keyboard trap, correct target on narrow screens, reduced motion, and no unintended GPS/network mutations.

## 4. Deployment and live tracking

Vercel is the initial UI preview target. The live backend currently stores active trips in process memory and registrations in a private JSON file. Before relying on cross-phone tracking in a serverless deployment, move state to a shared database and plan the live update transport. Then field-test two phones on the same HTTPS deployment, including permission denial, poor accuracy, network loss, stale-marker expiry, screen lock and explicit stop/end.
