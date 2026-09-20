export { auth as proxy } from "@/auth";

export const config = {
  // Auth endpoints, framework assets and these exact app icons load before sign-in.
  // Vehicle images and all application/API paths remain protected.
  matcher: ["/((?!api/auth/|_next/static/|_next/webpack-hmr|favicon[.]ico$|icon[.]png$|apple-icon[.]png$).*)"],
};
