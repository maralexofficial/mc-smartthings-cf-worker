import { getDevices, getRooms } from "../smartthings.js";

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

  const locationIds = [
    ...new Set(
      smartThingsDevices
        .map(device => device.locationId)
        .filter(Boolean)
    )
  ];

  const roomsById = new Map();

  for (const locationId of locationIds) {
    const roomsResult = await getRooms(locationId, env);

    if (roomsResult.ok) {
      for (const room of roomsResult.data?.items || []) {
        roomsById.set(room.roomId, room);
      }
    }
  }

  // Geräte normalisieren
  const normalizedDevices = smartThingsDevices.map(device => ({
    device,
    normalized: normalizeDevice(device, roomsById)
  }));

  // Nach Raum + Label gruppieren
  const groups = new Map();

  for (const item of normalizedDevices) {
    const roomKey = normalizeLabel(item.normalized.room || "unbekannt");
    const labelKey = normalizeLabel(item.normalized.label || "gerät");

    const baseKey = `${roomKey}-${labelKey}`;

    if (!groups.has(baseKey)) {
      groups.set(baseKey, []);
    }

    groups.get(baseKey).push(item);
  }

  const resultData = {};

  // Jede Gruppe separat behandeln
  for (const [baseKey, items] of groups) {

    // Stabile Reihenfolge anhand der SmartThings-ID
    items.sort((a, b) =>
      a.normalized.id.localeCompare(b.normalized.id)
    );

    if (items.length === 1) {
      // Kein Duplikat → keine Nummer
      resultData[baseKey] = items[0].normalized;
      continue;
    }

    // Mehrere gleiche Geräte → nummerieren
    items.forEach((item, index) => {
      const key = `${baseKey}-${index + 1}`;
      resultData[key] = item.normalized;
    });
  }

  return Response.json({
    success: true,
    data: resultData,
    error: null
  });
}