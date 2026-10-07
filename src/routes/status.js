import { getDevices, getDeviceStatus } from "../smartthings.js";

function normalizeLabel(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getCapability(component, capabilityId) {
  return component?.capabilities?.find(
    capability => capability.id === capabilityId
  );
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
  // Geräteliste laden
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

  // Key oder SmartThings-ID auflösen
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

  // Räume laden
  let roomName = null;

  if (device.locationId) {
    const roomsResult = await fetch(
      `https://api.smartthings.com/v1/locations/${device.locationId}/rooms`,
      {
        headers: {
          "Authorization": `Bearer ${env.ST_ACCESS_TOKEN}`,
          "Accept": "application/json"
        }
      }
    );

    if (roomsResult.ok) {
      const roomsData = await roomsResult.json();

      const room = roomsData.items?.find(
        room => room.roomId === device.roomId
      );

      roomName = room?.name || null;
    }
  }

  // Aktuellen Status holen
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

  const normalized = normalizeStatus(
    device,
    result.data,
    roomName
  );

  return Response.json({
    success: true,
    data: normalized,
    error: null
  });
}