import LoginTemplate from "@modules/account/templates/login-template"

/**
 * The `@login` slot only has a page for `/account` itself. Without this, a
 * logged-out visitor opening `/account/orders` or any other sub-page would get
 * a 404, because Next finds nothing to render in the slot for that segment.
 *
 * The middleware redirects those paths to `/account` when the auth cookie is
 * missing, so this mostly covers the case it cannot see: a cookie that is
 * present but no longer valid.
 */
export default function LoginDefault() {
  return <LoginTemplate />
}
