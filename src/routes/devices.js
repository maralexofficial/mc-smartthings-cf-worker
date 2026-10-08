import {
  getDevices,
  getRoomsByDevices
} from "../smartthings.js";

import {
  normalizeDevice
} from "../deviceNormalizer.js";

import {
  buildDeviceMap
} from "../deviceResolver.js";

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

  const smartThingsDevices =
    result.data?.items || [];

  const roomsById =
    await getRoomsByDevices(
      smartThingsDevices,
      env
    );

  const deviceMap =
    buildDeviceMap(
      smartThingsDevices,
      roomsById
    );

  const normalizedById =
    new Map(
      smartThingsDevices.map(device => [
        device.deviceId,
        normalizeDevice(
          device,
          roomsById
        )
      ])
    );

  const resultData = {};

  for (const [key, device] of Object.entries(deviceMap)) {
    resultData[key] =
      normalizedById.get(device.deviceId);
  }

  return Response.json({
    success: true,
    data: resultData,
    error: null
  });
}