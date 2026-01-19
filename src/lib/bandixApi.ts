/**
 * Bandix API Client
 * 
 * This module handles communication with the bandixd backend.
 * On OpenWRT, this reads data from:
 * - /tmp/bandix/clients.json - Per-IP/MAC traffic data
 * - /tmp/bandix/stats.json - Total traffic statistics
 * - /tmp/bandix/history.json - Historical bandwidth data for graphs
 * 
 * Speed limits are applied using existing Bandix mechanisms:
 * - /usr/bin/bandix-limit for applying limits
 * - /etc/config/bandix for configuration
 */

import type { 
  ClientTraffic, 
  BandwidthSnapshot, 
  TotalTraffic, 
  BandixStatus,
  SpeedLimit 
} from '@/types/bandix';

// In production on OpenWRT, this would be the actual API endpoint
const API_BASE = '/cgi-bin/luci/admin/services/bandix';

// Demo mode flag - set to false when deploying to OpenWRT
const DEMO_MODE = true;

/**
 * Generate realistic demo data for development/preview
 */
function generateDemoClients(): ClientTraffic[] {
  const clients: ClientTraffic[] = [
    { ip: '192.168.1.100', mac: 'AA:BB:CC:DD:EE:01', hostname: 'iPhone-John', download: 1524288000, upload: 256789000, downloadSpeed: 2500000, uploadSpeed: 450000, lastSeen: Date.now() },
    { ip: '192.168.1.101', mac: 'AA:BB:CC:DD:EE:02', hostname: 'MacBook-Pro', download: 8945678000, upload: 1234567000, downloadSpeed: 15000000, uploadSpeed: 2000000, lastSeen: Date.now() },
    { ip: '192.168.1.102', mac: 'AA:BB:CC:DD:EE:03', hostname: 'Samsung-TV', download: 45678900000, upload: 12345000, downloadSpeed: 25000000, uploadSpeed: 100000, lastSeen: Date.now() },
    { ip: '192.168.1.103', mac: 'AA:BB:CC:DD:EE:04', hostname: 'Gaming-PC', download: 125678900000, upload: 34567890000, downloadSpeed: 45000000, uploadSpeed: 8000000, lastSeen: Date.now(), speedLimit: { enabled: true, downloadLimit: 50000, uploadLimit: 10000 } },
    { ip: '192.168.1.104', mac: 'AA:BB:CC:DD:EE:05', hostname: 'iPad-Kids', download: 5678900000, upload: 234567000, downloadSpeed: 5000000, uploadSpeed: 500000, lastSeen: Date.now() },
    { ip: '192.168.1.105', mac: 'AA:BB:CC:DD:EE:06', hostname: 'Smart-Speaker', download: 123456000, upload: 12345000, downloadSpeed: 128000, uploadSpeed: 64000, lastSeen: Date.now() },
    { ip: '192.168.1.106', mac: 'AA:BB:CC:DD:EE:07', hostname: 'Work-Laptop', download: 23456789000, upload: 8765432000, downloadSpeed: 8000000, uploadSpeed: 3000000, lastSeen: Date.now() },
    { ip: '192.168.1.107', mac: 'AA:BB:CC:DD:EE:08', hostname: 'Security-Cam', download: 567890000, upload: 4567890000, downloadSpeed: 200000, uploadSpeed: 2000000, lastSeen: Date.now() },
  ];
  
  // Add some randomness to speeds
  return clients.map(client => ({
    ...client,
    downloadSpeed: client.downloadSpeed * (0.8 + Math.random() * 0.4),
    uploadSpeed: client.uploadSpeed * (0.8 + Math.random() * 0.4),
  }));
}

let historyBuffer: BandwidthSnapshot[] = [];

