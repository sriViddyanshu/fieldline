import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import mysql from "mysql2/promise";

const scrypt = promisify(scryptCallback);
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const staticDir = resolve(process.env.FIELDLINE_STATIC_DIR || join(root, "dist", "fieldline", "browser"));
const port = Number(process.env.PORT || 3001);
const dbName = process.env.DB_NAME || "fieldline";
const sessionLifetimeSeconds = 12 * 60 * 60;
const failedLogins = new Map();
const setupRequests = new Map();
const passwordHashFormat = "scrypt";
const dummyPasswordSalt = Buffer.from("fieldline-invalid-user-salt");

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port");
if (!/^[a-zA-Z0-9_]+$/.test(dbName)) throw new Error("DB_NAME may contain only letters, numbers, and underscores");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "fieldline_app",
  password: process.env.DB_PASSWORD || "",
  database: dbName,
  waitForConnections: true,
  connectionLimit: 5,
  charset: "utf8mb4",
});

const tables = {
  assets: { table: "assets", fields: ["name", "category", "external_ref", "manufacturer", "model", "serial", "site_id", "status"], required: ["name"] },
  sites: { table: "sites", fields: ["name", "site_type", "address", "status"], required: ["name"] },
  "work-orders": { table: "work_orders", fields: ["title", "asset_id", "priority", "assigned_to", "due_date", "status"], required: ["title"] },
  incidents: { table: "incidents", fields: ["title", "asset_id", "severity", "description", "status"], required: ["title"] },
};

const vehicleTypes = ["Truck", "Car", "Trailer", "Equipment"];
const vehicleStatuses = ["In service", "In yard", "Out for maintenance", "Stolen", "Recovered", "Sold", "Returned to lessor", "Retired"];
const vehicleMaster = {
  table: "assets",
  fields: [
    "name", "category", "vehicle_type", "internal_asset_id", "fleet_unit_number", "vin", "manufacturer", "model", "year",
    "color", "fuel_type", "ownership_type", "legal_owner", "leasing_company", "managing_fmc", "fleet_entry_date",
    "fleet_exit_date", "acquisition_date", "lease_start_date", "lease_end_date", "site_id", "status",
  ],
  required: ["name", "vehicle_type", "internal_asset_id", "status"],
  nullable: ["vin", "year", "fleet_entry_date", "fleet_exit_date", "acquisition_date", "lease_start_date", "lease_end_date", "site_id"],
};
const vehicleHistory = {
  ownership: {
    table: "vehicle_ownership",
    fields: ["legal_owner", "leasing_company", "managing_fmc", "ownership_type", "fleet_entry_date", "fleet_exit_date", "acquisition_date", "lease_start_date", "lease_end_date", "effective_start", "effective_end"],
    required: ["effective_start"],
    nullable: ["fleet_entry_date", "fleet_exit_date", "acquisition_date", "lease_start_date", "lease_end_date", "effective_end"],
  },
  registrations: {
    table: "vehicle_registrations",
    fields: ["plate_number", "issuing_state", "plate_type", "registration_expiration", "effective_start", "effective_end", "document_id"],
    required: ["plate_number"],
    nullable: ["registration_expiration", "effective_start", "effective_end", "document_id"],
  },
  assignments: {
    table: "vehicle_assignments",
    fields: ["customer", "contract", "assignment_status", "assigned_driver", "driver_pool", "branch", "yard", "assignment_start", "assignment_end", "handover_notes", "handover_document_id"],
    required: ["assignment_start"],
    nullable: ["assignment_end", "handover_document_id"],
    values: { assignment_status: ["Assigned", "Unassigned", "Ended", "Suspended"] },
  },
  events: {
    table: "vehicle_events",
    fields: ["event_type", "effective_at", "reason", "report_reference", "reported_start", "reported_end", "recovery_at", "handover_at", "evidence_document_id"],
    required: ["event_type", "effective_at"],
    nullable: ["reported_start", "reported_end", "recovery_at", "handover_at", "evidence_document_id"],
    values: { event_type: ["In service", "In yard", "Out for maintenance", "Stolen", "Recovered", "Sold", "Returned to lessor", "Retired", "Handover", "Other"] },
  },
  mileage: {
    table: "vehicle_mileage",
    fields: ["reading", "unit", "reading_at", "source", "notes"],
    required: ["reading", "unit", "reading_at", "source"],
    nullable: [],
    values: { unit: ["km", "mi"], source: ["Manual entry", "Service record", "Telematics"] },
  },
  documents: {
    table: "vehicle_documents",
    fields: ["document_type", "reference", "issuing_party", "issue_date", "expiration_date", "file_url"],
    required: ["document_type"],
    nullable: ["issue_date", "expiration_date"],
    values: { document_type: ["Title", "Registration", "Lease", "Inspection", "Insurance", "Handover", "Sale", "Theft", "Other"] },
  },
};

