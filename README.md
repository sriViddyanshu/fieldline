# Fieldline

Fieldline is a new, standalone asset-operations application. It has its own
Angular UI, Node.js API, and MySQL schema. It does not import Yard's code,
database, or records.

## Requirements

- Node.js 22.13 or newer (current LTS recommended)
- npm installed with Node.js
- MySQL 8.0 or newer (manage the database with MySQL Workbench)

## Set up the database in MySQL Workbench

1. Connect to the intended MySQL server and select the `fieldline` schema.
2. To add sign-in to an existing Fieldline database, open and run
   `database/auth-migration.sql`. It creates only the authentication tables,
   preserves existing records, and reports the selected database and server.
3. For an existing Fieldline database, open and run
   `database/vehicle-fleet-migration.sql` once. It adds vehicle fields and
   effective-dated history tables without deleting or changing existing asset
   IDs. Existing Device and Other rows remain in MySQL but are excluded from
   the vehicle interface. Existing rows categorized as `Vehicle` stay visible
   until they are assigned a supported vehicle type.
4. Open and run `database/fleet-operations-migration.sql` after the core schema
   and vehicle fleet schema are present. It creates separate customer,
   contract, driver and driver-assignment, toll, violation, payment,
   maintenance, trip, task, approval, and activity-log tables. It uses
   `CREATE TABLE IF NOT EXISTS` so it can safely be re-run.
5. If the vehicle schema was installed before unknown plate-history start dates
   were supported, run `database/vehicle-master-import-migration.sql`. It allows
   the start date of a current plate to remain unknown rather than inventing a
   date.
6. To store toll payment events, account ledger entries, and balance snapshots,
   run `database/toll-payment-history-migration.sql` after the fleet operations
   migration.
7. For an existing installation with toll accounts, run
   `database/toll-account-master-migration.sql` once to add structured account
   holder, billing, replenishment, balance, and sync fields before importing
   the account master workbook. Fresh databases receive these fields from the
   fleet operations migration.
8. For an existing installation with toll transactions, run
   `database/historical-violations-migration.sql` once before importing
   violation history. Fresh databases receive these fields from the fleet
   operations migration.
9. For a fresh database, run `database/schema.sql` first, then
   `database/fleet-operations-migration.sql`,
   `database/toll-payment-history-migration.sql`, and
   `database/historical-violations-migration.sql`.
10. If the Workbench account cannot create tables, ask a DBA to run the
   appropriate script against the `fieldline` database.
11. Ask the DBA to create a dedicated `fieldline_app` user scoped to the machine
   running Fieldline and grant it only `SELECT`, `INSERT`, `UPDATE`, and
   `DELETE` on `fieldline.*`. The app does not need schema-creation privileges.
   Never run the app with the MySQL root account.
12. For the larger fleet-management demo, open and run
   `database/fleet-test-data.sql` after applying the fleet operations migration.
   It creates ten clearly labeled fictional vehicles and linked records for
   customer, contract, driver, toll, case, payment, maintenance, trip, approval,
   and activity workflows. Names and routes are demo-only, contact emails use
   the reserved `example.test` domain, and contact numbers use fictional
   202-555-01xx values. Re-running it refreshes only its stable demo fixture
   records; it does not delete or overwrite operational records.
   The smaller `database/demo-data.sql` remains available for a basic workspace
   demo.

## Run in development

Install the JavaScript dependencies once:

```powershell
cd fieldline
npm install
```

Set the connection settings in the API terminal before starting it:

```powershell
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3306'
$env:DB_NAME = 'fieldline'
$env:DB_USER = 'fieldline_app'
$secret = Read-Host 'Fieldline database password' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  npm run dev:api
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
}
```

The prompt keeps the password out of shell history and project files. Use the
same approach with a secure service secret store for a persistent deployment.

In a second terminal, start the Angular development server:

```powershell
cd fieldline
npm run dev:web
```

Open `http://localhost:4200`. On first use, go to `/setup` to create the
workspace's first administrator account. Once setup is complete, sign in at
`/login`. The Angular development server proxies API calls to the Node server
on `127.0.0.1:3001`.

## Build and run

```powershell
cd fieldline
npm install
npm run build
npm start
```

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` for the
Node process before `npm start`. Use the DBA-created app account, not `root`.
Open `http://127.0.0.1:3001`; the first visit redirects to `/setup` until the
first administrator account has been created. The initial account can only be
created once; additional-user management is not included yet. Sign-in sessions
expire after 12 hours. Set `COOKIE_SECURE=true`
when serving the app over HTTPS; keep the API on localhost otherwise.

