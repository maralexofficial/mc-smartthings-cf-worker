import { getDevices, sendCommand } from "../smartthings.js";

function normalizeLabel(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function buildDeviceMap(devices) {
  const deviceMap = {};
  const labelCounts = {};

  for (const device of devices) {
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

    deviceMap[key] = device;

    // SmartThings-ID ebenfalls als direkter Schlüssel
    deviceMap[device.deviceId] = device;
  }

  return deviceMap;
}

export async function command(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON"
        }
      },
      { status: 400 }
    );
  }

  const deviceKey = body.device;
  const commandName = body.command;

  if (!deviceKey || !commandName) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "INVALID_REQUEST",
          message: "device and command are required"
        }
      },
      { status: 400 }
    );
  }

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

  const deviceMap = buildDeviceMap(devices);

  const selectedDevice = deviceMap[deviceKey];

  if (!selectedDevice) {
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

  const commands = [
    {
      component: body.component || "main",
      capability: "switch",
      command: commandName
    }
  ];

  const result = await sendCommand(
    selectedDevice.deviceId,
    commands,
    env
  );

  if (!result.ok) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "SMARTTHINGS_ERROR",
          message: "SmartThings command failed",
          status: result.status,
          details: result.data
        }
      },
      { status: result.status }
    );
  }

  return Response.json({
    success: true,
    data: {
      device: {
        key: normalizeLabel(selectedDevice.label),
        id: selectedDevice.deviceId,
        label: selectedDevice.label
      },
      command: commandName,
      result: result.data
    },
    error: null
  });
}