const fleetModules = {
  customers: {
    table: "fleet_customers",
    fields: ["account_number", "name", "operating_location", "contact_name", "email", "phone", "status"],
    required: ["name"],
    nullable: ["account_number"],
    values: { status: ["Active", "Inactive"] },
  },
  contracts: {
    table: "fleet_contracts",
    fields: ["customer_id", "contract_number", "start_date", "end_date", "covered_units", "toll_payer", "violation_payer", "maintenance_payer", "other_charge_payer", "rules_notes", "status"],
    required: ["customer_id", "contract_number"],
    nullable: ["start_date", "end_date"],
    values: { toll_payer: ["Customer", "FMC", "Owner", "Other"], violation_payer: ["Customer", "FMC", "Owner", "Other"], maintenance_payer: ["Customer", "FMC", "Owner", "Other"], other_charge_payer: ["Customer", "FMC", "Owner", "Other"], status: ["Draft", "Active", "Expired", "Terminated"] },
  },
  drivers: {
    table: "fleet_drivers",
    fields: ["driver_id", "customer_id", "employer", "name", "email", "phone", "status"],
    required: ["driver_id", "name"],
    nullable: ["customer_id"],
    values: { status: ["Active", "Inactive", "Suspended"] },
  },
  "driver-assignments": {
    table: "fleet_driver_assignments",
    fields: ["vehicle_id", "driver_id", "customer_id", "contract_id", "assignment_start", "assignment_end", "status", "handover_notes"],
    required: ["vehicle_id", "assignment_start"],
    nullable: ["driver_id", "customer_id", "contract_id", "assignment_end"],
    values: { status: ["Assigned", "Unassigned", "Ended", "Suspended"] },
  },
  "toll-accounts": {
    table: "toll_accounts",
    fields: ["provider", "authority", "account_reference", "account_display_name", "account_holder_legal_name", "account_holder_type", "account_opened", "billing_method", "auto_replenishment", "auto_replenishment_threshold", "last_known_balance", "balance_as_of", "payment_method_status", "fmc_branch", "service_region", "portal_reference", "last_sync_at", "status", "notes"],
    required: ["provider", "account_reference"],
    nullable: ["account_opened", "auto_replenishment_threshold", "last_known_balance", "balance_as_of", "last_sync_at"],
    values: { status: ["Active", "Inactive", "Suspended", "Closed"], auto_replenishment: ["Yes", "No"] },
  },
  transponders: {
    table: "toll_transponders",
    fields: ["toll_account_id", "transponder_id", "vehicle_id", "plate_number", "effective_start", "effective_end", "status"],
    required: ["toll_account_id", "transponder_id", "effective_start"],
    nullable: ["vehicle_id", "effective_end"],
    values: { status: ["Active", "Inactive", "Lost", "Returned"] },
  },
  transactions: {
    table: "toll_transactions",
    fields: ["authority", "toll_account_id", "transponder_id", "vehicle_id", "plate_number", "transaction_reference", "toll_at", "location", "amount", "posting_status"],
    required: ["authority", "transaction_reference", "toll_at", "amount"],
    nullable: ["toll_account_id", "vehicle_id"],
    values: { posting_status: ["Posted", "Pending", "Rejected", "Disputed"] },
  },
  violations: {
    table: "toll_violations",
    fields: ["managing_fmc", "authority", "notice_number", "vehicle_id", "transaction_id", "plate_shown", "event_at", "event_details", "amount", "deadline", "verification_status", "evidence_link", "recommendation", "approval_status", "authority_outcome", "case_status", "case_owner", "next_action"],
    required: ["managing_fmc", "authority", "notice_number"],
    nullable: ["vehicle_id", "transaction_id", "event_at", "amount", "deadline"],
    values: { verification_status: ["Pending", "Verified", "Mismatch", "Needs evidence"], approval_status: ["Pending", "Approved", "Rejected"], authority_outcome: ["", "Paid", "Dismissed", "Reduced", "Upheld", "Appealed"], case_status: ["Open", "In review", "Disputed", "Paid", "Closed"] },
  },
  payments: {
    table: "fleet_payments",
    fields: ["violation_id", "vehicle_id", "customer_id", "payment_type", "paid_party", "payment_reference", "amount", "status", "paid_at", "receipt_link", "reconciliation_notes"],
    required: ["payment_type", "amount"],
    nullable: ["violation_id", "vehicle_id", "customer_id", "paid_at"],
    values: { payment_type: ["Authority payment", "Customer chargeback"], status: ["Pending", "Paid", "Failed", "Reconciled", "Disputed"] },
  },
  maintenance: {
    table: "fleet_maintenance",
    fields: ["vehicle_id", "work_order_id", "service_type", "schedule_date", "due_date", "due_mileage", "mileage_unit", "vendor", "repairs", "cost", "downtime_start", "downtime_end", "inspection_result", "status"],
    required: ["vehicle_id", "service_type"],
    nullable: ["work_order_id", "schedule_date", "due_date", "due_mileage", "cost", "downtime_start", "downtime_end"],
    values: { mileage_unit: ["km", "mi"], inspection_result: ["", "Pass", "Fail", "Advisory"], status: ["Scheduled", "In progress", "Completed", "Overdue", "Cancelled"] },
  },
  trips: {
    table: "fleet_trips",
    fields: ["vehicle_id", "device_id", "assignment_start", "assignment_end", "trip_start", "trip_end", "distance", "distance_unit", "start_location", "end_location", "evidence_link"],
    required: ["vehicle_id", "trip_start"],
    nullable: ["assignment_start", "assignment_end", "trip_end", "distance"],
    values: { distance_unit: ["km", "mi"] },
  },
  tasks: {
    table: "fleet_tasks",
    fields: ["vehicle_id", "violation_id", "case_owner", "next_action", "due_at", "evidence_request", "status"],
    required: ["next_action"],
    nullable: ["vehicle_id", "violation_id", "due_at"],
    values: { status: ["Open", "In progress", "Waiting for evidence", "Completed", "Cancelled"] },
  },
  approvals: {
    table: "fleet_approvals",
    fields: ["task_id", "violation_id", "approver", "decision", "decided_at", "notes"],
    required: ["approver", "decision"],
    nullable: ["task_id", "violation_id", "decided_at"],
    values: { decision: ["Pending", "Approved", "Rejected", "Needs changes"] },
  },
};

async function initializeSchema() {
  await pool.query("SELECT 1");
  try {
    await pool.query("SELECT setup_complete FROM fieldline_auth_config WHERE id = 1");
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      throw new Error("Authentication tables are missing. Ask a DBA to run database/schema.sql before starting Fieldline.");
    }
    throw error;
  }
  try {
    await pool.query("SELECT vehicle_type FROM assets LIMIT 0");
    await pool.query("SELECT id FROM vehicle_events LIMIT 0");
    await pool.query("SELECT id FROM fleet_activity_log LIMIT 0");
    await pool.query("SELECT id FROM fleet_customers LIMIT 0");
    await pool.query("SELECT id FROM fleet_driver_assignments LIMIT 0");
    await pool.query("SELECT id FROM toll_payment_events LIMIT 0");
    await pool.query("SELECT id FROM toll_account_ledger LIMIT 0");
    await pool.query("SELECT id FROM toll_account_balance_snapshots LIMIT 0");
    await pool.query("SELECT source_case_id, payment_event_id FROM toll_violations LIMIT 0");
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE" || error?.code === "ER_BAD_FIELD_ERROR") {
      throw new Error("Vehicle fleet tables are missing. Ask a DBA to run database/vehicle-fleet-migration.sql, database/fleet-operations-migration.sql, and database/toll-payment-history-migration.sql, or use database/schema.sql for a fresh database.");
    }
    throw error;
  }
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 32_768) throw Object.assign(new Error("Request body must be smaller than 32 KB"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
    return value;
  } catch {
    throw Object.assign(new Error("Request body must be a JSON object"), { status: 400 });
  }
}

