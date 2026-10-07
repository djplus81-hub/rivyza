RIVYZA v13.15.0 — iPhone installed-app/PWA feed layout fix

Based directly on the page.js and globals.css supplied by Alex.

Diagnosis from the supplied CSS:
- The feed/card uses 100dvh.
- Media uses object-fit: contain.
- Media had object-position: 50% calc(50% + 35px).
- In installed standalone mode the viewport is taller than Safari because Safari's browser chrome is absent.
- That extra height was centering the contained 2:3 media and producing the black band below the header.

Change:
- ONLY when display-mode is standalone on phone width:
  - media area begins below the existing 64px header
  - contained photo/video is anchored to the top of that media area
- Normal Safari/browser rendering is untouched.
- No changes to React/JS, camera, profile, LIVE, recording ring, dates, or database.