## Vehicle fleet and supporting sections

The vehicle register supports trucks, cars, trailers, and equipment. Each
vehicle retains its existing UUID so work orders and incidents continue to
reference the same record. Vehicle master data covers internal and fleet IDs,
VIN, make/model/year, color, fuel, lifecycle status, owner/lease/FMC, fleet
membership, acquisition, and lease dates.

Each vehicle has separate histories for effective-dated ownership and fleet
membership, license plates and registration, customer/driver/pool/site
assignments and handovers, lifecycle events, dated odometer readings, and
linked title, registration, lease, inspection, insurance, handover, sale, and
theft documents. Document links can be reused as registration, handover, or
event evidence. Assignments explicitly support both Assigned and Unassigned
periods.

Fleet features are separate pages: customer accounts; contracts and charge
responsibility; driver records and dated vehicle assignments; toll accounts,
transponders, and transactions; violation/dispute cases; authority payments and
customer chargebacks; maintenance/inspection schedules; trip evidence; tasks
and approvals; and the activity log. Driver license details are not collected
because the current workflows do not require them. Telematics trips and
documents are manually entered as records or links; no provider, AI agent, or
UiPath integration is connected.

The append-only activity log records create, update, and delete operations for
vehicles, vehicle history, fleet modules, work orders, incidents, and sites.
It stores the signed-in person, action, record type, time, and before/after
values. The actor type supports person, backend, Agentic AI, and UiPath; current
interactive changes are recorded as person actions. Activity records cannot be
edited or deleted through the application.

Vehicles, fleet setup, toll operations, maintenance, trips, tasks, approvals,
activity, Sites, Work orders, Incidents, Overview, and Settings are exposed as
separate pages. Sites, Work orders, and Incidents remain supporting modules;
their vehicle selectors only offer managed vehicles. Legacy Device and Other
rows are retained in the database, not shown as vehicles, and are never
deleted or silently recategorized.

Apply the vehicle and fleet-operations migrations before starting the API
against an existing database. The API checks for these tables and reports a
clear startup error if the migrations are missing.

To populate the UI for testing, run `database/fleet-test-data.sql` in Workbench
after both fleet migrations. Its plausible-looking records are explicitly
marked `(Demo)` and use synthetic VINs, plates, account references, and
document numbers. The script reports the number of records in each test module
at the end.

## Data and sections

The API connects to MySQL using `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and
`DB_PASSWORD`. The schema is also provided as `database/schema.sql` for
inspection and management in MySQL Workbench. No Yard database or credentials
are read or copied.

Angular structure:

```text
src/app/
  app.component.ts                 # Auth-aware workspace shell and navigation
  auth.component.ts                # First-admin setup and sign-in forms
  navigation.ts                    # Section labels and navigation groups
  theme.service.ts                 # Persisted light/dark theme
  pages/
    overview/overview.component.ts  # Summary cards and workspace shortcuts
    vehicles/vehicles-page.component.ts # Vehicle register and history modules
    fleet/fleet-module-page.component.ts # Separate configured operational module pages
    records/records.component.ts    # Reusable CRUD forms for supporting records
    assets/                          # Legacy route wrapper for vehicle management
    sites/                           # Dedicated sites page
    work-orders/                     # Dedicated work orders page
    incidents/                       # Dedicated incidents page
    locations/                       # Dedicated locations page
    map/                             # Dedicated map page
    telemetry/                       # Dedicated telemetry page
    dashboards/                      # Dedicated dashboards page
    field/                           # Dedicated field operations page
    automations/                     # Dedicated automations page
    playbooks/                       # Dedicated playbooks page
    cost/                            # Dedicated cost tracking page
    integrations/                    # Dedicated integrations page
    administration/                  # Dedicated administration page
    diagnostics/                     # Dedicated diagnostics page
    getting-started/                 # Dedicated onboarding page
    settings/settings.component.ts # Appearance and workspace preferences
    workspace/workspace-pages.component.ts # Shared layout for workspace pages
```

The vehicle register and its six history areas have working create, edit, and
filter flows; vehicles are retired through lifecycle status rather than
deleted. Each fleet-operations module has its own route, fields, and records
table while sharing reusable form behavior. Sites, work orders, and incidents
retain their supporting CRUD pages.

The Node API binds to localhost by default. Data API endpoints require a valid
sign-in session. The light/dark appearance preference is saved in the current browser. Configure
a reviewed reverse proxy and HTTPS before making an installation available to
other computers.
