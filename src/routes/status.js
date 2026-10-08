import { getDevices, getRooms, getDeviceStatus } from "../smartthings.js";

function normalizeLabel(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function findDevice(devices, roomsById, deviceKey) {
  // Direkte SmartThings-ID
  const directDevice = devices.find(
    device => device.deviceId === deviceKey
  );

  if (directDevice) {
    return directDevice;
  }

  // Geräte nach Raum + Label gruppieren
  const groups = new Map();

  for (const device of devices) {
    const room = roomsById.get(device.roomId);

    const roomKey = normalizeLabel(
      room?.name || "unbekannt"
    );

    const labelKey = normalizeLabel(
      device.label || "gerät"
    );

    const baseKey = `${roomKey}-${labelKey}`;

    if (!groups.has(baseKey)) {
      groups.set(baseKey, []);
    }

    groups.get(baseKey).push(device);
  }

  // Gleiche Geräte-ID-Sortierung wie in /devices
  for (const [baseKey, group] of groups) {
    group.sort((a, b) =>
      a.deviceId.localeCompare(b.deviceId)
    );

    // Nur ein Gerät → keine Nummer
    if (group.length === 1) {
      if (baseKey === deviceKey) {
        return group[0];
      }

      continue;
    }

    // Mehrere gleiche Geräte → -1, -2, -3 ...
    for (let index = 0; index < group.length; index++) {
      const key = `${baseKey}-${index + 1}`;

      if (key === deviceKey) {
        return group[index];
      }
    }
  }

  return null;
}

function normalizeStatus(device, statusData, roomName) {
  const main = statusData?.components?.main;

  const switchValue =
    main?.switch?.switch?.value ?? null;

  const levelValue =
    main?.switchLevel?.level?.value ?? null;

  const colorTemperatureValue =
    main?.colorTemperature?.colorTemperature?.value ?? null;

  const colorTemperatureRange =
    main?.colorTemperature?.colorTemperatureRange?.value ?? null;

  const online =
    main?.healthCheck?.["DeviceWatch-DeviceStatus"]?.value === "online";

  const type =
    device.components
      ?.find(component => component.id === "main")
      ?.categories?.[0]?.name || null;

  return {
    id: device.deviceId,
    label: device.label,
    type,
    room: roomName || null,
    roomId: device.roomId || null,
    online,
    switch: switchValue,
    level: levelValue,
    colorTemperature: colorTemperatureValue,
    colorTemperatureRange
  };
}

export async function status(request, env, deviceKey) {
  // Geräte von SmartThings laden
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

  // Alle verwendeten Locations ermitteln
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
    const roomsResult = await getRooms(
      locationId,
      env
    );

    if (roomsResult.ok) {
      for (const room of roomsResult.data?.items || []) {
        roomsById.set(room.roomId, room);
      }
    }
  }

  // Gerät über Key oder SmartThings-ID finden
  const device = findDevice(
    devices,
    roomsById,
    deviceKey
  );

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

  const room = roomsById.get(
    device.roomId
  );

  const normalized = normalizeStatus(
    device,
    result.data,
    room?.name
  );

  return Response.json({
    success: true,
    data: normalized,
    error: null
  });
}