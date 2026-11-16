# ADR 001: Guest authentication in the website backend

Status: Proposed; team approval and gateway agreement pending.

## Context

DDP-#10 implements HW-07 guest login and protected guest requests. The SDS
describes a central Auth Service. The team decision recorded on 2026-10-14 in
`CLAUDE.md` section 11.2 assigns authentication to each subsystem instead.
This ADR records that deviation for review; it does not claim approval.

## Proposed decision

The website backend owns guest registration, bcrypt password verification,
JWT issuance, and validation on its protected routes. The gateway routes
requests, terminates TLS, and applies rate limits; it does not validate JWTs.

`POST /guests/login` returns an HS256 bearer token with `iss`, `sub` (guest UUID),
`iat`, `exp`, and `role=GUEST`. Tokens expire after 24 hours. There is no refresh
token. The signing key comes from `JWT_SECRET`, with a minimum of 32 bytes;
`JWT_ISSUER` is required and checked during verification.

Protected routes derive identity from verified claims, never a client-provided
guest ID. `GET /guests/me` also checks that the account still exists. Responses
exclude passwords and hashes. Bad credentials and invalid or missing tokens
return HTTP 401 using the documented error contract.

## Consequences and limits

Each subsystem must maintain its own authentication boundary. Other services
must not assume they can accept website tokens until key, issuer, role, and
identity contracts are agreed. Browser token transport still needs agreement;
do not persist tokens in localStorage or sessionStorage. Logout and immediate
token revocation are not implemented by DDP-#10.

Login lockout is deferred by the recorded team decision to before DDP-#33;
it requires coordination with infra for failed-attempt storage. Gateway rate
limits and private backend networking remain infrastructure responsibilities.

## Approval required

- Team review of the deviation from the SDS central Auth Service.
- Gateway owner agreement on public/protected routes and bearer forwarding.
- Auth and website owner agreement on browser transport and cross-service tokens.

Record named approvers, dates, and evidence in this ADR and the API contract
decision log before treating the architecture agreement as complete.
