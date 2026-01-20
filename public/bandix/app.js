/**
 * Bandix Network Monitor - Application Logic
 * 
 * OVERVIEW:
 * This script provides real-time bandwidth monitoring by:
 * 1. Polling bandixd backend every 1-2 seconds
 * 2. Updating UI elements without page reload
 * 3. Managing speed limits via existing Bandix commands
 * 
 * DATA SOURCE (on OpenWRT):
 * - /tmp/bandix/clients.json  - Per-IP/MAC traffic data
 * - /tmp/bandix/stats.json    - Total traffic statistics
 * - /tmp/bandix/history.json  - Historical data for graphs
 * 
 * API ENDPOINTS:
 * - GET  /cgi-bin/luci/admin/services/bandix/clients  - Client list
 * - GET  /cgi-bin/luci/admin/services/bandix/stats    - Traffic stats
 * - GET  /cgi-bin/luci/admin/services/bandix/status   - Service status
 * - POST /cgi-bin/luci/admin/services/bandix/limit    - Set speed limit
 * - POST /cgi-bin/luci/admin/services/bandix/service  - Control service
 * 
 * SPEED LIMIT:
 * Speed limits are applied using existing Bandix mechanisms.
 * The UI sends limit parameters to the backend which calls bandix-limit.
 * This script does NOT reimplement limit logic.
 */