function cleanInput(body, definition) {
  const input = {};
  for (const key of definition.fields) {
    if (!(key in body)) continue;
    const value = body[key];
    if (value !== null && typeof value !== "string" && typeof value !== "number") {
      throw Object.assign(new Error(`${key} must be a string or number`), { status: 400 });
    }
    const cleaned = String(value ?? "").trim();
    const isDateTime = key.endsWith("_at") || key.startsWith("reported_") || key.startsWith("assignment_");
    input[key] = cleaned === "" && (definition.nullable?.includes(key) || ["site_id", "asset_id", "external_ref", "due_date"].includes(key))
      ? null
      : isDateTime ? cleaned.replace("T", " ") : cleaned;
  }
  for (const field of definition.required) {
    if (!input[field]) throw Object.assign(new Error(`${field} is required`), { status: 400 });
  }
  return input;
}

function getSessionToken(req) {
  const cookies = req.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const [name, ...parts] = cookie.trim().split("=");
    if (name === "fieldline_session") {
      const token = parts.join("=");
      return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
    }
  }
  return null;
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionCookie(token, maxAge) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  return `fieldline_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

async function authenticatedUser(req) {
  const token = getSessionToken(req);
  if (!token) return null;
  const [rows] = await pool.execute(
    `SELECT u.id, u.display_name AS name, u.email, u.role
     FROM fieldline_sessions s
     JOIN fieldline_users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP(3)`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

async function createSession(userId, res) {
  const token = randomBytes(32).toString("base64url");
  await pool.execute(
    "INSERT INTO fieldline_sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 12 HOUR))",
    [hashToken(token), userId],
  );
  res.setHeader("Set-Cookie", sessionCookie(token, sessionLifetimeSeconds));
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function hashPassword(password, salt = randomBytes(16)) {
  const derivedKey = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `${passwordHashFormat}$${salt.toString("base64url")}$${Buffer.from(derivedKey).toString("base64url")}`;
}

async function verifyPassword(password, storedHash) {
  const [format, encodedSalt, encodedKey] = String(storedHash).split("$");
  if (format !== passwordHashFormat || !encodedSalt || !encodedKey) return false;
  const salt = Buffer.from(encodedSalt, "base64url");
  const expected = Buffer.from(encodedKey, "base64url");
  if (salt.length !== 16 || expected.length !== 64) return false;
  const derivedKey = Buffer.from(await scrypt(password, salt, expected.length, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }));
  return timingSafeEqual(derivedKey, expected);
}

function validateCredentials(body, requireName) {
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = body.password;
  if (requireName && (!name || name.length > 120)) {
    throw Object.assign(new Error("Enter your name (up to 120 characters)."), { status: 400 });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("Enter a valid email address."), { status: 400 });
  }
  if (typeof password !== "string" || password.length < (requireName ? 12 : 1) || password.length > 128) {
    throw Object.assign(new Error(requireName ? "Use a password with at least 12 characters." : "Enter your password."), { status: 400 });
  }
  return { name, email, password };
}

function loginIsLimited(req) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const attempts = (failedLogins.get(key) ?? []).filter((time) => now - time < 15 * 60 * 1000);
  failedLogins.set(key, attempts);
  return attempts.length >= 10;
}

function recordFailedLogin(req) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const attempts = (failedLogins.get(key) ?? []).filter((time) => now - time < 15 * 60 * 1000);
  attempts.push(now);
  failedLogins.set(key, attempts);
}

function setupIsLimited(req) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const attempts = (setupRequests.get(key) ?? []).filter((time) => now - time < 15 * 60 * 1000);
  setupRequests.set(key, attempts);
  if (attempts.length >= 5) return true;
  attempts.push(now);
  return false;
}

async function handleAuth(req, res, path) {
  if (path === "/api/auth/status" && req.method === "GET") {
    const [[config]] = await pool.query("SELECT setup_complete FROM fieldline_auth_config WHERE id = 1");
    return sendJson(res, 200, { setupRequired: !config.setup_complete });
  }
  if (path === "/api/auth/me" && req.method === "GET") {
    const user = await authenticatedUser(req);
    if (!user) return sendJson(res, 401, { error: "Authentication required" });
    return sendJson(res, 200, { user: publicUser(user) });
  }
  if (path === "/api/auth/logout" && req.method === "POST") {
    const token = getSessionToken(req);
    if (token) await pool.execute("DELETE FROM fieldline_sessions WHERE token_hash = ?", [hashToken(token)]);
    res.setHeader("Set-Cookie", sessionCookie("", 0));
    return sendJson(res, 200, { loggedOut: true });
  }
  if (path === "/api/auth/setup" && req.method === "POST") {
    if (setupIsLimited(req)) return sendJson(res, 429, { error: "Too many setup attempts. Try again in 15 minutes." });
    const { name, email, password } = validateCredentials(await readJson(req), true);
    const passwordHash = await hashPassword(password);
    const connection = await pool.getConnection();
    let user;
    try {
      await connection.beginTransaction();
      const [[config]] = await connection.query("SELECT setup_complete FROM fieldline_auth_config WHERE id = 1 FOR UPDATE");
      if (!config || config.setup_complete) {
        await connection.rollback();
        return sendJson(res, 403, { error: "Initial setup is already complete. Sign in instead." });
      }
      const id = randomUUID();
      await connection.execute(
        "INSERT INTO fieldline_users (id, display_name, email, password_hash, role) VALUES (?, ?, ?, ?, 'administrator')",
        [id, name, email, passwordHash],
      );
      await connection.execute("UPDATE fieldline_auth_config SET setup_complete = TRUE WHERE id = 1");
      await connection.commit();
      user = { id, name, email, role: "administrator" };
    } catch (error) {
      await connection.rollback();
      if (error?.code === "ER_DUP_ENTRY") {
        return sendJson(res, 409, { error: "An account with that email already exists." });
      }
      throw error;
    } finally {
      connection.release();
    }
    await createSession(user.id, res);
    return sendJson(res, 201, { user: publicUser(user) });
  }
  if (path === "/api/auth/login" && req.method === "POST") {
    if (loginIsLimited(req)) return sendJson(res, 429, { error: "Too many sign-in attempts. Try again in 15 minutes." });
    const { email, password } = validateCredentials(await readJson(req), false);
    const [rows] = await pool.execute(
      "SELECT id, display_name AS name, email, password_hash, role FROM fieldline_users WHERE email = ?",
      [email],
    );
    const user = rows[0];
    const validPassword = user
      ? await verifyPassword(password, user.password_hash)
      : await hashPassword(password, dummyPasswordSalt).then(() => false);
    if (!user || !validPassword) {
      recordFailedLogin(req);
      return sendJson(res, 401, { error: "Email or password is incorrect." });
    }
    failedLogins.delete(req.socket.remoteAddress || "unknown");
    await createSession(user.id, res);
    return sendJson(res, 200, { user: publicUser(user) });
  }
  return null;
}

async function readTable(entity) {
  if (entity === "assets") {
    const [rows] = await pool.query(`
      SELECT a.*, s.name AS site_name
      FROM assets a LEFT JOIN sites s ON s.id = a.site_id
      WHERE a.vehicle_type IN ('Truck', 'Car', 'Trailer', 'Equipment') OR a.category = 'Vehicle'
      ORDER BY a.created_at DESC
    `);
    return rows;
  }
  if (entity === "work-orders") {
    const [rows] = await pool.query(`
      SELECT w.*, a.name AS asset_name
      FROM work_orders w LEFT JOIN assets a ON a.id = w.asset_id
      ORDER BY w.created_at DESC
    `);
    return rows;
  }
  if (entity === "incidents") {
    const [rows] = await pool.query(`
      SELECT i.*, a.name AS asset_name
      FROM incidents i LEFT JOIN assets a ON a.id = i.asset_id
      ORDER BY i.created_at DESC
    `);
    return rows;
  }
  const table = tables[entity].table;
  const [rows] = await pool.query(`SELECT * FROM \`${table}\` ORDER BY created_at DESC`);
  return rows;
}

