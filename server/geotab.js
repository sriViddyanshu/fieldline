import { createHash, randomUUID } from "node:crypto";
import GeotabApi from "mg-api-js";

const syncIntervalMs = 15 * 60 * 1000;
const odometerDiagnostics = [
  "DiagnosticOdometerId",
  "DiagnosticOBDOdometerReaderId",
  "DiagnosticJ1939TotalVehicleDistanceId",
  "DiagnosticJ1708TotalVehicleDistanceId",
];
let activeSync = null;

function configurationError() {
  return Object.assign(
    new Error("Geotab is not configured. Set GEOTAB_DATABASE, GEOTAB_USERNAME, and GEOTAB_PASSWORD in the API environment."),
    { status: 503 },
  );
}

function schemaError(error) {
  if (error?.code === "ER_NO_SUCH_TABLE" || error?.code === "ER_BAD_FIELD_ERROR") {
    return Object.assign(
      new Error("Geotab ingestion tables are missing. Ask a DBA to run database/geotab-ingestion-migration.sql."),
      { status: 503 },
    );
  }
  return error;
}

function safeError(error) {
  const message = error instanceof Error ? error.message : "";
  if (/InvalidUserException|Incorrect login credentials/i.test(message)) {
    return "Geotab rejected the API login. Verify the API username, password, and database access.";
  }
  if (/not configured/i.test(message)) return message;
  const errorName = error instanceof Error ? error.name : "UnknownError";
  let safeMessage = message;
  for (const secret of [
    process.env.GEOTAB_DATABASE,
    process.env.GEOTAB_USERNAME,
    process.env.GEOTAB_PASSWORD,
  ].filter(Boolean)) {
    for (const value of new Set([secret, encodeURIComponent(secret)])) {
      safeMessage = safeMessage.split(value).join("[redacted]");
    }
  }
  process.stderr.write(`Geotab sync failed (${errorName}): ${safeMessage.slice(0, 240)}\n`);
  return "Geotab sync failed. Check the API configuration and account permissions.";
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function geotabVehicleType(device) {
  const type = [device.vehicleType, device.deviceType, device.type]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  if (/trailer/.test(type)) return "Trailer";
  if (/truck|tractor|heavy|bus/.test(type)) return "Truck";
  if (/car|passenger|light|van|pickup/.test(type)) return "Car";
  return "Equipment";
}

async function fetchGeotabTelematics() {
  const database = process.env.GEOTAB_DATABASE?.trim();
  const userName = process.env.GEOTAB_USERNAME?.trim();
  const password = process.env.GEOTAB_PASSWORD;
  if (!database || !userName || !password) throw configurationError();

  const api = new GeotabApi({
    credentials: { database, userName, password },
    path: process.env.GEOTAB_PATH?.trim() || "my.geotab.com",
  }, { rememberMe: false, timeout: 30 });

  const [devices, statusInfos] = await api.multiCall([
    ["Get", { typeName: "Device", resultsLimit: 50_000 }],
    ["Get", { typeName: "DeviceStatusInfo", resultsLimit: 50_000 }],
  ]);
  if (!Array.isArray(devices) || !Array.isArray(statusInfos)) {
    throw new Error("Geotab returned an unexpected response.");
  }

  const validDevices = devices.filter((device) => typeof device?.id === "string");
  const statusByDevice = new Map(
    statusInfos
      .map((status) => [typeof status?.device === "string" ? status.device : status?.device?.id, status])
      .filter(([id]) => typeof id === "string"),
  );
  const odometerByDevice = new Map();
  const odometerCalls = validDevices.flatMap((device) =>
    odometerDiagnostics.map((diagnosticId) => [
      "Get",
      {
        typeName: "StatusData",
        search: {
          deviceSearch: { id: device.id },
          diagnosticSearch: { id: diagnosticId },
        },
        sort: { sortBy: "date", sortDirection: "Descending" },
        resultsLimit: 1,
      },
    ]),
  );

  for (let offset = 0; offset < odometerCalls.length; offset += 100) {
    const results = await api.multiCall(odometerCalls.slice(offset, offset + 100));
    if (!Array.isArray(results)) throw new Error("Geotab returned unexpected odometer data.");

    for (let index = 0; index < results.length; index += 1) {
      const record = Array.isArray(results[index]) ? results[index][0] : null;
      const requestedDeviceId = odometerCalls[offset + index][1].search.deviceSearch.id;
      const value = finiteNumber(record?.data);
      const timestamp = Date.parse(record?.dateTime);
      if (value === null || !Number.isFinite(timestamp)) continue;

      const current = odometerByDevice.get(requestedDeviceId);
      if (!current || timestamp > Date.parse(current.dateTime)) {
        odometerByDevice.set(requestedDeviceId, { value, dateTime: record.dateTime });
      }
    }
  }

  return validDevices.map((device) => {
    const status = statusByDevice.get(device.id);
    const latitude = finiteNumber(status?.latitude);
    const longitude = finiteNumber(status?.longitude);
    return {
      deviceId: device.id,
      deviceName: typeof device.name === "string" ? device.name.trim().slice(0, 180) : `Geotab ${device.id}`,
      serialNumber: typeof device.serialNumber === "string" ? device.serialNumber.trim().slice(0, 40) : "",
      vin: typeof device.vehicleIdentificationNumber === "string"
        ? device.vehicleIdentificationNumber.trim().slice(0, 32).toUpperCase()
        : "",
      vehicleType: geotabVehicleType(device),
      manufacturer: typeof device.make === "string" ? device.make.slice(0, 120) : "",
      model: typeof device.model === "string" ? device.model.slice(0, 120) : "",
      year: Number.isInteger(Number(device.year)) && Number(device.year) >= 1886 && Number(device.year) <= 9999
        ? Number(device.year)
        : null,
      latitude: latitude !== null && latitude >= -90 && latitude <= 90 ? latitude : null,
      longitude: longitude !== null && longitude >= -180 && longitude <= 180 ? longitude : null,
      speed: finiteNumber(status?.speed),
      isDriving: typeof status?.isDriving === "boolean" ? status.isDriving : null,
      locationAt: typeof status?.dateTime === "string" ? status.dateTime : null,
      odometer: odometerByDevice.get(device.id)?.value ?? null,
      odometerAt: odometerByDevice.get(device.id)?.dateTime ?? null,
    };
  });
}

async function persistDevice(connection, device) {
  const [mappingRows] = await connection.execute(
    "SELECT asset_id FROM geotab_devices WHERE device_id = ? FOR UPDATE",
    [device.deviceId],
  );
  let assetId = mappingRows[0]?.asset_id ?? null;

  if (!assetId && device.vin) {
    const [vehicleRows] = await connection.execute(
      `SELECT id FROM assets WHERE UPPER(TRIM(vin)) = ?
       AND (vehicle_type IN ('Truck', 'Car', 'Trailer', 'Equipment') OR category = 'Vehicle')
       ORDER BY created_at, id LIMIT 1 FOR UPDATE`,
      [device.vin],
    );
    assetId = vehicleRows[0]?.id ?? null;
  }

  let created = false;
  if (!assetId) {
    assetId = randomUUID();
    const internalId = `GEOTAB-${createHash("sha256").update(device.deviceId).digest("hex").slice(0, 24)}`;
    await connection.execute(
      `INSERT INTO assets (
        id, name, category, vehicle_type, internal_asset_id, fleet_unit_number, vin,
        manufacturer, model, serial, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'In service')`,
      [
        assetId,
        device.deviceName || `Geotab ${device.deviceId}`,
        device.vehicleType,
        device.vehicleType,
        internalId,
        device.deviceName,
        device.vin || null,
        device.manufacturer,
        device.model,
        device.serialNumber,
      ],
    );
    created = true;
  }

  await connection.execute(
    `INSERT INTO geotab_devices (device_id, asset_id, device_name, serial_number, vin, vehicle_type, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE asset_id = VALUES(asset_id), device_name = VALUES(device_name),
       serial_number = VALUES(serial_number), vin = VALUES(vin), vehicle_type = VALUES(vehicle_type),
       last_seen_at = CURRENT_TIMESTAMP(3)`,
    [device.deviceId, assetId, device.deviceName, device.serialNumber, device.vin, device.vehicleType],
  );
  return { assetId, created };
}

async function executeSync(pool, triggeredBy) {
  const runId = randomUUID();
  await pool.execute(
    "INSERT INTO geotab_sync_runs (id, triggered_by, status) VALUES (?, ?, 'Running')",
    [runId, triggeredBy],
  );

  let connection;
  try {
    const devices = await fetchGeotabTelematics();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let vehiclesCreated = 0;
    for (const device of devices) {
      const { assetId, created } = await persistDevice(connection, device);
      if (created) vehiclesCreated += 1;
      await connection.execute(
        `INSERT INTO geotab_telemetry (
          id, device_id, captured_at, latitude, longitude, speed, is_driving, location_at, odometer, odometer_at
        ) VALUES (?, ?, CURRENT_TIMESTAMP(3), ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          device.deviceId,
          device.latitude,
          device.longitude,
          device.speed,
          device.isDriving,
          device.locationAt ? new Date(device.locationAt) : null,
          device.odometer,
          device.odometerAt ? new Date(device.odometerAt) : null,
        ],
      );
    }

    await connection.commit();
    const result = {
      id: runId,
      status: "Succeeded",
      devicesSeen: devices.length,
      vehiclesCreated,
      telemetrySaved: devices.length,
      completedAt: new Date().toISOString(),
    };
    await pool.execute(
      `UPDATE geotab_sync_runs
       SET status = 'Succeeded', devices_seen = ?, vehicles_created = ?, telemetry_saved = ?,
           completed_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [result.devicesSeen, result.vehiclesCreated, result.telemetrySaved, runId],
    );
    return result;
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        safeError(rollbackError);
      }
    }
    const errorMessage = safeError(error);
    await pool.execute(
      `UPDATE geotab_sync_runs SET status = 'Failed', error_message = ?,
       completed_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      [errorMessage.slice(0, 500), runId],
    );
    throw Object.assign(new Error(errorMessage), { status: error?.status || 502 });
  } finally {
    connection?.release();
  }
}

export async function syncGeotab(pool, triggeredBy = "manual") {
  if (!activeSync) {
    activeSync = executeSync(pool, triggeredBy)
      .catch((error) => { throw schemaError(error); })
      .finally(() => { activeSync = null; });
  }
  return activeSync;
}

export async function getGeotabOverview(pool) {
  try {
    const [devices] = await pool.query(
      `SELECT d.device_id AS deviceId, d.device_name AS deviceName, d.serial_number AS serialNumber,
         d.vin, d.vehicle_type AS vehicleType, d.last_seen_at AS lastSeenAt,
         a.id AS assetId, a.name AS assetName,
         t.latitude, t.longitude, t.speed, t.is_driving AS isDriving,
         t.location_at AS locationAt, t.odometer, t.odometer_at AS odometerAt,
         t.captured_at AS capturedAt
       FROM geotab_devices d
       LEFT JOIN assets a ON a.id = d.asset_id
       LEFT JOIN geotab_telemetry t ON t.id = (
         SELECT latest.id FROM geotab_telemetry latest
         WHERE latest.device_id = d.device_id ORDER BY latest.captured_at DESC LIMIT 1
       )
       ORDER BY d.device_name, d.device_id`,
    );
    const [runs] = await pool.query(
      `SELECT id, triggered_by AS triggeredBy, status, devices_seen AS devicesSeen,
         vehicles_created AS vehiclesCreated, telemetry_saved AS telemetrySaved,
         error_message AS errorMessage, started_at AS startedAt, completed_at AS completedAt
       FROM geotab_sync_runs ORDER BY started_at DESC LIMIT 20`,
    );
    return {
      devices: devices.map((device) => ({
        ...device,
        latitude: finiteNumber(device.latitude),
        longitude: finiteNumber(device.longitude),
        speed: finiteNumber(device.speed),
        odometer: finiteNumber(device.odometer),
        isDriving: device.isDriving === null ? null : Boolean(device.isDriving),
      })),
      runs,
    };
  } catch (error) {
    throw schemaError(error);
  }
}

export function startGeotabScheduler(pool) {
  const timer = setInterval(() => {
    void syncGeotab(pool, "scheduled").then((result) => {
      process.stdout.write(`Geotab scheduled sync completed: ${result.devicesSeen} devices.\n`);
    }).catch((error) => {
      process.stderr.write(`Geotab scheduled sync failed: ${error.message}\n`);
    });
  }, syncIntervalMs);
  timer.unref();
  return timer;
}