(function() {
  'use strict';

  // ========================================
  // Configuration
  // ========================================
  
  const CONFIG = {
    // Polling interval in milliseconds (1 second for real-time updates)
    pollInterval: 1000,
    
    // API base path (adjust for your OpenWRT setup)
    apiBase: '/cgi-bin/luci/admin/services/bandix',
    
    // Demo mode disabled - ready for production
    demoMode: false,
    
    // Chart history length (60 seconds)
    historyLength: 60
  };

  // ========================================
  // State
  // ========================================
  
  let state = {
    clients: [],
    history: [],
    totalTraffic: { download: 0, upload: 0, combined: 0 },
    status: { running: true, interface: 'br-lan', uptime: 0 },
    currentInterface: 'br-lan',
    sortField: 'downloadSpeed',
    sortDirection: 'desc',
    selectedClient: null,
    isRefreshing: false
  };

  let pollTimer = null;
  let chart = null;

  // ========================================
  // Utility Functions
  // ========================================
  
  /**
   * Format bytes to human-readable string
   * @param {number} bytes - Number of bytes
   * @param {number} decimals - Decimal places
   * @returns {string} Formatted string (e.g., "1.5 MB")
   */
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }

  /**
   * Format bytes per second to speed string
   * @param {number} bytesPerSec - Bytes per second
   * @returns {string} Formatted string (e.g., "1.5 MB/s")
   */
  function formatSpeed(bytesPerSec) {
    return formatBytes(bytesPerSec, 1) + '/s';
  }

  /**
   * Format kbps to readable string
   * @param {number} kbps - Kilobits per second
   * @returns {string} Formatted string (e.g., "10 Mbps")
   */
  function formatKbps(kbps) {
    if (kbps >= 1000) {
      return (kbps / 1000).toFixed(1) + ' Mbps';
    }
    return kbps + ' Kbps';
  }

  /**
   * Format seconds to duration string
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted string (e.g., "1d 2h 30m")
   */
  function formatDuration(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(days + 'd');
    if (hours > 0) parts.push(hours + 'h');
    if (minutes > 0) parts.push(minutes + 'm');
    
    return parts.length > 0 ? parts.join(' ') : '< 1m';
  }

  /**
   * Get short hostname from full hostname
   * @param {string} hostname - Full hostname
   * @returns {string} Short hostname
   */
  function shortHostname(hostname) {
    if (!hostname) return 'Unknown';
    return hostname.split('.')[0];
  }

  // ========================================
  // Demo Data Generation
  // ========================================
  
  /**
   * Generate demo client data for testing
   * In production, this data comes from bandixd
   */
  function generateDemoClients() {
    const clients = [
      { ip: '192.168.1.100', mac: 'AA:BB:CC:DD:EE:01', hostname: 'iPhone-John', download: 1524288000, upload: 256789000, downloadSpeed: 2500000, uploadSpeed: 450000, lastSeen: Date.now() },
      { ip: '192.168.1.101', mac: 'AA:BB:CC:DD:EE:02', hostname: 'MacBook-Pro', download: 8945678000, upload: 1234567000, downloadSpeed: 15000000, uploadSpeed: 2000000, lastSeen: Date.now() },
      { ip: '192.168.1.102', mac: 'AA:BB:CC:DD:EE:03', hostname: 'Samsung-TV', download: 45678900000, upload: 12345000, downloadSpeed: 25000000, uploadSpeed: 100000, lastSeen: Date.now() },
      { ip: '192.168.1.103', mac: 'AA:BB:CC:DD:EE:04', hostname: 'Gaming-PC', download: 125678900000, upload: 34567890000, downloadSpeed: 45000000, uploadSpeed: 8000000, lastSeen: Date.now(), speedLimit: { enabled: true, downloadLimit: 50000, uploadLimit: 10000 } },
      { ip: '192.168.1.104', mac: 'AA:BB:CC:DD:EE:05', hostname: 'iPad-Kids', download: 5678900000, upload: 234567000, downloadSpeed: 5000000, uploadSpeed: 500000, lastSeen: Date.now() },
      { ip: '192.168.1.105', mac: 'AA:BB:CC:DD:EE:06', hostname: 'Smart-Speaker', download: 123456000, upload: 12345000, downloadSpeed: 128000, uploadSpeed: 64000, lastSeen: Date.now() },
      { ip: '192.168.1.106', mac: 'AA:BB:CC:DD:EE:07', hostname: 'Work-Laptop', download: 23456789000, upload: 8765432000, downloadSpeed: 8000000, uploadSpeed: 3000000, lastSeen: Date.now() },
      { ip: '192.168.1.107', mac: 'AA:BB:CC:DD:EE:08', hostname: 'Security-Cam', download: 567890000, upload: 4567890000, downloadSpeed: 200000, uploadSpeed: 2000000, lastSeen: Date.now() },
    ];
    
    // Add randomness to speeds for realistic effect
    return clients.map(client => ({
      ...client,
      downloadSpeed: Math.floor(client.downloadSpeed * (0.8 + Math.random() * 0.4)),
      uploadSpeed: Math.floor(client.uploadSpeed * (0.8 + Math.random() * 0.4)),
    }));
  }

  /**
   * Generate demo history data for chart
   */
  function generateDemoHistory() {
    const now = Date.now();
    
    if (state.history.length === 0) {
      // Initialize with 60 data points
      for (let i = CONFIG.historyLength - 1; i >= 0; i--) {
        state.history.push({
          timestamp: now - i * 1000,
          download: 20000000 + Math.random() * 40000000,
          upload: 5000000 + Math.random() * 10000000,
        });
      }
    } else {
      // Add new point
      state.history.push({
        timestamp: now,
        download: 20000000 + Math.random() * 40000000,
        upload: 5000000 + Math.random() * 10000000,
      });
      
      // Keep only last N points
      if (state.history.length > CONFIG.historyLength) {
        state.history.shift();
      }
    }
    
    return state.history;
  }

  // ========================================
  // API Functions
  // ========================================
  
  /**
   * Fetch client traffic data from bandixd
   * On OpenWRT: reads from /tmp/bandix/clients.json
   */
  async function fetchClients() {
    if (CONFIG.demoMode) {
      return generateDemoClients();
    }
    
    try {
      const response = await fetch(CONFIG.apiBase + '/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      return await response.json();
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  }

  /**
   * Fetch bandwidth history for graphs
   * On OpenWRT: reads from /tmp/bandix/history.json
   */
  async function fetchHistory() {
    if (CONFIG.demoMode) {
      return generateDemoHistory();
    }
    
    try {
      const response = await fetch(CONFIG.apiBase + '/history');
      if (!response.ok) throw new Error('Failed to fetch history');
      return await response.json();
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  }

  /**
   * Fetch bandixd service status
   * On OpenWRT: checks via ubus or /etc/init.d/bandixd status
   */
  async function fetchStatus() {
    if (CONFIG.demoMode) {
      return {
        running: true,
        interface: state.currentInterface,
        uptime: 86400 + Math.floor(Math.random() * 3600),
        version: '2.1.0'
      };
    }
    
    try {
      const response = await fetch(CONFIG.apiBase + '/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      return await response.json();
    } catch (error) {
      console.error('Error fetching status:', error);
      return { running: false, interface: 'unknown', uptime: 0 };
    }
  }

  /**
   * Set speed limit on a client
   * Uses existing Bandix limit mechanism via bandix-limit command
   * 
   * @param {string} mac - Client MAC address
   * @param {object|null} limit - Speed limit settings or null to remove
   */
  async function setSpeedLimit(mac, limit) {
    if (CONFIG.demoMode) {
      console.log('[DEMO] Setting speed limit for', mac, ':', limit);
      // Update local state for demo
      state.clients = state.clients.map(c => 
        c.mac === mac ? { ...c, speedLimit: limit } : c
      );
      return;
    }
    
    try {
      const response = await fetch(CONFIG.apiBase + '/limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac, limit })
      });
      
      if (!response.ok) throw new Error('Failed to set speed limit');
    } catch (error) {
      console.error('Error setting speed limit:', error);
      alert('Failed to apply speed limit. Check console for details.');
    }
  }

  /**
   * Change monitored interface
   * Updates /etc/config/bandix and restarts bandixd
   */
  async function setInterface(iface) {
    if (CONFIG.demoMode) {
      console.log('[DEMO] Setting interface to', iface);
      state.currentInterface = iface;
      return;
    }
    
    try {
      const response = await fetch(CONFIG.apiBase + '/interface', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interface: iface })
      });
      
      if (!response.ok) throw new Error('Failed to set interface');
      state.currentInterface = iface;
    } catch (error) {
      console.error('Error setting interface:', error);
    }
  }

  /**
   * Control bandixd service (start/stop/restart)
   * Calls /etc/init.d/bandixd [action]
   */
  async function controlService(action) {
    if (CONFIG.demoMode) {
      console.log('[DEMO] Service action:', action);
      return;
    }
    
    try {
      const response = await fetch(CONFIG.apiBase + '/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (!response.ok) throw new Error('Failed to control service');
    } catch (error) {
      console.error('Error controlling service:', error);
    }
  }

  // ========================================
  // UI Update Functions
  // ========================================
  
  /**
   * Update all dashboard data
   * Called on initial load and every poll interval
   */
  async function refreshData() {
    if (state.isRefreshing) return;
    
    state.isRefreshing = true;
    document.getElementById('refreshBtn').classList.add('spinning');
    
    try {
      // Fetch all data in parallel
      const [clients, history, status] = await Promise.all([
        fetchClients(),
        fetchHistory(),
        fetchStatus()
      ]);
      
      state.clients = clients;
      state.history = history;
      state.status = status;
      
      // Calculate totals
      state.totalTraffic = {
        download: clients.reduce((sum, c) => sum + c.download, 0),
        upload: clients.reduce((sum, c) => sum + c.upload, 0),
        combined: clients.reduce((sum, c) => sum + c.download + c.upload, 0)
      };
      
      // Update UI
      updateStats();
      updateChart();
      updateClientsTable();
      updateStatus();
      
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      state.isRefreshing = false;
      document.getElementById('refreshBtn').classList.remove('spinning');
    }
  }

  /**
   * Update stat cards with current totals
   */
  function updateStats() {
    const totalDownSpeed = state.clients.reduce((sum, c) => sum + c.downloadSpeed, 0);
    const totalUpSpeed = state.clients.reduce((sum, c) => sum + c.uploadSpeed, 0);
    
    document.getElementById('totalDownSpeed').textContent = formatSpeed(totalDownSpeed);
    document.getElementById('totalUpSpeed').textContent = formatSpeed(totalUpSpeed);
    document.getElementById('totalDownload').textContent = formatBytes(state.totalTraffic.download);
    document.getElementById('deviceCount').textContent = state.clients.length;
    document.getElementById('clientCount').textContent = state.clients.length;
    
    // Update chart legend
    const currentDown = state.history.length > 0 ? state.history[state.history.length - 1].download : 0;
    const currentUp = state.history.length > 0 ? state.history[state.history.length - 1].upload : 0;
    document.getElementById('currentDown').textContent = formatSpeed(currentDown);
    document.getElementById('currentUp').textContent = formatSpeed(currentUp);
  }

  /**
   * Update service status display
   */
  function updateStatus() {
    const statusDot = document.getElementById('statusDot');
    const serviceDot = document.getElementById('serviceDot');
    const statusText = document.getElementById('statusText');
    const serviceStatus = document.getElementById('serviceStatus');
    const uptime = document.getElementById('uptime');
    const currentInterface = document.getElementById('currentInterface');
    
    if (state.status.running) {
      statusDot.className = 'status-dot running';
      serviceDot.className = 'status-dot running';
      statusText.textContent = 'Running';
      serviceStatus.textContent = 'running';
      serviceStatus.className = 'running';
    } else {
      statusDot.className = 'status-dot stopped';
      serviceDot.className = 'status-dot stopped';
      statusText.textContent = 'Stopped';
      serviceStatus.textContent = 'stopped';
      serviceStatus.className = 'stopped';
    }
    
    uptime.textContent = formatDuration(state.status.uptime);
    currentInterface.textContent = state.status.interface;
  }

  /**
   * Update clients table with sorted data
   */
  function updateClientsTable() {
    const tbody = document.getElementById('clientsTableBody');
    
    // Sort clients
    const sorted = [...state.clients].sort((a, b) => {
      let aVal = a[state.sortField] || '';
      let bVal = b[state.sortField] || '';
      
      if (state.sortField === 'hostname') {
        aVal = shortHostname(aVal).toLowerCase();
        bVal = shortHostname(bVal).toLowerCase();
      }
      
      if (typeof aVal === 'string') {
        return state.sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return state.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    // Render table rows
    tbody.innerHTML = sorted.map(client => `
      <tr>
        <td>
          <div class="client-info">
            <div class="client-avatar">${shortHostname(client.hostname).charAt(0).toUpperCase()}</div>
            <div>
              <div class="client-name">${shortHostname(client.hostname)}</div>
              <div class="client-ip-mobile">${client.ip}</div>
            </div>
          </div>
        </td>
        <td class="hidden-mobile">
          <div class="client-ip">${client.ip}</div>
          <div class="client-mac">${client.mac.toUpperCase()}</div>
        </td>
        <td class="text-right">
          <span class="speed-download">${formatSpeed(client.downloadSpeed)}</span>
        </td>
        <td class="text-right">
          <span class="speed-upload">${formatSpeed(client.uploadSpeed)}</span>
        </td>
        <td class="text-right hidden-sm">
          <span class="traffic-value">${formatBytes(client.download)}</span>
        </td>
        <td class="text-right hidden-sm">
          <span class="traffic-value">${formatBytes(client.upload)}</span>
        </td>
        <td class="text-center">
          <button class="btn-limit ${client.speedLimit?.enabled ? 'active' : ''}" 
                  data-mac="${client.mac}"
                  data-hostname="${client.hostname || 'Unknown'}"
                  title="${client.speedLimit?.enabled ? 'Remove limit' : 'Set speed limit'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
          </button>
        </td>
      </tr>
    `).join('');
    
    // Add click handlers for limit buttons
    tbody.querySelectorAll('.btn-limit').forEach(btn => {
      btn.addEventListener('click', () => {
        const mac = btn.dataset.mac;
        const hostname = btn.dataset.hostname;
        const client = state.clients.find(c => c.mac === mac);
        
        if (client?.speedLimit?.enabled) {
          // Remove limit
          setSpeedLimit(mac, null);
        } else {
          // Open modal to set limit
          openLimitModal(mac, hostname);
        }
      });
    });
  }

  // ========================================
  // Chart Functions
  // ========================================
  
  /**
   * Initialize the bandwidth chart
   * Uses HTML5 Canvas for lightweight rendering (no external libraries)
   */
  function initChart() {
    const canvas = document.getElementById('bandwidthChart');
    chart = {
      canvas: canvas,
      ctx: canvas.getContext('2d')
    };
    
    // Handle resize
    function resizeCanvas() {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  /**
   * Update the bandwidth chart with current data
   */
  function updateChart() {
    if (!chart || !state.history.length) return;
    
    const ctx = chart.ctx;
    const width = chart.canvas.width;
    const height = chart.canvas.height;
    const padding = { top: 10, right: 10, bottom: 10, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Find max value for scaling
    const allValues = state.history.flatMap(p => [p.download, p.upload]);
    const maxValue = Math.max(...allValues, 1);
    
    // Calculate points
    const points = state.history.length;
    const stepX = chartWidth / (points - 1 || 1);
    
    function drawArea(data, color, fillColor) {
      ctx.beginPath();
      ctx.moveTo(padding.left, height - padding.bottom);
      
      data.forEach((point, i) => {
        const x = padding.left + i * stepX;
        const y = height - padding.bottom - (point / maxValue) * chartHeight;
        
        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.lineTo(padding.left + (data.length - 1) * stepX, height - padding.bottom);
      ctx.closePath();
      
      // Fill gradient
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, fillColor);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Draw line
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = padding.left + i * stepX;
        const y = height - padding.bottom - (point / maxValue) * chartHeight;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Draw download (green)
    drawArea(
      state.history.map(p => p.download),
      '#22c55e',
      'rgba(34, 197, 94, 0.3)'
    );
    
    // Draw upload (purple)
    drawArea(
      state.history.map(p => p.upload),
      '#c084fc',
      'rgba(192, 132, 252, 0.3)'
    );
  }

  // ========================================
  // Modal Functions
  // ========================================
  
  /**
   * Open speed limit modal for a client
   */
  function openLimitModal(mac, hostname) {
    state.selectedClient = { mac, hostname };
    
    document.getElementById('limitClientName').textContent = shortHostname(hostname);
    document.getElementById('limitModal').classList.add('visible');
    
    // Reset sliders
    document.getElementById('downLimitSlider').value = 10000;
    document.getElementById('upLimitSlider').value = 5000;
    updateSliderValues();
  }

  /**
   * Close speed limit modal
   */
  function closeLimitModal() {
    state.selectedClient = null;
    document.getElementById('limitModal').classList.remove('visible');
  }

  /**
   * Update slider value displays
   */
  function updateSliderValues() {
    const downValue = parseInt(document.getElementById('downLimitSlider').value);
    const upValue = parseInt(document.getElementById('upLimitSlider').value);
    
    document.getElementById('downLimitValue').textContent = formatKbps(downValue);
    document.getElementById('upLimitValue').textContent = formatKbps(upValue);
  }

  /**
   * Apply speed limit from modal
   */
  function applyLimit() {
    if (!state.selectedClient) return;
    
    const downloadLimit = parseInt(document.getElementById('downLimitSlider').value);
    const uploadLimit = parseInt(document.getElementById('upLimitSlider').value);
    
    setSpeedLimit(state.selectedClient.mac, {
      enabled: true,
      downloadLimit,
      uploadLimit
    });
    
    closeLimitModal();
  }

  // ========================================
  // Event Handlers
  // ========================================
  
  function initEventHandlers() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    
    // Table sorting
    document.querySelectorAll('.clients-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (state.sortField === field) {
          state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortField = field;
          state.sortDirection = 'desc';
        }
        updateClientsTable();
      });
    });
    
    // Interface selector
    document.querySelectorAll('.interface-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const iface = btn.dataset.interface;
        document.querySelectorAll('.interface-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setInterface(iface);
      });
    });
    
    // Service controls
    document.getElementById('btnStop').addEventListener('click', () => {
      if (confirm('Are you sure you want to stop bandixd?')) {
        controlService('stop');
      }
    });
    
    document.getElementById('btnRestart').addEventListener('click', () => {
      controlService('restart');
    });
    
    // Modal events
    document.getElementById('closeModal').addEventListener('click', closeLimitModal);
    document.getElementById('cancelLimit').addEventListener('click', closeLimitModal);
    document.getElementById('applyLimit').addEventListener('click', applyLimit);
    
    document.getElementById('limitModal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        closeLimitModal();
      }
    });
    
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('downLimitSlider').value = btn.dataset.down;
        document.getElementById('upLimitSlider').value = btn.dataset.up;
        updateSliderValues();
      });
    });
    
    // Sliders
    document.getElementById('downLimitSlider').addEventListener('input', updateSliderValues);
    document.getElementById('upLimitSlider').addEventListener('input', updateSliderValues);
  }

  // ========================================
  // Initialization
  // ========================================
  
  /**
   * Start the application
   */
  function init() {
    console.log('Bandix Network Monitor starting...');
    
    // Initialize chart
    initChart();
    
    // Set up event handlers
    initEventHandlers();
    
    // Initial data fetch
    refreshData();
    
    // Start polling for real-time updates
    // This polls every 1 second for near real-time data
    pollTimer = setInterval(refreshData, CONFIG.pollInterval);
    
    console.log('Bandix Network Monitor ready. Polling every', CONFIG.pollInterval, 'ms');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