async function saveVehicle(id, body, actor) {
  const input = cleanInput(body, vehicleMaster);
  const hasCategory = Object.hasOwn(body, "category");
  if (!vehicleTypes.includes(input.vehicle_type)) {
    throw Object.assign(new Error("Choose Truck, Car, Trailer, or Equipment as the vehicle type."), { status: 400 });
  }
  if (!vehicleStatuses.includes(input.status) && !["Active", "Maintenance", "Inactive"].includes(input.status)) {
    throw Object.assign(new Error("Choose a valid vehicle lifecycle status."), { status: 400 });
  }
  if (input.year !== null && (!Number.isInteger(Number(input.year)) || Number(input.year) < 1886 || Number(input.year) > new Date().getFullYear() + 2)) {
    throw Object.assign(new Error("Enter a valid model year."), { status: 400 });
  }
  if (input.site_id) {
    const [sites] = await pool.execute("SELECT id FROM sites WHERE id = ?", [input.site_id]);
    if (!sites.length) throw Object.assign(new Error("The selected site does not exist."), { status: 400 });
  }
  const connection = await pool.getConnection();
  const vehicleId = id || randomUUID();
  try {
    await connection.beginTransaction();
    let previousStatus = null;
    let before = null;
    if (id) {
      const [existing] = await connection.execute("SELECT * FROM assets WHERE id = ?", [id]);
      if (!existing.length) {
        throw Object.assign(new Error("Vehicle not found."), { status: 404 });
      }
      before = existing[0];
      previousStatus = before.status;
      input.category = hasCategory ? input.category : before.category;
      const keys = Object.keys(input);
      const assignments = keys.map((key) => `\`${key}\` = ?`).join(", ");
      await connection.execute(`UPDATE assets SET ${assignments} WHERE id = ?`, [...keys.map((key) => input[key]), id]);
    } else {
      input.category = hasCategory ? input.category : input.vehicle_type;
      const keys = ["id", ...Object.keys(input)];
      await connection.execute(
        `INSERT INTO assets (${keys.map((key) => `\`${key}\``).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`,
        [vehicleId, ...Object.values(input)],
      );
    }
    const [rows] = await connection.execute("SELECT * FROM assets WHERE id = ?", [vehicleId]);
    await writeFleetActivity(connection, actor, {
      vehicleId,
      entityType: "vehicle",
      entityId: vehicleId,
      action: id ? "update" : "create",
      before,
      after: rows[0],
    });
    if (!id || previousStatus !== input.status) {
      await connection.execute(
        "INSERT INTO vehicle_events (id, asset_id, event_type, effective_at, reason) VALUES (?, ?, ?, CURRENT_TIMESTAMP(3), ?)",
        [randomUUID(), vehicleId, input.status, id ? "Lifecycle status changed in vehicle record." : "Initial vehicle lifecycle status."],
      );
    }
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function ensureVehicle(assetId) {
  const [rows] = await pool.execute(
    "SELECT id FROM assets WHERE id = ? AND (vehicle_type IN ('Truck', 'Car', 'Trailer', 'Equipment') OR category = 'Vehicle')",
    [assetId],
  );
  if (!rows.length) throw Object.assign(new Error("Vehicle not found."), { status: 404 });
}

async function writeFleetActivity(connection, actor, { vehicleId = null, entityType, entityId, action, before = null, after = null }) {
  const changes = action === "update"
    ? Object.fromEntries([...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])]
      .filter((key) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null))
      .map((key) => [key, { before: before?.[key] ?? null, after: after?.[key] ?? null }]))
    : { record: { before, after } };
  const actorType = ["person", "backend", "agentic_ai", "uipath"].includes(actor?.actorType)
    ? actor.actorType
    : actor?.id ? "person" : "backend";
  await connection.execute(
    `INSERT INTO fleet_activity_log
      (id, vehicle_id, entity_type, entity_id, action, actor_id, actor_name, actor_type, change_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), vehicleId, entityType, entityId, action, actor?.id ?? null, actor?.name ?? "Fieldline backend", actorType, JSON.stringify(changes)],
  );
}

async function readVehicleHistory(assetId, resource) {
  await ensureVehicle(assetId);
  const definition = vehicleHistory[resource];
  const sortField = {
    ownership: "effective_start",
    registrations: "effective_start",
    assignments: "assignment_start",
    events: "effective_at",
    mileage: "reading_at",
    documents: "created_at",
  }[resource];
  const [rows] = await pool.execute(`SELECT * FROM \`${definition.table}\` WHERE asset_id = ? ORDER BY \`${sortField}\` DESC`, [assetId]);
  return rows;
}

