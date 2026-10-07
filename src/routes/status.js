import { getDevices, getDeviceStatus } from "../smartthings.js";

function normalizeLabel(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function findDevice(devices, deviceKey) {
  const labelCounts = {};

  for (const device of devices) {
    // Direkte SmartThings-ID
    if (device.deviceId === deviceKey) {
      return device;
    }

    const baseKey = normalizeLabel(device.label || "");

    if (!baseKey) {
      continue;
    }

    const count = labelCounts[baseKey] || 0;

    const key =
      count === 0
        ? baseKey
        : `${baseKey}-${count}`;

    labelCounts[baseKey] = count + 1;

    if (key === deviceKey) {
      return device;
    }
  }

  return null;
}

export async function status(request, env, deviceKey) {
  // Geräte laden, um Key → SmartThings-ID aufzulösen
  const devicesResult = await getDevices(env);

  if (!devicesResult.ok) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "SMARTTHINGS_ERROR",
          message: "Could not load devices from SmartThings",
          status: devicesResult.status,
          details: devicesResult.data
        }
      },
      { status: devicesResult.status }
    );
  }

  const devices = devicesResult.data?.items || [];

  const device = findDevice(devices, deviceKey);

  if (!device) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "DEVICE_NOT_FOUND",
          message: `Device '${deviceKey}' not found`
        }
      },
      { status: 404 }
    );
  }

  // Aktuellen Status direkt von SmartThings holen
  const result = await getDeviceStatus(
    device.deviceId,
    env
  );

  if (!result.ok) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "SMARTTHINGS_ERROR",
          message: "SmartThings status request failed",
          status: result.status,
          details: result.data
        }
      },
      { status: result.status }
    );
  }

  return Response.json({
    success: true,
    data: result.data,
    error: null
  });
}