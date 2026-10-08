function getCapability(component, capabilityId) {
  return component?.capabilities?.find(
    capability => capability.id === capabilityId
  );
}

export function normalizeDevice(
  device,
  roomsById
) {
  const main = device.components?.find(
    component => component.id === "main"
  );

  const switchCapability = getCapability(
    main,
    "switch"
  );

  const levelCapability = getCapability(
    main,
    "switchLevel"
  );

  const colorTemperatureCapability =
    getCapability(
      main,
      "colorTemperature"
    );

  const online =
    main?.capabilities
      ?.find(
        capability =>
          capability.id === "healthCheck"
      )
      ?.status?.[
        "DeviceWatch-DeviceStatus"
      ]?.value === "online";

  const room = roomsById.get(
    device.roomId
  );

  return {
    id: device.deviceId,
    label: device.label,
    type:
      main?.categories?.[0]?.name || null,
    room: room?.name || null,
    roomId: device.roomId || null,
    online,
    switch:
      switchCapability
        ?.status
        ?.switch
        ?.value ?? null,
    level:
      levelCapability
        ?.status
        ?.level
        ?.value ?? null,
    colorTemperature:
      colorTemperatureCapability
        ?.status
        ?.colorTemperature
        ?.value ?? null,
    colorTemperatureRange:
      colorTemperatureCapability
        ?.status
        ?.colorTemperatureRange
        ?.value ?? null
  };
}

export function normalizeStatus(
  device,
  statusData,
  roomName
) {
  const main =
    statusData?.components?.main;

  const switchValue =
    main?.switch?.switch?.value ?? null;

  const levelValue =
    main?.switchLevel?.level?.value ?? null;

  const colorTemperatureValue =
    main?.colorTemperature
      ?.colorTemperature
      ?.value ?? null;

  const colorTemperatureRange =
    main?.colorTemperature
      ?.colorTemperatureRange
      ?.value ?? null;

  const online =
    main?.healthCheck?.[
      "DeviceWatch-DeviceStatus"
    ]?.value === "online";

  const type =
    device.components
      ?.find(
        component =>
          component.id === "main"
      )
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
    colorTemperature:
      colorTemperatureValue,
    colorTemperatureRange
  };
}