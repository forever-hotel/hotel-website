# Forever Hotel standard frontend folder structure

Source: `Forever_Hotel_Standard_Frontend_Folder_Structure.docx`, supplied by the team as its agreed frontend structure. The source content is reproduced below with Markdown headings, tables and code blocks.

**Status:** Target structure for future implementation, not an inventory of the current scaffold. Recommendations and decisions still marked for confirmation in the source remain marked that way here. Refer to the [frontend README](README.md) for current setup and commands.

For this repository, start with [the common skeleton](#3-common-frontend-skeleton-for-all-six-subsystems), [feature modules](#4-standard-structure-of-a-feature-module), and [the hotel website structure](#6-hotel-website-frontend---hotel-websitefrontend). Section 26 retains the source alignment notes and open decisions.

FOREVER HOTEL

MANAGEMENT SYSTEM

Complete Standard Frontend Folder Structure

For Web, Tablet and Mobile/PWA Subsystems

| Architecture          | Microservices                                      |
| --------------------- | -------------------------------------------------- |
| Frontend Framework    | Next.js (App Router) / React / TypeScript          |
| Backend Context       | NestJS / Node.js behind a single API Gateway       |
| Client Types          | Public Web, Internal Web, Tablet, Mobile-first PWA |
| Backend Communication | REST via API Gateway + real-time (WSS) events      |

Prepared as the common implementation standard for all six subsystem frontends

## 1. Purpose of This Standard

This document defines the recommended complete frontend folder structure for every Forever Hotel subsystem repository. Its purpose is to ensure that all team members implement the Next.js frontends using the same naming, layering, feature boundaries, API access pattern, real-time integration, testing layout and deployment conventions. It is the counterpart of the Standard Backend Folder Structure and uses the same repository model, terminology and naming rules.

The structure is aligned with the project’s approved design: six independently deployable subsystems, Next.js frontends (SPA/PWA), NestJS backends reached only through the API Gateway, JWT/RBAC security, WebSocket-based real-time updates, WCAG 2.1 Level AA accessibility and Docker-based deployment.

Important: The client form factor (public web, internal web, tablet or mobile/PWA) does not require a different frontend architecture. All six frontends follow one common Next.js standard; only the routes, the feature modules, the layout density and PWA support differ.

## 2. Repository-Level Standard

Each subsystem repository contains one frontend/ and one backend/ application, exactly as defined in the backend standard.

```text

forever-hotel/
│
├── hotel-website/
│   ├── frontend/          # Public web
│   └── backend/
│
├── manager-dashboard/
│   ├── frontend/          # Internal web (desktop)
│   └── backend/
│
├── front-desk/
│   ├── frontend/          # Internal web (desktop)
│   └── backend/
│
├── food-ordering/
│   ├── frontend/          # Mobile-first PWA
│   └── backend/
│
├── kitchen-management/
│   ├── frontend/          # Tablet/Web
│   └── backend/
│
├── worker-management/
│   ├── frontend/          # Mobile-first PWA
│   └── backend/
│
├── api-gateway/
├── infra/
├── tests/                 # Cross-service integration + E2E tests
└── documents/

```

Inside any one subsystem repository the repository-root files sit beside the two applications:

```text

food-ordering/
├── .github/
│   └── workflows/
│       └── ci.yml         # lint, build and test jobs for frontend/ and backend/
├── frontend/
├── backend/
├── CHANGELOG.md
└── README.md

```

- Each frontend/ is an independent Next.js application with its own package.json, Dockerfile and CI job.

- No code is imported between two frontend applications, between two repositories, or between frontend/ and backend/. Contracts are shared only through the documented API and event definitions.

Course guideline: SENG 34213 (section 5.2) requires the linter configuration file to be committed to the repository root. The frontend keeps its own eslint.config.mjs inside frontend/ (as the backend does); add a thin root-level configuration that extends it, or confirm the placement with the supervisor.

## 3. Common Frontend Skeleton for All Six Subsystems

Every subsystem frontend should begin with the same foundation below. This common skeleton contains the cross-cutting concerns; the subsystem’s own screens are placed under src/app/ and its business features under src/features/.

```text

frontend/
│
├── public/
│   ├── icons/
│   │   └── .gitkeep
│   ├── images/
│   │   └── .gitkeep
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   └── [SUBSYSTEM ROUTES]
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── spinner.tsx
│   │   │   └── toast.tsx
│   │   ├── layout/
│   │   │   ├── app-shell.tsx
│   │   │   ├── header.tsx
│   │   │   ├── navigation.tsx
│   │   │   └── footer.tsx
│   │   ├── feedback/
│   │   │   ├── empty-state.tsx
│   │   │   ├── error-state.tsx
│   │   │   ├── loading-skeleton.tsx
│   │   │   └── connection-status.tsx
│   │   └── forms/
│   │       ├── form-field.tsx
│   │       └── form-error-message.tsx
│   │
│   ├── features/
│   │   └── [SUBSYSTEM FEATURE MODULES]
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── api-client.ts
│   │   │   ├── api-error.ts
│   │   │   └── query-keys.ts
│   │   ├── auth/
│   │   │   ├── session.ts
│   │   │   ├── roles.ts
│   │   │   └── route-access.ts
│   │   ├── realtime/
│   │   │   ├── socket-client.ts
│   │   │   ├── reconnect-policy.ts
│   │   │   └── realtime-event-names.ts
│   │   ├── constants/
│   │   │   ├── routes.constants.ts
│   │   │   └── error-codes.constants.ts
│   │   ├── validation/
│   │   │   └── common.schema.ts
│   │   └── utils/
│   │       ├── cn.util.ts
│   │       ├── date.util.ts
│   │       ├── currency.util.ts
│   │       └── format.util.ts
│   │
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-realtime-event.ts
│   │   ├── use-media-query.ts
│   │   └── use-debounce.ts
│   │
│   ├── providers/
│   │   ├── app-providers.tsx
│   │   ├── auth-provider.tsx
│   │   ├── query-provider.tsx
│   │   └── realtime-provider.tsx
│   │
│   ├── config/
│   │   ├── env.ts
│   │   └── site.config.ts
│   │
│   ├── types/
│   │   ├── api-response.type.ts
│   │   ├── authenticated-user.type.ts
│   │   └── realtime-event.type.ts
│   │
│   ├── styles/
│   │   └── tokens.css
│   │
│   └── middleware.ts          # named proxy.ts in Next.js 16
│
├── tests/
│   ├── fixtures/
│   │   └── .gitkeep
│   ├── mocks/
│   │   ├── handlers.ts
│   │   └── server.ts
│   └── utils/
│       └── render-with-providers.tsx
│
├── .env.example
├── .gitignore
├── Dockerfile
├── README.md
├── eslint.config.mjs
├── jest.config.ts
├── jest.setup.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs         # only if Tailwind CSS is adopted
└── tsconfig.json

```

### 3.1 Meaning of the Common Folders

| Folder        | Purpose                                                                                | Rule                                                                                           |
| ------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| app/          | Routes, layouts and route-level loading/error screens (Next.js App Router).            | Pages stay thin: they compose feature components. No business logic and no direct fetch calls. |
| components/   | Reusable presentational components shared across features of this application.         | No feature-specific logic. If only one feature uses it, it belongs in that feature.            |
| features/     | Subsystem business capabilities, one folder per domain feature.                        | Primary location for feature components, hooks, API calls, schemas and types.                  |
| lib/          | Framework-level infrastructure: API client, auth helpers, real-time client, utilities. | No feature-specific code. No JSX except where a utility genuinely renders.                     |
| hooks/        | Generic hooks reused by several features.                                              | Feature-specific hooks stay inside the feature.                                                |
| providers/    | React context/provider composition mounted once in the root layout.                    | All providers are composed in app-providers.tsx, not ad hoc in pages.                          |
| config/       | Validated environment access and static site configuration.                            | process.env is read only here.                                                                 |
| types/        | Cross-feature TypeScript types (API envelope, authenticated user, real-time event).    | Feature types stay in features/&lt;name&gt;/types/.                                            |
| styles/       | Global styles and design tokens (colours, spacing, focus styles).                      | No component-specific CSS here.                                                                |
| public/       | Static assets, icons and PWA icons.                                                    | No secrets and no generated files.                                                             |
| tests/        | Test setup, API mocks, fixtures and render helpers.                                    | Unit tests stay next to the code; E2E tests live in the tests repository.                      |
| middleware.ts | Coarse route protection: redirect unauthenticated or wrong-role users.                 | Redirects only. Authorization is enforced by the backend.                                      |

## 4. Standard Structure of a Feature Module

A feature is one business capability of the subsystem (for example orders, bookings or tasks). Feature folder names mirror the backend module names wherever a backend module exists, so a developer can move between the two halves of a repository easily.

```text

orders/
├── components/
│   ├── order-card.tsx
│   ├── order-card.test.tsx
│   ├── order-list.tsx
│   └── order-status-badge.tsx
├── hooks/
│   ├── use-orders.ts
│   └── use-order-updates.ts
├── api/
│   └── orders.api.ts
├── schemas/
│   └── create-order.schema.ts
├── types/
│   └── order.type.ts
├── constants/
│   └── order-status.constants.ts
├── utils/
│   └── calculate-order-total.util.ts
└── index.ts

```

Use the same plural folder names across every repository: components/, hooks/, schemas/, types/, constants/ and utils/. Create only the folders the feature actually needs. The rules below apply to every feature:

- api/ is the only place that calls lib/api/api-client.ts. Components and pages never call fetch directly.

- hooks/ wraps the api/ functions (server state) and real-time subscriptions for the components.

- schemas/ holds form-validation schemas that mirror the backend DTO rules.

- index.ts is the feature’s public surface. Other code imports from the feature index only, never from its internal files.

- No cross-feature imports of internals. If two features need the same code, promote it to components/, hooks/ or lib/.

## 5. Standard Structure of a Route (App Router)

Routes live under src/app/. Route groups, written in parentheses, organise routes and layouts without changing the URL.

```text

app/
├── (auth)/
│   ├── login/page.tsx
│   └── change-password/page.tsx
│
└── (protected)/
    ├── layout.tsx                 # app shell + role guard
    └── orders/
        ├── page.tsx
        ├── loading.tsx
        ├── error.tsx
        └── [orderId]/
            └── page.tsx

```

| File          | Purpose                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| page.tsx      | The route’s screen. Composes feature components only.                                    |
| layout.tsx    | Shared shell for a route group: navigation, role guard, providers specific to the group. |
| loading.tsx   | Skeleton shown while data loads.                                                         |
| error.tsx     | Route-level error boundary with a specific, accessible message and a retry action.       |
| not-found.tsx | Shown when the requested resource does not exist.                                        |

| Route group | Used for                                                    | Used in                  |
| ----------- | ----------------------------------------------------------- | ------------------------ |
| (public)    | Pages open to anonymous visitors.                           | hotel-website            |
| (auth)      | Login, registration and forced first-login password change. | All except food-ordering |
| (guest)     | Pages for a logged-in hotel guest.                          | hotel-website            |
| (session)   | Pages that require an active room-linked guest session.     | food-ordering            |
| (protected) | Role-guarded staff pages.                                   | All staff frontends      |

- Route segments use kebab-case and match the backend resource names (for example /orders, /service-requests). Dynamic segments use camelCase, such as [orderId].

- Components are Server Components by default. Add ‘use client’ only where interactivity, browser APIs or real-time subscriptions are needed.

- page.tsx and layout.tsx are the only files that use default exports; everything else uses named exports.

## 6. Hotel Website Frontend - hotel-website/frontend

Primary responsibility: public hotel information, room discovery, real-time availability search, guest registration and login, the online booking and payment journey, and booking self-service.

```text

hotel-website/frontend/src/app/
├── (public)/
│   ├── page.tsx                          # home
│   ├── rooms/
│   │   ├── page.tsx
│   │   └── [roomTypeId]/page.tsx
│   ├── about/page.tsx                    # hotel information + map
│   └── contact/page.tsx
├── (auth)/
│   ├── register/page.tsx
│   └── login/page.tsx
└── (guest)/
    ├── booking/
    │   ├── page.tsx                      # dates + availability + room type
    │   ├── review/page.tsx               # guests, requests, promo code, total
    │   ├── payment/page.tsx              # Stripe payment
    │   └── confirmation/[bookingId]/page.tsx
    ├── my-bookings/
    │   ├── page.tsx
    │   └── [bookingId]/page.tsx          # modify / cancel
    └── profile/page.tsx

```

```text

hotel-website/frontend/src/features/
├── auth/
│   ├── components/
│   │   ├── login-form.tsx
│   │   └── change-password-form.tsx
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── hotel-content/
│   ├── components/
│   │   ├── hero-section.tsx
│   │   └── hotel-map.tsx
│   ├── api/
│   ├── types/
│   └── index.ts
├── inquiries/
│   ├── components/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── guests/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   └── index.ts
├── room-types/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── availability/
│   ├── components/
│   │   ├── date-range-picker.tsx
│   │   └── availability-results.tsx
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   └── index.ts
├── bookings/
│   ├── components/
│   │   ├── booking-summary.tsx
│   │   └── booking-review-form.tsx
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   ├── constants/
│   └── index.ts
├── promotions/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
└── payments/
    ├── components/
    │   ├── stripe-payment-form.tsx
    │   └── payment-status.tsx
    ├── hooks/
    ├── api/
    ├── types/
    └── index.ts

```

Subsystem-specific additions:

```text

hotel-website/frontend/src/lib/
└── stripe/
    └── stripe-client.ts                  # loads Stripe.js with the publishable key

```

### 6.1 Hotel Website Frontend Ownership

- Public content pages, hotel map embed and the contact inquiry form.

- Guest registration and login screens (they call the central Auth Service; no identity logic here).

- Room type browsing and date-based availability search.

- Booking journey: dates, room type, guests and special requests, optional promo code, total, full or deposit payment, confirmation.

- Payment failure handling with retry on the payment step.

- Booking modification and cancellation, and the guest profile.

PCI-DSS: Card data is entered only into Stripe-hosted components (Stripe Checkout or Stripe Elements). It is never sent to, logged by or stored in any Forever Hotel frontend or backend.

## 7. Manager Dashboard Frontend - manager-dashboard/frontend

Primary responsibility: management analytics with live updates, occupancy and revenue views, promotion administration, staff account management, complaint resolution, worker performance, system settings and report export.

```text

manager-dashboard/frontend/src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── change-password/page.tsx
└── (protected)/
    ├── layout.tsx
    ├── dashboard/page.tsx                # operational overview + KPIs
    ├── analytics/page.tsx
    ├── occupancy/page.tsx
    ├── revenue/page.tsx
    ├── promotions/
    │   ├── page.tsx
    │   ├── new/page.tsx
    │   └── [promotionId]/page.tsx
    ├── staff/
    │   ├── page.tsx
    │   ├── new/page.tsx
    │   └── [staffId]/page.tsx            # details + password reset
    ├── complaints/
    │   ├── page.tsx
    │   └── [complaintId]/page.tsx
    ├── worker-performance/page.tsx
    ├── settings/page.tsx
    └── reports/page.tsx                  # generate + export

```

```text

manager-dashboard/frontend/src/features/
├── auth/
│   ├── components/
│   │   ├── login-form.tsx
│   │   └── change-password-form.tsx
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── operational-overview/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── analytics/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── occupancy/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── revenue/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── promotions/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   └── index.ts
├── staff-accounts/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   └── index.ts
├── complaints/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   └── index.ts
├── worker-performance/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── system-settings/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   └── index.ts
└── reports/
    ├── components/
    ├── hooks/
    ├── api/
    ├── schemas/
    ├── types/
    └── index.ts

```

Subsystem-specific additions:

```text

manager-dashboard/frontend/src/
├── components/
│   ├── charts/
│   │   ├── kpi-card.tsx
│   │   ├── line-chart.tsx
│   │   └── bar-chart.tsx
│   └── data-table/
│       └── data-table.tsx
└── lib/
    └── utils/
        └── download.util.ts              # report file download helper

```

### 7.1 Manager Dashboard Frontend Ownership

- Live operational and analytics panels (bookings, orders, service requests, room status).

- Occupancy and revenue views.

- Promotion creation, editing and publishing screens.

- Staff account creation and password-reset screens. Credential delivery by email is done by the backend; the frontend never displays or stores generated passwords.

- Complaint review and resolution workflow.

- Worker-performance views and system-settings screens.

- Report generation and export.

- The Kitchen Manager role reaches only the parts of this application granted to it in lib/auth/route-access.ts.

## 8. Front Desk Frontend - front-desk/frontend

Primary responsibility: receptionist workflows including the live room status board, reservation lookup and import, walk-ins, check-in, check-out with folio, room changes, maintenance blocking, service requests on behalf of guests, escalations and the audit trail.

```text

front-desk/frontend/src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── change-password/page.tsx
└── (protected)/
    ├── layout.tsx
    ├── dashboard/page.tsx                # room status board + escalation badge
    ├── reservations/
    │   ├── page.tsx
    │   ├── import/page.tsx
    │   └── [reservationId]/page.tsx
    ├── walk-in/page.tsx
    ├── check-in/
    │   ├── page.tsx
    │   └── [reservationId]/page.tsx
    ├── check-out/[bookingId]/page.tsx    # folio + payment
    ├── rooms/
    │   ├── page.tsx
    │   └── [roomNumber]/page.tsx
    ├── room-changes/page.tsx
    ├── maintenance/page.tsx
    ├── service-requests/
    │   ├── page.tsx
    │   └── new/page.tsx                  # on behalf of guest
    ├── escalations/page.tsx
    └── audit-log/page.tsx

```

```text

front-desk/frontend/src/features/
├── auth/
│   ├── components/
│   │   ├── login-form.tsx
│   │   └── change-password-form.tsx
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── reservations/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── booking-import/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── walk-in-bookings/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── check-in/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── check-out/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── rooms/
│   ├── components/
│   │   ├── room-status-board.tsx
│   │   ├── room-tile.tsx
│   │   └── room-status-badge.tsx
│   ├── hooks/
│   ├── api/
│   ├── types/
│   ├── constants/
│   └── index.ts
├── room-changes/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── maintenance/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── folios/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── service-requests/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   └── index.ts
├── escalations/
│   ├── components/
│   │   ├── escalation-panel.tsx
│   │   └── escalation-badge.tsx
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── printing/
│   ├── components/
│   ├── api/
│   └── index.ts
└── audit/
    ├── components/
    ├── hooks/
    ├── api/
    ├── types/
    └── index.ts

```

### 8.1 Front Desk Frontend Ownership

- Live room status board (Vacant, Occupied, Requires Cleaning, Under Maintenance) with text labels, never colour alone.

- Escalation panel and notification badge for unclaimed worker tasks.

- Reservation search, imported-reservation review and walk-in booking.

- Check-in and check-out orchestration screens, including the running folio and checkout charges.

- Room change and maintenance blocking.

- Service request creation on behalf of a guest.

- Print actions for registration card and receipt (the printing itself is requested through the backend).

- Read-only audit log viewer. The Manager role has read-only access to this application.

## 9. Food Ordering / Guest App Frontend - food-ordering/frontend

Primary responsibility: room-linked guest access, menu browsing, cart and food ordering, order tracking and cancellation, service requests and complaints. This is a mobile-first PWA used by checked-in guests; it has no username/password screens.

```text

food-ordering/frontend/src/app/
├── manifest.ts
├── offline/page.tsx
├── access/
│   └── [token]/page.tsx                  # QR landing: exchange token, start session
├── session-expired/page.tsx
└── (session)/
    ├── layout.tsx                        # session guard + bottom navigation
    ├── menu/
    │   ├── page.tsx
    │   └── [menuItemId]/page.tsx
    ├── cart/page.tsx                     # review, allergy note, submit
    ├── orders/
    │   ├── page.tsx
    │   └── [orderId]/page.tsx            # live status + cancellation timer
    ├── services/
    │   ├── page.tsx
    │   ├── new/page.tsx
    │   └── [requestId]/page.tsx          # live status tracker
    └── complaints/
        ├── page.tsx
        ├── new/page.tsx
        └── [complaintId]/page.tsx

```

```text

food-ordering/frontend/src/features/
├── guest-sessions/
│   ├── components/
│   │   └── session-guard.tsx
│   ├── hooks/
│   │   └── use-guest-session.ts
│   ├── api/
│   ├── types/
│   └── index.ts
├── qr-access/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   └── index.ts
├── menu/
│   ├── components/
│   │   ├── menu-category-tabs.tsx
│   │   └── menu-item-card.tsx
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── cart/
│   ├── components/
│   │   ├── cart-summary.tsx
│   │   └── allergy-note-field.tsx
│   ├── hooks/
│   ├── types/
│   └── index.ts
├── food-orders/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   ├── constants/
│   └── index.ts
├── order-cancellation/
│   ├── components/
│   │   └── cancellation-timer.tsx
│   ├── hooks/
│   ├── api/
│   └── index.ts
├── order-tracking/
│   ├── components/
│   │   └── order-status-tracker.tsx
│   ├── hooks/
│   ├── types/
│   └── index.ts
├── service-requests/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   ├── constants/
│   └── index.ts
└── complaints/
    ├── components/
    ├── hooks/
    ├── api/
    ├── schemas/
    ├── types/
    └── index.ts

```

Subsystem-specific additions (PWA files are described in section 16):

```text

food-ordering/frontend/src/components/layout/
└── bottom-nav.tsx                        # thumb-reachable primary navigation

```

### 9.1 Food Ordering Frontend Ownership

- QR landing and session bootstrap, and a clear session-expired screen after check-out or expiry.

- Menu browsing that respects ordering windows and stock status returned by the API.

- Client-side cart (there is no backend cart module) with special notes and an allergy note before submission.

- Order submission, live status tracking (Submitted, In Kitchen, Ready, Delivered) and cancellation with a live countdown timer.

- Service request submission and live status tracking (Submitted, Assigned, In Progress, Completed).

- Complaint submission and status view.

- PWA install and offline experience.

## 10. Kitchen Management Frontend - kitchen-management/frontend

Primary responsibility: the live FIFO kitchen queue on a tablet, order state transitions, allergy acknowledgement, menu and stock administration, ordering windows and KOT status.

```text

kitchen-management/frontend/src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── change-password/page.tsx
└── (protected)/
    ├── layout.tsx
    ├── orders/
    │   ├── page.tsx                      # live kanban board (default landing)
    │   └── [orderId]/page.tsx
    ├── kot/page.tsx                      # KOT status / reprint
    ├── menu/                             # Kitchen Manager only
    │   ├── page.tsx
    │   ├── new/page.tsx
    │   └── [menuItemId]/page.tsx
    ├── categories/page.tsx               # Kitchen Manager only
    ├── stock/page.tsx                    # Kitchen Manager only
    └── ordering-windows/page.tsx         # Kitchen Manager only

```

```text

kitchen-management/frontend/src/features/
├── auth/
│   ├── components/
│   │   ├── login-form.tsx
│   │   └── change-password-form.tsx
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── orders/
│   ├── components/
│   │   ├── kanban-board.tsx
│   │   ├── order-column.tsx
│   │   ├── order-ticket.tsx
│   │   └── new-order-alert.tsx
│   ├── hooks/
│   │   └── use-order-board.ts
│   ├── api/
│   ├── types/
│   ├── constants/
│   └── index.ts
├── allergy-acknowledgements/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   └── index.ts
├── menu/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   └── index.ts
├── menu-categories/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── stock/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── ordering-windows/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   └── index.ts
└── kot/
    ├── components/
    ├── hooks/
    ├── api/
    ├── types/
    └── index.ts

```

### 10.1 Kitchen Management Frontend Ownership

- Real-time kanban board (New, In Preparation, Ready, Delivered) that receives new orders and state changes over WSS.

- Allergy and dietary acknowledgement before an order can be prepared.

- New-order alert that never flashes more than three times per second.

- Handling of guest cancellations received while an order is in the queue.

- Menu item, category, stock-status and ordering-window administration (Kitchen Manager routes only).

- KOT status and reprint actions (printing itself is handled by the backend and printing service).

- Tablet-first layout: landscape, large touch targets, readable at arm’s length.

## 11. Worker Management Frontend - worker-management/frontend

Primary responsibility: the shared real-time task queue on a mobile device, task claiming and completion, the food-delivery task flow, escalation flags, and shift and performance views. This is a mobile-first PWA.

```text

worker-management/frontend/src/app/
├── manifest.ts
├── offline/page.tsx
├── (auth)/
│   ├── login/page.tsx
│   └── change-password/page.tsx
└── (protected)/
    ├── layout.tsx                        # app shell + bottom navigation
    ├── tasks/
    │   ├── page.tsx                      # shared live queue (default landing)
    │   └── [taskId]/page.tsx
    ├── my-tasks/page.tsx                 # active / claimed tasks
    ├── deliveries/[taskId]/page.tsx      # food-delivery task flow
    ├── shift/page.tsx                    # shift dashboard
    ├── performance/page.tsx
    └── profile/page.tsx

```

```text

worker-management/frontend/src/features/
├── auth/
│   ├── components/
│   │   ├── login-form.tsx
│   │   └── change-password-form.tsx
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   └── index.ts
├── workers/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── tasks/
│   ├── components/
│   │   ├── task-card.tsx
│   │   ├── claim-button.tsx
│   │   └── task-status-badge.tsx
│   ├── hooks/
│   ├── api/
│   ├── types/
│   ├── constants/
│   └── index.ts
├── task-queue/
│   ├── components/
│   │   └── task-queue-list.tsx
│   ├── hooks/
│   │   └── use-task-queue.ts
│   ├── types/
│   └── index.ts
├── assignments/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   └── index.ts
├── escalations/
│   ├── components/
│   │   └── escalation-flag.tsx
│   ├── hooks/
│   ├── types/
│   └── index.ts
├── food-deliveries/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
├── shifts/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── types/
│   └── index.ts
└── performance/
    ├── components/
    ├── hooks/
    ├── api/
    ├── types/
    └── index.ts

```

Subsystem-specific additions (PWA files are described in section 16):

```text

worker-management/frontend/src/lib/
└── device/
    └── haptics.ts                        # vibration feedback on successful claim

```

### 11.1 Worker Management Frontend Ownership

- Live task queue: new tasks, claim events by other workers and escalation flags appear without a refresh.

- Task claim with haptic feedback where the device supports vibration, and display of the active-task limit.

- Task progress updates and completion.

- Food-delivery task flow triggered by ready orders.

- Shift dashboard and performance view.

- PWA install and offline experience.

- The Manager role has read-only access to this application.

## 12. Authentication and Authorization Standard

Authentication remains centralized in the Auth Service (see the backend standard). Frontends only present the screens and consume the resulting session. They must never issue, sign or decode tokens for security decisions.

- Screens only. Login, registration and first-login password change forms call the Auth Service through the API Gateway. Keep them in features/auth/.

- Token storage. The token lives in an HTTP-only, Secure, SameSite cookie set by the Auth Service. JavaScript never reads or writes it. Do not store JWTs in localStorage or sessionStorage. (The SDS permits a cookie or localStorage; this standard selects the cookie.)

- Role for display only. The frontend loads the current user and role from the Auth Service session endpoint into AuthProvider and uses it to show, hide or redirect. The backend RBAC check is the real authority.

- Two guard levels. middleware.ts does the coarse check (session present, role allowed for the path prefix). The (protected)/layout.tsx does the fine-grained role check. The prefix-to-role map lives only in lib/auth/route-access.ts.

- First login. Staff whose password must be changed are redirected to /change-password until it is done.

- Expiry. Staff tokens last 8 hours and guest tokens 24 hours or until checkout, with no silent refresh. On a 401 response the client clears its session state and redirects to login (or to /session-expired in food-ordering).

- food-ordering. No login screen. The QR token at /access/[token] is exchanged for a room-linked guest session.

Roles and the frontends they can use (from the SDS role table):

| Role            | Frontend access                                                          | Notes                                                                                     |
| --------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| GUEST           | food-ordering                                                            | Room-linked session via QR; the hotel-website guest area uses the registered-guest login. |
| RECEPTIONIST    | front-desk                                                               | Full access to front-desk routes.                                                         |
| KITCHEN_STAFF   | kitchen-management                                                       | Orders and allergy acknowledgement only.                                                  |
| KITCHEN_MANAGER | kitchen-management, manager-dashboard (partial)                          | Menu, stock, categories and ordering windows.                                             |
| WORKER          | worker-management                                                        | Tasks, deliveries, shift and performance.                                                 |
| MANAGER         | manager-dashboard, front-desk (read-only), worker-management (read-only) | Analytics, promotions, staff, complaints, reports.                                        |

## 13. API Access Standard

- All requests go to the API Gateway base URL from config/env.ts. A frontend never calls another subsystem’s backend directly and never hard-codes a service hostname.

- lib/api/api-client.ts is the only fetch wrapper. It sends credentials, uses JSON (UTF-8), normalises errors into ApiError and handles 401 centrally.

- Each feature exposes typed functions in api/&lt;feature&gt;.api.ts. Hooks wrap them (server-state library recommended, section 15).

- Request and response types mirror the backend response DTOs, never the database entities.

- Timestamps arrive as ISO-8601 UTC and are converted only at display time in date.util.ts. Money follows the backend convention and is formatted only in currency.util.ts.

- Backend error codes map to specific messages in lib/constants/error-codes.constants.ts. Messages appear next to the field and are announced through ARIA.

- Never build SQL, HTML or URLs from raw user input; rely on framework escaping. dangerouslySetInnerHTML is not allowed.

## 14. Real-Time Communication Standard

The backend standard keeps one common real-time platform. The frontend mirrors that: one connection per browser tab, shared by all features.

```text

lib/realtime/
├── socket-client.ts          # single Socket.IO client via the gateway WSS endpoint
├── reconnect-policy.ts       # exponential backoff, maximum five attempts
└── realtime-event-names.ts   # mirrors backend event-names.constants.ts

providers/
└── realtime-provider.tsx     # opens/closes the connection with the auth session

hooks/
└── use-realtime-event.ts     # feature hooks subscribe through this

```

- No feature or component opens its own socket.

- After five failed reconnect attempts, show the connection-status banner with a manual retry and fall back to refetching data.

- Real-time events update the same cache the REST hooks use, so the screen has one source of truth.

- Event handlers stay light: updates must appear within one second of the triggering event.

- Announce changes through aria-live=‘polite’ regions, and role=‘alert’ for escalations.

| Frontend           | Live data received                                              |
| ------------------ | --------------------------------------------------------------- |
| kitchen-management | New orders and order state transitions (kanban board).          |
| worker-management  | New tasks, claim events by other workers, escalation flags.     |
| front-desk         | Room status changes and escalation alerts (notification badge). |
| manager-dashboard  | Live operational metrics on analytics panels.                   |
| food-ordering      | Order status and service request status for the guest.          |
| hotel-website      | None required; uses REST only.                                  |

## 15. State, Forms and Styling Standard

The SDS fixes the framework (Next.js) but not the supporting libraries. The folder standard works with any of them, but choose once and use the same set in all six frontends.

| Concern                | Recommended choice                                                                                       | Where it lives                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Server state / caching | TanStack Query                                                                                           | providers/query-provider.tsx, feature hooks/, lib/api/query-keys.ts |
| Local UI state         | React state and Context; a small store only where a feature needs it across pages (for example the cart) | Inside the feature                                                  |
| Forms                  | React Hook Form                                                                                          | Feature components/                                                 |
| Validation             | Zod schemas mirroring backend DTO rules                                                                  | Feature schemas/                                                    |
| Styling                | Tailwind CSS with design tokens                                                                          | styles/tokens.css, components/ui/                                   |
| Charts                 | Recharts (manager-dashboard only)                                                                        | components/charts/                                                  |
| Testing                | Jest, React Testing Library, jest-axe, MSW                                                               | Section 18                                                          |

Validation: Client-side validation is for usability only. The backend validates every request again (multi-layer validation in SDS chapter 6).

## 16. PWA Standard (food-ordering and worker-management)

Only the two mobile-first frontends are PWAs. hotel-website, manager-dashboard, front-desk and kitchen-management do not register a service worker.

```text

frontend/
├── public/
│   ├── sw.js
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       └── icon-maskable-512.png
└── src/
    ├── app/
    │   ├── manifest.ts
    │   └── offline/page.tsx
    └── lib/
        └── pwa/
            ├── register-service-worker.ts
            └── use-install-prompt.ts

```

- The manifest sets the app name, standalone display, start URL, theme colour and the icons above.

- The service worker caches static assets and the app shell only. It never caches authenticated API responses, orders, tasks or personal data.

- The offline page explains that live features need a connection and offers a retry.

- Touch targets are at least 44 × 44 px and primary navigation sits within thumb reach.

## 17. Accessibility and UI Standard (WCAG 2.1 AA)

The SDS requires WCAG 2.1 Level AA in all six subsystems. The rules below are built into the common skeleton so individual features inherit them.

| Rule                                                                         | Where it is implemented                     |
| ---------------------------------------------------------------------------- | ------------------------------------------- |
| &lt;html lang="en"&gt; on every page                                         | app/layout.tsx                              |
| Visible label on every form field (not placeholders only)                    | components/forms/form-field.tsx             |
| Contrast of at least 4.5:1 for body text and 3:1 for large text and UI parts | styles/tokens.css                           |
| Colour is never the only indicator (room and order states carry text labels) | Status badge components                     |
| Touch targets of at least 44 × 44 px                                         | components/ui/button.tsx and other controls |
| Pages reflow at 320 px without horizontal scrolling                          | Layout components and page review           |
| Full keyboard operation and visible focus                                    | components/ui/ and globals.css              |
| Specific error messages next to the field, announced through ARIA            | form-error-message.tsx                      |
| Live regions for real-time updates                                           | Realtime-aware feature components           |
| No flashing more than three times per second                                 | kitchen-management new-order alert          |
| Live countdown and extension warning for the 10-minute order cancellation    | food-ordering cancellation-timer.tsx        |
| Booking review page before final submission                                  | hotel-website booking/review                |

## 18. Testing Structure

```text

frontend/
├── src/
│   └── features/
│       └── orders/
│           ├── components/
│           │   ├── order-card.tsx
│           │   └── order-card.test.tsx
│           └── hooks/
│               ├── use-orders.ts
│               └── use-orders.test.ts
│
└── tests/
    ├── fixtures/
    ├── mocks/
    │   ├── handlers.ts
    │   └── server.ts
    └── utils/
        └── render-with-providers.tsx

```

- Unit and component tests stay next to the code they test, named &lt;file&gt;.test.ts or &lt;file&gt;.test.tsx.

- Follow the course pattern: Arrange-Act-Assert with Given-When-Then test names. Test behaviour, not implementation.

- Coverage on new code is at least 80%, generated by the CI pipeline and linked in each sprint review.

- Mock the API at the network layer (MSW handlers in tests/mocks/) so hooks and components run against realistic responses.

- Run automated accessibility checks (jest-axe) on key screens.

- End-to-end and cross-service journeys (for example booking to payment, order placed to delivered) live in the tests repository, not in frontend/.

## 19. Environment and Secret Management

```text

frontend/
├── .env.example      # committed - keys only / safe examples
└── .env.local        # local values - NEVER commit

```

A typical .env.example may include:

```text

NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_WS_URL=

# Only in subsystems that need them:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=

```

- Every NEXT_PUBLIC_ value is bundled into the browser. Never place a secret (Stripe secret key, SendGrid key, JWT secret, database URL) in a frontend variable.

- All variables are read and validated once in config/env.ts.

- NEXT_PUBLIC_ values are fixed at build time. Because the design requires identical images across development, staging and production, prefer relative gateway paths (for example a path such as /api instead of a full hostname) so one image can be promoted unchanged.

## 20. Files Every Frontend Repository Must Contain

```text

frontend/
├── .env.example
├── .gitignore
├── Dockerfile
├── README.md
├── eslint.config.mjs
├── jest.config.ts
├── jest.setup.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── public/
├── src/
└── tests/

```

Never commit generated or secret material such as:

```text

.env
.env.local
node_modules/
.next/
out/
coverage/
*.log
.DS_Store
Thumbs.db

```

## 21. Web vs Tablet vs Mobile/PWA

The delivery mode changes the layout and the PWA files. It does not create a second frontend or a different folder standard.

| Repository         | Client Type            | Exposure             | PWA | Primary Screens                                     |
| ------------------ | ---------------------- | -------------------- | --- | --------------------------------------------------- |
| hotel-website      | Public Web             | Public internet      | No  | Rooms, availability, booking, payment, my bookings  |
| manager-dashboard  | Internal Web (desktop) | Hotel internal Wi-Fi | No  | Analytics, revenue, staff, promotions, reports      |
| front-desk         | Internal Web (desktop) | Hotel internal Wi-Fi | No  | Room board, check-in/out, reservations, escalations |
| food-ordering      | Mobile-first PWA       | Public internet      | Yes | Menu, cart, orders, service requests, complaints    |
| kitchen-management | Tablet / Web           | Hotel internal Wi-Fi | No  | Kanban board, menu, stock, ordering windows, KOT    |
| worker-management  | Mobile-first PWA       | Hotel internal Wi-Fi | Yes | Task queue, my tasks, deliveries, shift             |

## 22. Team Naming and Consistency Rules

- All repositories use the same top-level src/ folder names.

- Use kebab-case for folder and file names, PascalCase for React components and TypeScript types, and camelCase for functions and variables.

- File suffixes: &lt;feature&gt;.api.ts, &lt;name&gt;.schema.ts, &lt;name&gt;.type.ts, &lt;name&gt;.constants.ts, &lt;name&gt;.util.ts, use-&lt;name&gt;.ts for hooks and &lt;file&gt;.test.ts(x) for tests.

- Use plural folder names: components, hooks, schemas, types, constants and utils.

- One exported component per file. Prefer named exports; default exports only where Next.js requires them.

- Feature folder names mirror the backend module names where one exists.

- Do not create miscellaneous folders such as helpers2/, temp/, common-components/ or utils2/ to bypass the standard.

- Do not put business rules or fetch calls inside page.tsx or components; use feature hooks and the api/ layer.

- Do not duplicate central Auth Service logic in any frontend.

- Do not open independent WebSocket connections in features; use the shared real-time layer.

- Every new feature starts as a folder under src/features/ unless it is clearly a cross-cutting concern.

## 23. Recommended Root Layout and Provider Composition

```text

// src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

// src/providers/app-providers.tsx
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <RealtimeProvider>   {/* omitted in hotel-website */}
          {children}
        </RealtimeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

```

Each subsystem mounts a slightly different set of providers, but the composition point stays the same in all six.

## 24. What Should NOT Be Done

```text

# Do NOT split one subsystem frontend by client type:
frontend-web/
frontend-mobile/

# Do NOT call fetch/axios directly from pages or components:
src/app/orders/page.tsx     -> fetch('/api/orders')

# Do NOT call another subsystem's backend directly - always use the API Gateway.

# Do NOT duplicate central identity logic per feature:
src/features/orders/hooks/use-login.ts
src/lib/auth/token-issuer.ts

# Do NOT store JWTs in localStorage or sessionStorage.

# Do NOT open a Socket.IO connection per feature or component.

# Do NOT put all UI code in one flat folder with no feature boundaries:
src/components/   (200 files)

# Do NOT import code across repositories:
import { Button } from '../../other-subsystem/frontend/src/components/ui/button'

# Do NOT put secrets in NEXT_PUBLIC_ variables.

# Do NOT commit:
.env.local
node_modules/
.next/
coverage/

```

## 25. Final Standard to Give the Whole Team

Every subsystem frontend must use this common top-level structure:

```text

src/
├── app/
├── components/
├── config/
├── features/
├── hooks/
├── lib/
├── providers/
├── styles/
├── types/
└── middleware.ts

```

Only the contents of app/ and features/, plus a few subsystem-specific additions (lib/stripe/, components/charts/, lib/pwa/, lib/device/), change. This keeps the Forever Hotel codebase consistent across Hotel Website, Manager Dashboard, Front Desk, Food Ordering/Guest App, Kitchen Management and Worker Management.

## 26. Source Alignment Notes

This implementation standard was prepared from the Forever Hotel Software Design Specification (version 1.0), the SENG 34213 course guideline and the Standard Backend Folder Structure. The design specifies six independently deployable subsystems, Next.js SPA/PWA frontends, a single API Gateway, WebSocket-based real-time behaviour, JWT/RBAC security and WCAG 2.1 AA accessibility. It identifies food-ordering and worker-management as PWAs and kitchen-management as tablet-oriented.

Where the design specifies responsibilities but not literal source-code folder names, this document introduces consistent Next.js conventions so the team can implement the design uniformly. Route names, feature lists and library choices are recommendations derived from the SDS user flows and the backend module list.

Decisions the team should confirm:

| Topic                                                             | Why it matters                                                                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Payment step (Stripe Checkout redirect or embedded PaymentIntent) | SDS flow HW-03 mentions both. It decides the contents of hotel-website features/payments and lib/stripe.         |
| Where the shared real-time service lives                          | Frontends connect through the gateway WSS endpoint; the location of the service must match the backend standard. |
| Linter configuration at the repository root                       | Course guideline section 5.2 requires it; see the note in section 2.                                             |
| Styling and state libraries                                       | Recommendations in section 15 should be confirmed once and applied to all six frontends.                         |
| Session endpoint contract with the Auth Service                   | AuthProvider and middleware depend on the agreed session/current-user endpoint and cookie settings.              |
