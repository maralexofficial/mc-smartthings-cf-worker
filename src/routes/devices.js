import { getDevices } from "../smartthings.js";

function getCapability(component, capabilityId) {
  return component?.capabilities?.find(
    capability => capability.id === capabilityId
  );
}

function getStatus(component, capabilityId, statusKey) {
  const capability = getCapability(component, capabilityId);
  return capability?.status?.[statusKey]?.value ?? null;
}

function normalizeDevice(device) {
  const main = device.components?.find(
    component => component.id === "main"
  );

  const switchCapability = getCapability(main, "switch");
  const levelCapability = getCapability(main, "switchLevel");
  const colorTemperatureCapability = getCapability(
    main,
    "colorTemperature"
  );
  const healthCapability = getCapability(main, "healthCheck");

  const deviceStatus = getStatus(
    main,
    "healthCheck",
    "healthStatus"
  );

  const online =
    main?.capabilities
      ?.find(capability => capability.id === "healthCheck")
      ?.status?.["DeviceWatch-DeviceStatus"]?.value === "online";

  return {
    id: device.deviceId,
    label: device.label,
    type: main?.categories?.[0]?.name || null,

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

  const devices = (result.data?.items || []).map(normalizeDevice);

  return Response.json({
    success: true,
    data: devices,
    error: null
  });
}