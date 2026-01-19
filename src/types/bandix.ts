/**
 * Bandix Data Types
 * These types represent the data structures from the bandixd backend
 * Data is typically read from /tmp/bandix/ files on OpenWRT
 */

export interface ClientTraffic {
  ip: string;
  mac: string;
  hostname?: string;
  download: number;      // bytes
  upload: number;        // bytes
  downloadSpeed: number; // bytes/sec
  uploadSpeed: number;   // bytes/sec
  lastSeen: number;      // timestamp
  speedLimit?: SpeedLimit;
}

export interface SpeedLimit {
  enabled: boolean;
  downloadLimit: number; // kbps
  uploadLimit: number;   // kbps
}

export interface BandwidthSnapshot {
  timestamp: number;
  download: number; // bytes/sec
  upload: number;   // bytes/sec
}

export interface TotalTraffic {
  download: number;  // total bytes
  upload: number;    // total bytes
  combined: number;  // total bytes
}

export interface BandixStatus {
  running: boolean;
  interface: string;
  uptime: number;
  version?: string;
}

export interface BandixConfig {
  interface: string;
  pollInterval: number;
  enableLimits: boolean;
}
