import { getDevices, getRooms } from "../smartthings.js";

function getCapability(component, capabilityId) {
  return component?.capabilities?.find(
    capability => capability.id === capabilityId
  );
}

function normalizeDevice(device, roomsById) {
  const main = device.components?.find(
    component => component.id === "main"
  );

  const switchCapability = getCapability(main, "switch");
  const levelCapability = getCapability(main, "switchLevel");
  const colorTemperatureCapability = getCapability(
    main,
    "colorTemperature"
  );

  const online =
    main?.capabilities
      ?.find(capability => capability.id === "healthCheck")
      ?.status?.["DeviceWatch-DeviceStatus"]?.value === "online";

  const room = roomsById.get(device.roomId);

  return {
    id: device.deviceId,
    label: device.label,
    type: main?.categories?.[0]?.name || null,

    room: room?.name || null,
    roomId: device.roomId || null,

    online,

    switch:
      switchCapability?.status?.switch?.value ?? null,

    level:
      levelCapability?.status?.level?.value ?? null,

    colorTemperature:
      colorTemperatureCapability
        ?.status?.colorTemperature?.value ?? null,

    colorTemperatureRange:
      colorTemperatureCapability
        ?.status?.colorTemperatureRange?.value ?? null
  };
}

export async function devices(request, env) {
  const result = await getDevices(env);

  if (!result.ok) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "SMARTTHINGS_ERROR",
          message: "SmartThings API request failed",
          status: result.status,
          details: result.data
        }
      },
      { status: result.status }
    );
  }

  const smartThingsDevices = result.data?.items || [];

  // Alle verwendeten Location-IDs ermitteln
  const locationIds = [
    ...new Set(
      smartThingsDevices
        .map(device => device.locationId)
        .filter(Boolean)
    )
  ];

  // Räume für alle Locations laden
  const roomsById = new Map();

  for (const locationId of locationIds) {
    const roomsResult = await getRooms(locationId, env);

    if (roomsResult.ok) {
      for (const room of roomsResult.data?.items || []) {
        roomsById.set(room.roomId, room);
      }
    }
  }

  // Geräte als MacroDroid-freundliches Dictionary aufbauen
  const resultData = {};
  const labelCounts = {};

  for (const device of smartThingsDevices) {
    const normalized = normalizeDevice(device, roomsById);

    const baseKey = normalized.label
      .trim()
      .toLowerCase();

    const count = labelCounts[baseKey] || 0;

    const key =
      count === 0
        ? baseKey
        : `${baseKey}-${count}`;

    labelCounts[baseKey] = count + 1;

    resultData[key] = normalized;
  }

  return Response.json({
    success: true,
    data: resultData,
    error: null
  });
}