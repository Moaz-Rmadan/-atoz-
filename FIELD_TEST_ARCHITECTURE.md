# Kafrawy Go — Field Test Architecture & Audit Report

## 1. Executive Summary
This document outlines the architectural audit and testing framework for **Kafrawy Go**, the mobility and ride-hailing subsystem within the Kafrawy Super App platform. The Field Test Console provides a comprehensive, automated test lab designed to perform **30 rigorous field validation tests** across authentication, GPS telemetry, routing, fare security, state-machine transitions, Supabase Row-Level Security (RLS), real-time synchronization, and build integrity.

---

## 2. Architectural Audit

### 2.1 Frontend & Runtime Architecture
- **Framework:** React 18+ with TypeScript in strict mode.
- **Bundler & Tooling:** Vite, Tailwind CSS v4, ES Module system.
- **Animation & Physics:** `motion/react` layout animations, spring transitions.
- **Typography & Localization:** RTL-first layout with `IBM Plex Sans Arabic` for typography and `JetBrains Mono` for telemetry and numerical metrics.
- **State & Context Management:** `AuthContext` (Supabase Auth) and `ToastContext` for user feedback.

### 2.2 Backend & Supabase Architecture
- **Database Schema:**
  - `public.profiles`: Customer identity and role assignments.
  - `public.drivers`: Captain records with `national_id`, `license_number`, `approval_status`, `is_online`, `rating_average`.
  - `public.vehicles`: Registered vehicles bound to approved drivers.
  - `public.rides`: Ride requests, geographic coordinates (`pickup_latitude`, `pickup_longitude`, `dropoff_latitude`, `dropoff_longitude`), calculated fares, and lifecycle status (`requested`, `driver_assigned`, `arrived`, `in_transit`, `completed`, `cancelled`).
  - `public.ride_status_history`: Immutable transition log for ride lifecycle state tracking.
  - `public.ride_location_updates`: Telemetry stream capturing driver coordinates, headings, and timestamps.
  - `public.audit_logs`: Administrative governance log with `actor_id`, `action`, `target_entity`, and JSON diffs.
- **Row-Level Security (RLS):**
  - Fine-grained isolation ensuring customers only access their own rides and history.
  - Drivers can view requested/assigned rides and update only their assigned rides.
  - `ride_location_updates` protected to allow insertion only by assigned approved drivers.
- **PostgreSQL Functions & Triggers:**
  - `calculate_ride_fare()`: Server-side trigger calculating baseline and bounding fares before insert.
  - `log_ride_audit()`: Automated audit trigger recording state changes.

### 2.3 Kafrawy Go Subsystem Services
1. **`mobilityApi.ts`**: High-level interface providing Supabase data operations (requesting rides, accepting rides, updating status, fetching active rides, fetching driver/customer histories).
2. **`fareEngine.ts`**: Pure mathematical pricing engine (Base Fare: 12 EGP, 6.50 EGP/km, 0.80 EGP/min, Booking Fee: 5 EGP, Floor Minimum: 20 EGP, Dynamic Surge Multiplier).
3. **`mapService.ts`**: Real-world OSRM routing engine and Nominatim geocoder contextualized for Kafr El-Sheikh, Egypt.
4. **`geolocationService.ts`**: Device GPS interface handling permissions, coordinate validation, accuracy thresholds, and Arabic error mapping.
5. **`driverLocationService.ts`**: Background watcher with throttling for publishing driver telemetry.

---

## 3. Field Test Suite Structure (30 Tests)

| # | Test Name | Category | Verification Target |
|---|---|---|---|
| 01 | Authentication Session | AUTH | Validates active Supabase session and real authenticated user ID. |
| 02 | Customer Profile Ownership | AUTH | Checks current user's profile existence and data integrity. |
| 03 | Captain Profile Status | AUTH | Detects captain profile and verifies status (Approved / Pending / Non-Captain). |
| 04 | Captain Approval State | AUTH | Verifies captain approval lifecycle state. |
| 05 | GPS Geolocation API | GPS | Tests browser `navigator.geolocation` and permission state. |
| 06 | Real GPS Coordinates | GPS | Captures live device coordinates (lat, lng, accuracy, timestamp). |
| 07 | GPS Accuracy Threshold | GPS | Ensures device accuracy meets <= 100m threshold for ride tracking. |
| 08 | GPS Telemetry Freshness | GPS | Rejects stale coordinates (>60 seconds old). |
| 09 | Nominatim Geocoding | GEOCODING | Geocodes Kafr El-Sheikh landmarks to absolute spatial coordinates. |
| 10 | OSRM Road Routing | ROUTING | Calculates live road path between coordinates in Kafr El-Sheikh. |
| 11 | Road vs Direct Distance | ROUTING | Verifies routing distance reflects actual street geometry (Road >= Haversine). |
| 12 | ETA Calculation Validity | ETA | Validates trip duration and ensures ETA is non-negative and finite. |
| 13 | Fare Engine Matrix | FARE | Tests base fare, km rate, min rate, service fee, and surge formulas. |
| 14 | Fare Anti-Tampering | FARE / SECURITY | Verifies client-injected arbitrary prices are intercepted and overridden. |
| 15 | Fare Boundary Conditions | FARE | Tests 0km, ultra-short, long distance, and zero-division bounds. |
| 16 | Ride Creation Contract | RIDE | Tests ride request structure and field validation under mutation safety rules. |
| 17 | Multi-Tenant Ride RLS | SECURITY | Verifies user cannot view or mutate another tenant's ride. |
| 18 | Captain Online Toggle | RIDE | Tests driver availability toggle and eligibility rules. |
| 19 | Ride Acceptance Rules | RIDE | Validates acceptance constraints (must be requested, valid vehicle). |
| 20 | Atomic Acceptance Lock | CONCURRENCY | Verifies single-driver lock on ride claim preventing dual assignments. |
| 21 | Legal State Transitions | STATE_MACHINE | Tests linear sequence (`requested` → `driver_assigned` → `arrived` → `in_transit` → `completed`). |
| 22 | Illegal State Rejections | STATE_MACHINE | Ensures invalid jumps (e.g. `requested` → `completed`) are blocked. |
| 23 | Passenger Realtime Stream | REALTIME | Verifies Supabase Realtime channel attachment for customer rides. |
| 24 | Captain Realtime Stream | REALTIME | Verifies Supabase Realtime channel attachment for dispatch feeds. |
| 25 | State Synchronization | REALTIME | Checks event dispatcher and state-sync pipeline without page reloads. |
| 26 | Driver Location Broadcast | LOCATION_STREAM | Verifies location broadcast rules (only assigned drivers on active rides). |
| 27 | Ride Rating Integrity | RATING | Validates rating scale [1-5], single submission, and ride ownership. |
| 28 | Ride History Privacy | SECURITY | Verifies ride history query isolates user records from third parties. |
| 29 | Audit Trail Logging | AUDIT | Verifies administrative audit log recording sensitive actions. |
| 30 | Production Bundle Integrity | BUILD | Validates TypeScript compilation, env bindings, and clean exports. |

---

## 4. Safety & Mutation Policies
- **`VITE_FIELD_TEST_ALLOW_MUTATIONS`**: Configurable environment variable. When set to `false`, non-destructive read/simulation tests are executed, preserving production database integrity.
- **Zero Mock Pass Policy**: Simulated or unavailable real-device states (such as missing GPS permissions in headless CI) are marked explicitly as `WARN` or `SKIPPED` with actionable diagnostic messages, never as synthetic `PASS`.
- **No Service Role Exposure**: All client-side tests run strictly under the active user's JWT / anonymous context without bypassing RLS.
