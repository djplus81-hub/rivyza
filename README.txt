RIVYZA v5: home estilo short-video familiar, fondo negro, feed vertical, display name visible, username secundario, perfil separado.

Mobile compact fix: top and bottom navigation are constrained to the phone/feed width on desktop and 100vw on mobile.


RIVYZA v6: brand fixed top-left, compact top navigation, no in-video logo, pink/blue/black main screen inspired by the earlier preferred layout.


RIVYZA v7 Profile: full public profile with name, username, Following/Followers/Likes, social link placeholders, avatar + button, posts grid, and edit-profile flow.


RIVYZA v8: refined profile layout, case-preserving username display, compact stats, avatar + edit, social link placeholders, posts tab and private likes tab.


RIVYZA v9: editable Website, YouTube, Instagram and Facebook links saved to Supabase and shown as clickable links on the public profile.


RIVYZA v9.1 FIX: restores Google login/profile loading by defining social-link state variables; keeps editable profile links; preserves username capitalization for display.


RIVYZA v10.1 MOBILEFIX: existing Google users are forced to Inicio; only new users without a profile go to setup. Edit-profile color is now inside the mobile profile card around title/photo, not on the outer website background.


RIVYZA v10.2 NAVFIX: removed secondary automatic redirects that could send authenticated existing users from Inicio to Perfil after Google login. Existing profiles now stay on Inicio; only new accounts without a profile go to profile setup.


RIVYZA v10.3 AUTHFIX: removed the login navigation race. Profile loading no longer changes screens. Any authenticated Google user lands and stays on Inicio; auth refresh events cannot send the user to Perfil.


RIVYZA v10.4: removed duplicate 'Editar perfil' heading and adjusted spacing in the mobile edit-profile banner.


RIVYZA v10.5 SAVED LOGIN: explicit Supabase session persistence, automatic token refresh, URL session detection, and startup hydration from the saved device/browser session using getSession(). Existing registered users return directly to Inicio without pressing Google again unless they sign out or browser storage is cleared.


RIVYZA v10.6 COUNTRY: one country/flag per profile, complete ISO country selector, optional visibility, shown only on the profile underneath @username.


RIVYZA v10.7: edit-profile/mobile screens now use the same full mobile width; country display is compact flag + country name (example: 🇩🇴 República Dominicana).


RIVYZA v10.8 FLAGFIX: repaired country flag generation and forced visible emoji flag + country name on public profile.


RIVYZA v10.9 WIDTHFIX: removes the 24px outer mobile shell padding that was making Edit Profile look narrower than Inicio/Profile. Edit Profile now uses the full phone width while keeping comfortable inner padding.


RIVYZA v11 REAL FIX: country flag now uses a real flag image instead of OS emoji, and Edit Profile uses the same 560px profile canvas on desktop while remaining full-width on phones.
