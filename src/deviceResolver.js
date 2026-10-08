function normalizeLabel(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, "-");
}

function getBaseKey(device, roomsById) {
  const room = roomsById.get(device.roomId);

  const roomKey = normalizeLabel(
    room?.name || "unbekannt"
  );

  const labelKey = normalizeLabel(
    device.label || "gerät"
  );

  return `${roomKey}-${labelKey}`;
}

export function buildDeviceMap(
  devices,
  roomsById
) {
  const deviceMap = {};
  const groups = new Map();

  for (const device of devices) {
    const baseKey = getBaseKey(
      device,
      roomsById
    );

    if (!groups.has(baseKey)) {
      groups.set(baseKey, []);
    }

    groups.get(baseKey).push(device);
  }

  for (const [baseKey, group] of groups) {
    group.sort((a, b) =>
      a.deviceId.localeCompare(
        b.deviceId
      )
    );

    if (group.length === 1) {
      deviceMap[baseKey] =
        group[0];
    } else {
      group.forEach(
        (device, index) => {
          deviceMap[
            `${baseKey}-${index + 1}`
          ] = device;
        }
      );
    }
  }

  return deviceMap;
}

export function findDevice(
  devices,
  roomsById,
  deviceKey
) {
  const directDevice =
    devices.find(
      device =>
        device.deviceId === deviceKey
    );

  if (directDevice) {
    return directDevice;
  }

  const deviceMap =
    buildDeviceMap(
      devices,
      roomsById
    );

  return deviceMap[deviceKey] || null;
}