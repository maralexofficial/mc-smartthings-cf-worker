import { getDevices, getRooms, sendCommand } from "../smartthings.js";

function normalizeLabel(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function buildDeviceMap(devices, roomsById) {
  const deviceMap = {};
  const groups = new Map();

  // Geräte nach Raum + Label gruppieren
  for (const device of devices) {
    const room = roomsById.get(device.roomId);

    const roomKey = normalizeLabel(room?.name || "unbekannt");
    const labelKey = normalizeLabel(device.label || "gerät");

    const baseKey = `${roomKey}-${labelKey}`;

    if (!groups.has(baseKey)) {
      groups.set(baseKey, []);
    }

    groups.get(baseKey).push(device);
  }

  // Gleiche Gruppen stabil nach SmartThings-ID sortieren
  for (const [baseKey, group] of groups) {
    group.sort((a, b) =>
      a.deviceId.localeCompare(b.deviceId)
    );

    if (group.length === 1) {
      deviceMap[baseKey] = group[0];
    } else {
      group.forEach((device, index) => {
        deviceMap[`${baseKey}-${index + 1}`] = device;
      });
    }
  }

  // SmartThings-ID zusätzlich immer direkt akzeptieren
  for (const device of devices) {
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

  // Locations ermitteln
  const locationIds = [
    ...new Set(
      devices
        .map(device => device.locationId)
        .filter(Boolean)
    )
  ];

  // Räume laden
  const roomsById = new Map();

  for (const locationId of locationIds) {
    const roomsResult = await getRooms(locationId, env);

    if (roomsResult.ok) {
      for (const room of roomsResult.data?.items || []) {
        roomsById.set(room.roomId, room);
      }
    }
  }

  const deviceMap = buildDeviceMap(
    devices,
    roomsById
  );

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

  const room = roomsById.get(selectedDevice.roomId);

  return Response.json({
    success: true,
    data: {
      device: deviceKey,
      id: selectedDevice.deviceId,
      label: selectedDevice.label,
      room: room?.name || null,
      command: commandName,
      result: result.data
    },
    error: null
  });
}