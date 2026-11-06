Password recovery
=================

The sign-in page links to `/forgot-password`. Registered guests receive a Brevo
email linking to `/reset-password`. Links expire after 15 minutes. Signatures bind
each link to the current password hash; an atomic conditional update ensures only
one reset succeeds, even for simultaneous requests. No database migration is needed.

Configuration in backend `.env`:

```
PASSWORD_RESET_ORIGIN=http://localhost:3001
BREVO_API_KEY=your-brevo-key
CONTACT_EMAIL_FROM=your-verified-sender@example.com
# Optional override:
PASSWORD_RESET_EMAIL_FROM=
```

Use the frontend's public HTTPS origin in production. Restart the backend after
changing configuration. Password recovery sends real emails independently of
booking/contact sandbox modes. Never log reset links or tokens. Tokens travel in
the URL fragment, are removed from the address bar after capture, and are submitted
to the backend only in the reset request body. The gateway applies the login rate
limit to both recovery endpoints; restart it to load the change.

Unknown accounts and email provider failures return the same generic response.
Delivery failures appear in backend logs without email addresses or tokens.
Previously issued login sessions retain their normal expiry; resetting a password
does not revoke sessions on other devices. The browser completing the reset clears
its local session and asks the guest to sign in again.

Verify locally with a disposable guest: request an email, follow the link, change
the password, confirm old-password login fails and new-password login succeeds,
then confirm the same reset link cannot be used again.