function generateDemoHistory(): BandwidthSnapshot[] {
  const now = Date.now();
  
  if (historyBuffer.length === 0) {
    // Initialize with 60 data points (last 60 seconds)
    for (let i = 59; i >= 0; i--) {
      historyBuffer.push({
        timestamp: now - i * 1000,
        download: 20000000 + Math.random() * 40000000,
        upload: 5000000 + Math.random() * 10000000,
      });
    }
  } else {
    // Add new point and remove oldest
    historyBuffer.push({
      timestamp: now,
      download: 20000000 + Math.random() * 40000000,
      upload: 5000000 + Math.random() * 10000000,
    });
    if (historyBuffer.length > 60) {
      historyBuffer.shift();
    }
  }
  
  return [...historyBuffer];
}

function generateDemoTotal(): TotalTraffic {
  const clients = generateDemoClients();
  const download = clients.reduce((sum, c) => sum + c.download, 0);
  const upload = clients.reduce((sum, c) => sum + c.upload, 0);
  return { download, upload, combined: download + upload };
}

/**
 * Fetch current client traffic data
 * On OpenWRT: reads from /tmp/bandix/clients.json
 */
export async function fetchClients(): Promise<ClientTraffic[]> {
  if (DEMO_MODE) {
    return generateDemoClients();
  }
  
  const response = await fetch(`${API_BASE}/clients`);
  if (!response.ok) throw new Error('Failed to fetch clients');
  return response.json();
}

/**
 * Fetch bandwidth history for graphs
 * On OpenWRT: reads from /tmp/bandix/history.json
 */
export async function fetchHistory(): Promise<BandwidthSnapshot[]> {
  if (DEMO_MODE) {
    return generateDemoHistory();
  }
  
  const response = await fetch(`${API_BASE}/history`);
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
}

/**
 * Fetch total traffic statistics
 * On OpenWRT: reads from /tmp/bandix/stats.json
 */
export async function fetchTotalTraffic(): Promise<TotalTraffic> {
  if (DEMO_MODE) {
    return generateDemoTotal();
  }
  
  const response = await fetch(`${API_BASE}/stats`);
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
}

/**
 * Fetch bandixd service status
 * On OpenWRT: checks service status via ubus or /etc/init.d/bandixd
 */
export async function fetchStatus(): Promise<BandixStatus> {
  if (DEMO_MODE) {
    return {
      running: true,
      interface: 'br-lan',
      uptime: 86400 + Math.floor(Math.random() * 3600),
      version: '2.1.0',
    };
  }
  
  const response = await fetch(`${API_BASE}/status`);
  if (!response.ok) throw new Error('Failed to fetch status');
  return response.json();
}

/**
 * Apply speed limit to a client
 * Uses existing Bandix limit mechanism (bandix-limit command)
 * 
 * @param mac - Client MAC address
 * @param limit - Speed limit settings (null to remove limit)
 */
export async function setSpeedLimit(mac: string, limit: SpeedLimit | null): Promise<void> {
  if (DEMO_MODE) {
    console.log(`[DEMO] Setting speed limit for ${mac}:`, limit);
    return;
  }
  
  const response = await fetch(`${API_BASE}/limit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mac, limit }),
  });
  
  if (!response.ok) throw new Error('Failed to set speed limit');
}

/**
 * Change monitored interface
 * Updates /etc/config/bandix and restarts bandixd
 */
export async function setInterface(iface: string): Promise<void> {
  if (DEMO_MODE) {
    console.log(`[DEMO] Setting interface to ${iface}`);
    return;
  }
  
  const response = await fetch(`${API_BASE}/interface`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interface: iface }),
  });
  
  if (!response.ok) throw new Error('Failed to set interface');
}

/**
 * Control bandixd service (start/stop/restart)
 */
export async function controlService(action: 'start' | 'stop' | 'restart'): Promise<void> {
  if (DEMO_MODE) {
    console.log(`[DEMO] Service action: ${action}`);
    return;
  }
  
  const response = await fetch(`${API_BASE}/service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  
  if (!response.ok) throw new Error('Failed to control service');
}
