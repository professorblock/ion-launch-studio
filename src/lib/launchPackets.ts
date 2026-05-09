import type { LaunchPacket } from '../types/launch';

const launchPacketsStorageKey = 'ion-launch:launch-packets';
const lastLaunchPacketStorageKey = 'ion-launch:last-launch-packet';

export function getLaunchPackets(): LaunchPacket[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(launchPacketsStorageKey);
    if (stored) return normalizePackets(JSON.parse(stored));

    const legacyPacket = window.localStorage.getItem(lastLaunchPacketStorageKey);
    if (!legacyPacket) return [];
    const packet = JSON.parse(legacyPacket) as LaunchPacket;
    saveLaunchPacket(packet);
    return [packet];
  } catch {
    window.localStorage.removeItem(launchPacketsStorageKey);
    return [];
  }
}

export function getLastLaunchPacket() {
  return getLaunchPackets()[0];
}

export function getLaunchPacket(id: string) {
  return getLaunchPackets().find((packet) => packet.id === id);
}

export function saveLaunchPacket(packet: LaunchPacket) {
  if (typeof window === 'undefined') return;
  const packets = getLaunchPackets().filter((item) => item.id !== packet.id);
  const nextPackets = [packet, ...packets].slice(0, 25);
  window.localStorage.setItem(launchPacketsStorageKey, JSON.stringify(nextPackets));
  window.localStorage.setItem(lastLaunchPacketStorageKey, JSON.stringify(packet));
}

export function deleteLaunchPacket(id: string) {
  if (typeof window === 'undefined') return;
  const packets = getLaunchPackets().filter((packet) => packet.id !== id);
  window.localStorage.setItem(launchPacketsStorageKey, JSON.stringify(packets));
  if (packets[0]) {
    window.localStorage.setItem(lastLaunchPacketStorageKey, JSON.stringify(packets[0]));
  } else {
    window.localStorage.removeItem(lastLaunchPacketStorageKey);
  }
}

export function clearLaunchPackets() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(launchPacketsStorageKey);
  window.localStorage.removeItem(lastLaunchPacketStorageKey);
}

function normalizePackets(value: unknown): LaunchPacket[] {
  if (!Array.isArray(value)) return [];
  return value.filter((packet): packet is LaunchPacket => {
    return Boolean(
      packet &&
      typeof packet === 'object' &&
      'id' in packet &&
      'name' in packet &&
      'symbol' in packet &&
      'createdAt' in packet,
    );
  });
}
