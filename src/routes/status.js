import {
  getDevices,
  getRoomsByDevices,
  getDeviceStatus
} from "../smartthings.js";

import {
  findDevice
} from "../deviceResolver.js";

import {
  normalizeStatus
} from "../deviceNormalizer.js";

export async function status(request, env, deviceKey) {
  const devicesResult =
    await getDevices(env);

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

  const devices =
    devicesResult.data?.items || [];

  const roomsById =
    await getRoomsByDevices(
      devices,
      env
    );

  const device =
    findDevice(
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

  const result =
    await getDeviceStatus(
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

  const room =
    roomsById.get(
      device.roomId
    );

  const normalized =
    normalizeStatus(
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