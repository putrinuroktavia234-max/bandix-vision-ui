/**
 * Formatting utilities for bandwidth and traffic data
 */

/**
 * Format bytes to human-readable string (B, KB, MB, GB, TB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format bytes per second to human-readable speed string
 */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0 B/s';
  
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  
  return `${parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format kbps to human-readable speed string
 */
export function formatKbps(kbps: number): string {
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(1)} Mbps`;
  }
  return `${kbps} Kbps`;
}

/**
 * Format seconds to human-readable duration
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : '< 1m';
}

/**
 * Format MAC address with proper casing
 */
export function formatMac(mac: string): string {
  return mac.toUpperCase();
}

/**
 * Get a short hostname from a full hostname
 */
export function shortHostname(hostname?: string): string {
  if (!hostname) return 'Unknown';
  // Remove domain suffix if present
  return hostname.split('.')[0];
}
