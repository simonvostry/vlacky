# Google login

Vlacky uses Auth.js (`next-auth` v5) with Google OpenID Connect and one exact
email address in an allowlist. This works on Vercel Hobby. It needs no additional
database tables or paid authentication service.

## Configuration

Set these server-only variables in `.env.local` and in the relevant Vercel
deployment environment. Never commit their values or use `NEXT_PUBLIC_` prefixes.

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Random session encryption key, at least 32 bytes |
| `AUTH_GOOGLE_ID` | Google OAuth web client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth web client secret |
| `AUTH_ALLOWED_EMAIL` | The single Google email address permitted to use the app |

Auth.js infers the current host on Vercel. In `.env.local`, set
`AUTH_URL=http://localhost:3000` and use `http://localhost:3000` for local development.
Pinning it prevents Next.js from mixing hosts during the OAuth code exchange.
Google login was verified on `localhost`; the numeric `127.0.0.1` callback returned
a code-verifier error, so use the hostname. Restart the dev server after changing
OAuth environment variables. Only start Google login on a host registered with Google; arbitrary Vercel
preview URLs are protected, but cannot complete OAuth until their exact callback
URL is registered. Missing configuration denies access and shows an unavailable
message on the login page.

The Google Cloud project is **Vlacky**, ID `peerless-return-507709-r4`.
Open [Google Auth Platform](https://console.cloud.google.com/auth/overview?project=peerless-return-507709-r4).
Configure an external audience (personal Gmail accounts cannot use an internal
Workspace audience), add the owner as a test user, and create a **Web application**
OAuth client with these authorized redirect URIs:

```text
https://vlacky.vercel.app/api/auth/callback/google
https://vlacky.vostry.org/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
http://127.0.0.1:3000/api/auth/callback/google
```

The custom-domain callback was saved in Google on 2026-09-13. HTTPS and a real Google login on the custom domain were verified successfully the same day after issuing its Vercel certificate.

The app requests only the default `openid email profile` identity scopes. It
does not request Gmail mailbox access. The allowlist is enforced by the app even
if the Google audience is later expanded or published.

## Access enforcement

- `src/auth.ts` accepts only a Google profile with `email_verified: true` and an
  exact email match (case insensitive). Sessions use encrypted HTTP-only cookies
  with a 30-day maximum age; HTTPS uses secure cookies.
- Every session read rechecks the allowlist and the verified-login marker.
  Changing the allowed email revokes existing users on their next request after
  the updated configuration is deployed. Rotating `AUTH_SECRET` signs everyone out.
- `src/proxy.ts` redirects unauthenticated page and image requests to
  `/prihlaseni`, preserving the requested relative page URL. Data API requests get
  JSON `401 Unauthorized`.
- Every page loader and data API handler also checks the session before querying
  or changing data. Keep these guards when adding routes; the proxy alone is not
  the authorization boundary.
- OAuth endpoints, framework assets and the favicon are public. The login page
  contains no collection data. Auth.js handles OAuth state/PKCE and CSRF protection.
- Images remain files under `public/img`. The deployed app protects those paths,
  but files already committed to the public GitHub repository remain public there.

## Validation and deployment

```sh
npm run test:auth
npm run lint -- --max-warnings 0
npm run build
npm run test:auth-http
```

The HTTP test starts a separate production server on port 3107 with disposable
authentication settings and an unreachable database endpoint. It checks all page
routes and API methods, protected images, invalid/expired sessions, a valid
encrypted session, safe redirects and rejection of a forged OAuth callback.
It does not write to Turso or the local collection.

After setting all four environment variables, deploy with `vercel --prod` and
check in a signed-out browser that pages redirect and APIs return 401. Complete
one real Google login on `https://vlacky.vercel.app`, check collection pages and
images, then sign out. Local tests cannot substitute for this real OAuth check.

Verified on 2026-09-05: production Google sign-in/sign-out, authenticated catalog
images, anonymous page/image redirects and API 401s, plus real Google sign-in in
local development at `http://localhost:3000`. The Google audience remains in
Testing mode with the owner as its only test user.

References: [Auth.js installation](https://authjs.dev/getting-started/installation),
[Google provider](https://authjs.dev/getting-started/providers/google),
[route protection](https://authjs.dev/getting-started/session-management/protecting),
[deployment configuration](https://authjs.dev/getting-started/deployment).