async function saveVehicleHistory(assetId, resource, id, body, actor) {
  await ensureVehicle(assetId);
  const definition = vehicleHistory[resource];
  const input = cleanInput(body, definition);
  if (resource === "assignments" && input.handover_notes === undefined) input.handover_notes = "";
  if (resource === "events" && input.reason === undefined) input.reason = "";
  for (const [field, values] of Object.entries(definition.values ?? {})) {
    if (!values.includes(input[field])) {
      throw Object.assign(new Error(`Choose a valid ${field.replaceAll("_", " ")}.`), { status: 400 });
    }
  }
  if (resource === "events" && input.event_type === "Sold" && !input.handover_at) {
    throw Object.assign(new Error("Enter the transfer or handover date for a sale."), { status: 400 });
  }
  if (resource === "events" && input.event_type === "Stolen" && (!input.report_reference || !input.reported_start)) {
    throw Object.assign(new Error("Enter the theft report reference and reported start time."), { status: 400 });
  }
  if (resource === "events" && input.event_type === "Recovered" && !input.recovery_at) {
    throw Object.assign(new Error("Enter the vehicle recovery date and time."), { status: 400 });
  }
  if (resource === "mileage" && (!Number.isFinite(Number(input.reading)) || Number(input.reading) < 0)) {
    throw Object.assign(new Error("Odometer reading must be zero or greater."), { status: 400 });
  }
  if (resource === "documents" && input.file_url && !/^(https?:\/\/|\/)/i.test(input.file_url)) {
    throw Object.assign(new Error("Document links must use http(s) or a site-relative path."), { status: 400 });
  }
  for (const key of ["document_id", "handover_document_id", "evidence_document_id"]) {
    if (!input[key]) continue;
    const [documents] = await pool.execute("SELECT id FROM vehicle_documents WHERE id = ? AND asset_id = ?", [input[key], assetId]);
    if (!documents.length) throw Object.assign(new Error("The selected document does not belong to this vehicle."), { status: 400 });
  }

  const connection = await pool.getConnection();
  const rowId = id || randomUUID();
  try {
    await connection.beginTransaction();
    let before = null;
    if (id) {
      const [existing] = await connection.execute(`SELECT * FROM \`${definition.table}\` WHERE id = ? AND asset_id = ?`, [id, assetId]);
      if (!existing.length) throw Object.assign(new Error("Vehicle history record not found."), { status: 404 });
      before = existing[0];
      const keys = Object.keys(input);
      if (!keys.length) throw Object.assign(new Error("Provide at least one field to update."), { status: 400 });
      const assignments = keys.map((key) => `\`${key}\` = ?`).join(", ");
      await connection.execute(`UPDATE \`${definition.table}\` SET ${assignments} WHERE id = ? AND asset_id = ?`, [...keys.map((key) => input[key]), id, assetId]);
    } else {
      const keys = ["id", "asset_id", ...Object.keys(input)];
      await connection.execute(
        `INSERT INTO \`${definition.table}\` (${keys.map((key) => `\`${key}\``).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`,
        [rowId, assetId, ...Object.values(input)],
      );
    }
    const [rows] = await connection.execute(`SELECT * FROM \`${definition.table}\` WHERE id = ? AND asset_id = ?`, [rowId, assetId]);
    await writeFleetActivity(connection, actor, {
      vehicleId: assetId,
      entityType: `vehicle_${resource}`,
      entityId: rowId,
      action: id ? "update" : "create",
      before,
      after: rows[0],
    });
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function saveRow(entity, id, body, actor) {
  const definition = tables[entity];
  const input = cleanInput(body, definition);
  if (input.site_id) {
    const [sites] = await pool.execute("SELECT id FROM sites WHERE id = ?", [input.site_id]);
    if (!sites.length) throw Object.assign(new Error("The selected site does not exist"), { status: 400 });
  }
  if (input.asset_id) {
    const [assets] = await pool.execute("SELECT id FROM assets WHERE id = ?", [input.asset_id]);
    if (!assets.length) throw Object.assign(new Error("The selected asset does not exist"), { status: 400 });
  }

  const connection = await pool.getConnection();
  const rowId = id || randomUUID();
  try {
    await connection.beginTransaction();
    let before = null;
    if (id) {
      const [existing] = await connection.execute(`SELECT * FROM \`${definition.table}\` WHERE id = ?`, [id]);
      if (!existing.length) throw Object.assign(new Error("Record not found"), { status: 404 });
      before = existing[0];
      const keys = Object.keys(input);
      if (!keys.length) throw Object.assign(new Error("Provide at least one field to update"), { status: 400 });
      const assignments = keys.map((key) => `\`${key}\` = ?`).join(", ");
      await connection.execute(`UPDATE \`${definition.table}\` SET ${assignments} WHERE id = ?`, [...keys.map((key) => input[key]), id]);
    } else {
      const keys = ["id", ...Object.keys(input)];
      const values = [rowId, ...Object.values(input)];
      await connection.execute(
        `INSERT INTO \`${definition.table}\` (${keys.map((key) => `\`${key}\``).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`,
        values,
      );
    }
    const [rows] = await connection.execute(`SELECT * FROM \`${definition.table}\` WHERE id = ?`, [rowId]);
    const saved = rows[0];
    let vehicleId = saved.asset_id ?? null;
    if (vehicleId) {
      const [vehicles] = await connection.execute(
        "SELECT id FROM assets WHERE id = ? AND vehicle_type IN ('Truck', 'Car', 'Trailer', 'Equipment')",
        [vehicleId],
      );
      if (!vehicles.length) vehicleId = null;
    }
    await writeFleetActivity(connection, actor, {
      vehicleId,
      entityType: entity,
      entityId: rowId,
      action: id ? "update" : "create",
      before,
      after: saved,
    });
    await connection.commit();
    return saved;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteRow(entity, id, actor) {
  const definition = tables[entity];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(`SELECT * FROM \`${definition.table}\` WHERE id = ?`, [id]);
    if (!rows.length) throw Object.assign(new Error("Record not found"), { status: 404 });
    const before = rows[0];
    let vehicleId = before.asset_id ?? null;
    if (vehicleId) {
      const [vehicles] = await connection.execute(
        "SELECT id FROM assets WHERE id = ? AND vehicle_type IN ('Truck', 'Car', 'Trailer', 'Equipment')",
        [vehicleId],
      );
      if (!vehicles.length) vehicleId = null;
    }
    await connection.execute(`DELETE FROM \`${definition.table}\` WHERE id = ?`, [id]);
    await writeFleetActivity(connection, actor, { vehicleId, entityType: entity, entityId: id, action: "delete", before });
    await connection.commit();
    return { deleted: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function readFleetModule(resource) {
  const joins = {
    customers: "SELECT c.* FROM fleet_customers c ORDER BY c.updated_at DESC",
    contracts: "SELECT c.*, f.name AS customer_name FROM fleet_contracts c JOIN fleet_customers f ON f.id = c.customer_id ORDER BY c.updated_at DESC",
    drivers: "SELECT d.*, c.name AS customer_name FROM fleet_drivers d LEFT JOIN fleet_customers c ON c.id = d.customer_id ORDER BY d.updated_at DESC",
    "driver-assignments": "SELECT a.*, v.name AS vehicle_name, d.name AS driver_name, c.name AS customer_name, f.contract_number FROM fleet_driver_assignments a JOIN assets v ON v.id = a.vehicle_id LEFT JOIN fleet_drivers d ON d.id = a.driver_id LEFT JOIN fleet_customers c ON c.id = a.customer_id LEFT JOIN fleet_contracts f ON f.id = a.contract_id ORDER BY a.assignment_start DESC",
    "toll-accounts": "SELECT ta.*, DATE_FORMAT(ta.account_opened, '%Y-%m-%d') AS account_opened, DATE_FORMAT(ta.balance_as_of, '%Y-%m-%d %H:%i:%s') AS balance_as_of, DATE_FORMAT(ta.last_sync_at, '%Y-%m-%d %H:%i:%s') AS last_sync_at FROM toll_accounts ta ORDER BY ta.updated_at DESC",
    "toll-payment-history": "SELECT p.payment_reference, t.transaction_reference, p.related_notice_number, v.name AS vehicle_name, p.plate_number, a.account_reference, p.passage_at, p.payment_at, p.payment_type, p.payment_status, p.amount, p.currency, p.provider_payment_reference, p.ledger_entry_reference, p.exception_code, p.investigation_notes FROM toll_payment_events p JOIN toll_transactions t ON t.id = p.transaction_id JOIN assets v ON v.id = p.vehicle_id JOIN toll_accounts a ON a.id = p.toll_account_id ORDER BY p.payment_at DESC",
    "toll-account-ledger": "SELECT l.ledger_reference, a.account_reference, l.occurred_at, l.entry_type, l.transaction_reference, l.payment_reference, v.name AS vehicle_name, l.external_reference, l.signed_amount, l.running_balance, l.currency, l.notes FROM toll_account_ledger l JOIN toll_accounts a ON a.id = l.toll_account_id LEFT JOIN assets v ON v.id = l.vehicle_id ORDER BY l.occurred_at DESC, l.ledger_reference",
    "toll-account-balances": "SELECT a.account_reference, b.account_holder, b.account_status, b.snapshot_at, b.opening_balance, b.replenishment_credits, b.settled_toll_debits, b.calculated_ending_balance, b.source_ending_balance, b.balance_difference, b.reconciliation_result, b.successful_toll_charges, b.failed_attempts, b.currency FROM toll_account_balance_snapshots b JOIN toll_accounts a ON a.id = b.toll_account_id ORDER BY b.snapshot_at DESC, a.account_reference",
    transponders: "SELECT t.*, a.provider AS provider_name, v.name AS vehicle_name FROM toll_transponders t JOIN toll_accounts a ON a.id = t.toll_account_id LEFT JOIN assets v ON v.id = t.vehicle_id ORDER BY t.updated_at DESC",
    transactions: "SELECT t.*, a.provider AS provider_name, v.name AS vehicle_name FROM toll_transactions t LEFT JOIN toll_accounts a ON a.id = t.toll_account_id LEFT JOIN assets v ON v.id = t.vehicle_id ORDER BY t.toll_at DESC",
    violations: "SELECT c.*, v.name AS vehicle_name, t.transaction_reference, p.payment_reference FROM toll_violations c LEFT JOIN assets v ON v.id = c.vehicle_id LEFT JOIN toll_transactions t ON t.id = c.transaction_id LEFT JOIN toll_payment_events p ON p.id = c.payment_event_id ORDER BY c.updated_at DESC",
    payments: "SELECT p.*, v.name AS vehicle_name, c.name AS customer_name, x.notice_number FROM fleet_payments p LEFT JOIN assets v ON v.id = p.vehicle_id LEFT JOIN fleet_customers c ON c.id = p.customer_id LEFT JOIN toll_violations x ON x.id = p.violation_id ORDER BY p.updated_at DESC",
    maintenance: "SELECT m.*, v.name AS vehicle_name, w.title AS work_order_title FROM fleet_maintenance m JOIN assets v ON v.id = m.vehicle_id LEFT JOIN work_orders w ON w.id = m.work_order_id ORDER BY m.updated_at DESC",
    trips: "SELECT t.*, v.name AS vehicle_name FROM fleet_trips t JOIN assets v ON v.id = t.vehicle_id ORDER BY t.trip_start DESC",
    tasks: "SELECT f.*, v.name AS vehicle_name, c.notice_number FROM fleet_tasks f LEFT JOIN assets v ON v.id = f.vehicle_id LEFT JOIN toll_violations c ON c.id = f.violation_id ORDER BY f.updated_at DESC",
    approvals: "SELECT a.*, f.next_action, v.notice_number FROM fleet_approvals a LEFT JOIN fleet_tasks f ON f.id = a.task_id LEFT JOIN toll_violations v ON v.id = a.violation_id ORDER BY a.updated_at DESC",
  };
  const [rows] = await pool.query(joins[resource]);
  return rows;
}

async function saveFleetModule(resource, id, body, actor) {
  const definition = fleetModules[resource];
  const input = cleanInput(body, definition);
  const defaults = {
    contracts: { covered_units: "", rules_notes: "" },
    "driver-assignments": { handover_notes: "" },
    violations: { event_details: "", recommendation: "" },
    payments: { reconciliation_notes: "" },
    maintenance: { repairs: "" },
    approvals: { notes: "" },
  }[resource] ?? {};
  for (const [field, value] of Object.entries(defaults)) if (input[field] === undefined) input[field] = value;
  for (const [field, values] of Object.entries(definition.values ?? {})) {
    if (!values.includes(input[field])) throw Object.assign(new Error(`Choose a valid ${field.replaceAll("_", " ")}.`), { status: 400 });
  }
  for (const field of ["amount", "cost", "due_mileage", "distance"]) {
    if (input[field] != null && (!Number.isFinite(Number(input[field])) || Number(input[field]) < 0)) {
      throw Object.assign(new Error(`${field.replaceAll("_", " ")} must be zero or greater.`), { status: 400 });
    }
  }
  for (const field of ["evidence_link", "receipt_link"]) {
    if (input[field] && !/^(https?:\/\/|\/)/i.test(input[field])) {
      throw Object.assign(new Error(`${field.replaceAll("_", " ")} must use http(s) or a site-relative path.`), { status: 400 });
    }
  }
  if (input.vehicle_id) await ensureVehicle(input.vehicle_id);

  const connection = await pool.getConnection();
  const rowId = id || randomUUID();
  try {
    await connection.beginTransaction();
    let before = null;
    if (id) {
      const [existing] = await connection.execute(`SELECT * FROM \`${definition.table}\` WHERE id = ?`, [id]);
      if (!existing.length) throw Object.assign(new Error("Record not found."), { status: 404 });
      before = existing[0];
      const keys = Object.keys(input);
      if (!keys.length) throw Object.assign(new Error("Provide at least one field to update."), { status: 400 });
      const assignments = [...keys.map((key) => `\`${key}\` = ?`), "updated_at = CURRENT_TIMESTAMP(3)"].join(", ");
      await connection.execute(`UPDATE \`${definition.table}\` SET ${assignments} WHERE id = ?`, [...keys.map((key) => input[key]), id]);
    } else {
      const keys = ["id", ...Object.keys(input)];
      await connection.execute(
        `INSERT INTO \`${definition.table}\` (${keys.map((key) => `\`${key}\``).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`,
        [rowId, ...Object.values(input)],
      );
    }
    const [rows] = await connection.execute(`SELECT * FROM \`${definition.table}\` WHERE id = ?`, [rowId]);
    const saved = rows[0];
    let vehicleId = saved.vehicle_id ?? null;
    if (!vehicleId && saved.transaction_id) {
      const [transactions] = await connection.execute("SELECT vehicle_id FROM toll_transactions WHERE id = ?", [saved.transaction_id]);
      vehicleId = transactions[0]?.vehicle_id ?? null;
    }
    if (!vehicleId && saved.violation_id) {
      const [cases] = await connection.execute("SELECT vehicle_id FROM toll_violations WHERE id = ?", [saved.violation_id]);
      vehicleId = cases[0]?.vehicle_id ?? null;
    }
    await writeFleetActivity(connection, actor, {
      vehicleId,
      entityType: `fleet_${resource}`,
      entityId: rowId,
      action: id ? "update" : "create",
      before,
      after: saved,
    });
    await connection.commit();
    return saved;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteFleetModule(resource, id, actor) {
  const definition = fleetModules[resource];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(`SELECT * FROM \`${definition.table}\` WHERE id = ?`, [id]);
    if (!rows.length) throw Object.assign(new Error("Record not found."), { status: 404 });
    const before = rows[0];
    let vehicleId = before.vehicle_id ?? null;
    if (!vehicleId && before.violation_id) {
      const [cases] = await connection.execute("SELECT vehicle_id FROM toll_violations WHERE id = ?", [before.violation_id]);
      vehicleId = cases[0]?.vehicle_id ?? null;
    }
    await connection.execute(`DELETE FROM \`${definition.table}\` WHERE id = ?`, [id]);
    await writeFleetActivity(connection, actor, {
      vehicleId,
      entityType: `fleet_${resource}`,
      entityId: id,
      action: "delete",
      before,
    });
    await connection.commit();
    return { deleted: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function readFleetActivity(vehicleId) {
  const sql = `
    SELECT l.*, v.name AS vehicle_name
    FROM fleet_activity_log l LEFT JOIN assets v ON v.id = l.vehicle_id
    ${vehicleId ? "WHERE l.vehicle_id = ?" : ""}
    ORDER BY l.created_at DESC LIMIT 500
  `;
  const [rows] = vehicleId ? await pool.execute(sql, [vehicleId]) : await pool.query(sql);
  return rows;
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function serveStatic(res, pathname) {
  if (!existsSync(join(staticDir, "index.html"))) {
    sendJson(res, 404, { error: "Frontend is not built. Run npm run build in the client folder." });
    return;
  }
  const decoded = decodeURIComponent(pathname);
  const relative = normalize(decoded).replace(/^[/\\]+/, "");
  const file = resolve(staticDir, relative || "index.html");
  if (file !== staticDir && !file.startsWith(`${staticDir}${sep}`)) {
    sendJson(res, 400, { error: "Invalid asset path" });
    return;
  }
  const target = existsSync(file) ? file : join(staticDir, "index.html");
  res.writeHead(200, {
    "Content-Type": mimeTypes[extname(target)] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
  });
  createReadStream(target).pipe(res);
}

async function handle(req, res) {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const path = url.pathname;
    let actor = null;
    if (path === "/api/health" && req.method === "GET") {
      await pool.query("SELECT 1");
      return sendJson(res, 200, { status: "ok", database: "connected" });
    }
    if (path.startsWith("/api/auth/")) {
      const response = await handleAuth(req, res, path);
      if (response !== null) return response;
    }
    if (path.startsWith("/api/")) {
      const user = await authenticatedUser(req);
      if (!user) return sendJson(res, 401, { error: "Authentication required" });
      actor = user;
    }
    if (path === "/api/summary" && req.method === "GET") {
      const [[assets], [sites], [workOrders], [incidents]] = await Promise.all([
        pool.query("SELECT COUNT(*) AS count FROM assets WHERE vehicle_type IN ('Truck', 'Car', 'Trailer', 'Equipment') OR category = 'Vehicle'"),
        pool.query("SELECT COUNT(*) AS count FROM sites"),
        pool.query("SELECT COUNT(*) AS count FROM work_orders WHERE status <> 'Completed'"),
        pool.query("SELECT COUNT(*) AS count FROM incidents WHERE status <> 'Resolved'"),
      ]);
      return sendJson(res, 200, {
        vehicles: Number(assets[0].count),
        sites: Number(sites[0].count),
        openWorkOrders: Number(workOrders[0].count),
        openIncidents: Number(incidents[0].count),
      });
    }
    const optionsMatch = path.match(/^\/api\/options\/(sites|assets)$/);
    if (optionsMatch && req.method === "GET") {
      const table = optionsMatch[1];
      const [rows] = table === "assets"
        ? await pool.query("SELECT id, name FROM assets WHERE vehicle_type IN ('Truck', 'Car', 'Trailer', 'Equipment') OR category = 'Vehicle' ORDER BY name")
        : await pool.query(`SELECT id, name FROM \`${table}\` ORDER BY name`);
      return sendJson(res, 200, rows);
    }

    const fleetOptionsMatch = path.match(/^\/api\/fleet-options\/(customers|contracts|drivers|work-orders|toll-accounts|transponders|transactions|violations|tasks|vehicles)$/);
    if (fleetOptionsMatch && req.method === "GET") {
      const optionQueries = {
        customers: "SELECT id, name AS label FROM fleet_customers WHERE status = 'Active' ORDER BY name",
        contracts: "SELECT id, contract_number AS label FROM fleet_contracts ORDER BY contract_number",
        drivers: "SELECT id, name AS label FROM fleet_drivers WHERE status = 'Active' ORDER BY name",
        "work-orders": "SELECT id, title AS label FROM work_orders ORDER BY created_at DESC LIMIT 500",
        "toll-accounts": "SELECT id, CONCAT(provider, ' · ', account_reference) AS label FROM toll_accounts ORDER BY provider",
        transponders: "SELECT id, transponder_id AS label FROM toll_transponders ORDER BY transponder_id",
        transactions: "SELECT id, transaction_reference AS label FROM toll_transactions ORDER BY toll_at DESC LIMIT 500",
        violations: "SELECT id, notice_number AS label FROM toll_violations ORDER BY created_at DESC LIMIT 500",
        tasks: "SELECT id, next_action AS label FROM fleet_tasks ORDER BY created_at DESC LIMIT 500",
        vehicles: "SELECT id, name AS label FROM assets WHERE vehicle_type IN ('Truck', 'Car', 'Trailer', 'Equipment') OR category = 'Vehicle' ORDER BY name",
      };
      const [rows] = await pool.query(optionQueries[fleetOptionsMatch[1]]);
      return sendJson(res, 200, rows);
    }

    if (path === "/api/fleet/activity" && req.method === "GET") {
      const vehicleId = url.searchParams.get("vehicle_id");
      if (vehicleId) await ensureVehicle(vehicleId);
      return sendJson(res, 200, await readFleetActivity(vehicleId));
    }
    const fleetMatch = path.match(/^\/api\/fleet\/(customers|contracts|drivers|driver-assignments|toll-accounts|transponders|transactions|violations|payments|maintenance|trips|tasks|approvals|toll-payment-history|toll-account-ledger|toll-account-balances)(?:\/([^/]+))?$/);
    if (fleetMatch) {
      const [, resource, rawId] = fleetMatch;
      const id = rawId ? decodeURIComponent(rawId) : null;
      if (req.method === "GET" && !id) return sendJson(res, 200, await readFleetModule(resource));
      if (["toll-payment-history", "toll-account-ledger", "toll-account-balances"].includes(resource)) return sendJson(res, 405, { error: "This imported toll history is read-only." });
      if (req.method === "POST" && !id) return sendJson(res, 201, await saveFleetModule(resource, null, await readJson(req), actor));
      if (req.method === "PUT" && id) return sendJson(res, 200, await saveFleetModule(resource, id, await readJson(req), actor));
      if (req.method === "DELETE" && id) return sendJson(res, 200, await deleteFleetModule(resource, id, actor));
      return sendJson(res, 405, { error: "Method not allowed." });
    }

    const vehicleMatch = path.match(/^\/api\/vehicles(?:\/([^/]+))?(?:\/(ownership|registrations|assignments|events|mileage|documents)(?:\/([^/]+))?)?$/);
    if (vehicleMatch) {
      const [, rawAssetId, resource, rawRecordId] = vehicleMatch;
      const assetId = rawAssetId ? decodeURIComponent(rawAssetId) : null;
      const recordId = rawRecordId ? decodeURIComponent(rawRecordId) : null;
      if (!resource) {
        if (req.method === "GET" && !assetId) return sendJson(res, 200, await readTable("assets"));
        if (req.method === "POST" && !assetId) return sendJson(res, 201, await saveVehicle(null, await readJson(req), actor));
        if (assetId && req.method === "GET") {
          await ensureVehicle(assetId);
          const [rows] = await pool.execute("SELECT a.*, s.name AS site_name FROM assets a LEFT JOIN sites s ON s.id = a.site_id WHERE a.id = ?", [assetId]);
          return sendJson(res, 200, rows[0]);
        }
        if (assetId && req.method === "PUT") return sendJson(res, 200, await saveVehicle(assetId, await readJson(req), actor));
        return sendJson(res, 405, { error: "Vehicle deletion is disabled; update the lifecycle status instead." });
      }
      if (!assetId) return sendJson(res, 400, { error: "A vehicle ID is required." });
      if (req.method === "GET" && !recordId) return sendJson(res, 200, await readVehicleHistory(assetId, resource));
      if (req.method === "POST" && !recordId) return sendJson(res, 201, await saveVehicleHistory(assetId, resource, null, await readJson(req), actor));
      if (req.method === "PUT" && recordId) return sendJson(res, 200, await saveVehicleHistory(assetId, resource, recordId, await readJson(req), actor));
      if (req.method === "DELETE" && recordId) {
        await ensureVehicle(assetId);
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          const [rows] = await connection.execute(`SELECT * FROM \`${vehicleHistory[resource].table}\` WHERE id = ? AND asset_id = ?`, [recordId, assetId]);
          if (!rows.length) throw Object.assign(new Error("Vehicle history record not found."), { status: 404 });
          await connection.execute(`DELETE FROM \`${vehicleHistory[resource].table}\` WHERE id = ? AND asset_id = ?`, [recordId, assetId]);
          await writeFleetActivity(connection, actor, { vehicleId: assetId, entityType: `vehicle_${resource}`, entityId: recordId, action: "delete", before: rows[0] });
          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
        return sendJson(res, 200, { deleted: true });
      }
      return sendJson(res, 405, { error: "Method not allowed." });
    }

    const match = path.match(/^\/api\/([^/]+)(?:\/([^/]+))?$/);
    if (match) {
      const [, entity, rawId] = match;
      if (!tables[entity]) return sendJson(res, 404, { error: "Unknown section" });
      const id = rawId ? decodeURIComponent(rawId) : null;
      if (req.method === "GET" && !id) return sendJson(res, 200, await readTable(entity));
      if (entity === "assets") return sendJson(res, 405, { error: "Use the vehicle management API to update vehicle records." });
      if (req.method === "POST" && !id) return sendJson(res, 201, await saveRow(entity, null, await readJson(req), actor));
      if (req.method === "PUT" && id) return sendJson(res, 200, await saveRow(entity, id, await readJson(req), actor));
      if (req.method === "DELETE" && id) return sendJson(res, 200, await deleteRow(entity, id, actor));
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (req.method !== "GET") return sendJson(res, 404, { error: "Not found" });
    return serveStatic(res, path);
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") return sendJson(res, 409, { error: "A record with the same unique identifier already exists." });
    if (error?.code === "ER_NO_REFERENCED_ROW_2") return sendJson(res, 400, { error: "One of the selected linked records does not exist." });
    if (error?.code === "ER_ROW_IS_REFERENCED_2") return sendJson(res, 409, { error: "This record is still linked to other fleet records. Deactivate it instead of deleting it." });
    const status = Number(error?.status) || 500;
    return sendJson(res, status, { error: status === 500 ? "The request could not be completed" : error.message });
  }
}

async function start() {
  await initializeSchema();
  const server = createServer((req, res) => { void handle(req, res); });
  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(`Fieldline listening on http://127.0.0.1:${port}\n`);
    process.stdout.write(`MySQL database: ${dbName}\n`);
  });

  function shutdown() {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  process.stderr.write(`Could not connect to Fieldline's MySQL database: ${error.message}\n`);
  process.exitCode = 1;
});
