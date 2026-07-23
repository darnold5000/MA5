# MA5 Auth email templates (Supabase)

Paste these into **Supabase → Authentication → Email Templates**.

Existing Auth users who are re-invited receive an **invite** link when they never finished signup, or a **recovery** link only after they have activated before. Keep both Supabase templates activation-friendly.

---

## Redirect URLs (required for invites)

Invite links use `NEXT_PUBLIC_SITE_URL` as:

`{SITE_URL}/auth/callback?next=/auth/accept-invite`

In **Supabase → Authentication → URL Configuration**:

1. Set **Site URL** to the MA5 host you want as the default (e.g. production MA5 URL), **or** keep a shared Site URL and always rely on the allowlist below.
2. Add every MA5 host to **Redirect URLs**, including local and production, e.g.:
   - `http://localhost:3000/auth/callback`
   - `https://your-ma5-host.example/auth/callback`
   - `https://your-ma5-host.example/**` (if your project allows wildcards)

If MA5 shares a Supabase project with Dugout Intel and the MA5 callback is **not** allowlisted, Supabase falls back to the project **Site URL** — which is why invite emails can open the Dugout Intel dashboard instead of MA5.

---

## Invite (new Auth users)

**Subject**

```text
You’ve been invited to the MA5 Member Platform
```

**Body**

```html
<h2>Welcome to MA5 Performance</h2>
<p>MA5 has created a member account for you.</p>
<p>Use the secure link below to set your password and activate your access.</p>
<p><a href="{{ .ConfirmationURL }}">Activate your MA5 account</a></p>
<p>If you were not expecting this email, you can ignore it.</p>
```

---

## Reset password / recovery (forgot password + existing-user activation)

Used for:

- Member-initiated **Forgot password?**
- Admin re-invite / activation when the email already exists in Supabase Auth

**Subject**

```text
Set your MA5 password and activate access
```

**Body**

```html
<h2>MA5 account access</h2>
<p>
  Use this secure link to set or update your password for the MA5 Member Platform.
</p>
<p>
  You may receive this email when MA5 staff activates your account,
  or when you request a password reset. It does not mean anything is wrong
  with your account.
</p>
<p><a href="{{ .ConfirmationURL }}">Continue to MA5</a></p>
<p>If you did not expect this email, you can ignore it.</p>
```

---

## Optional: Resend-branded activation

When `RESEND_API_KEY` and `AUTH_EMAIL_FROM` are set, the admin invite path for
**existing** Auth users sends a dedicated activation email (clearer than the
generic recovery template). Forgot-password still uses Supabase recovery.

See `.env.example` for `AUTH_EMAIL_FROM`.
