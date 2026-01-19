# Bandix Modern UI - Installation Guide for OpenWRT 24.x

## Overview

This is a modern, standalone web interface for the Bandix bandwidth monitor on OpenWRT. It provides:

- Real-time bandwidth monitoring with live graphs
- Per-IP/MAC traffic usage display
- Speed limit controls (using existing Bandix mechanisms)
- Interface selection (LAN/WAN)
- Service control (start/stop/restart)
- Responsive design for desktop and mobile

## Prerequisites

- OpenWRT 24.x installed and running
- `bandixd` from timsaya/openwrt-bandix already installed
- `luci-app-bandix` installed (provides the CGI endpoints)

## File Structure

```
/www/bandix/
├── index.html    # Main HTML page
├── style.css     # All styles (no external dependencies)
├── app.js        # Application logic with detailed comments
└── README.md     # This file
```

## Installation Steps

### Step 1: Create the directory

```bash
mkdir -p /www/bandix
```

### Step 2: Copy the files

Transfer all files to your OpenWRT router:

```bash
# Option A: Using SCP from your computer
scp index.html style.css app.js root@192.168.1.1:/www/bandix/

# Option B: Using wget if files are hosted
cd /www/bandix
wget http://your-server/bandix/index.html
wget http://your-server/bandix/style.css
wget http://your-server/bandix/app.js
```

### Step 3: Set permissions

```bash
chmod 644 /www/bandix/*
```

### Step 4: Configure the API endpoint

Edit `app.js` and update the configuration at the top of the file:

```javascript
const CONFIG = {
  // Set to false for production
  demoMode: false,
  
  // Adjust if your LuCI path is different
  apiBase: '/cgi-bin/luci/admin/services/bandix',
  
  // Polling interval (1000ms = 1 second)
  pollInterval: 1000
};
```

### Step 5: Access the UI

Open your browser and navigate to:

```
http://192.168.1.1/bandix
```

## Backend API Requirements

The UI expects the following CGI endpoints to exist (provided by luci-app-bandix):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cgi-bin/luci/admin/services/bandix/clients` | GET | Returns client traffic data |
| `/cgi-bin/luci/admin/services/bandix/history` | GET | Returns bandwidth history for graphs |
| `/cgi-bin/luci/admin/services/bandix/status` | GET | Returns bandixd service status |
| `/cgi-bin/luci/admin/services/bandix/limit` | POST | Set speed limit on a client |
| `/cgi-bin/luci/admin/services/bandix/interface` | POST | Change monitored interface |
| `/cgi-bin/luci/admin/services/bandix/service` | POST | Control bandixd service |

### Expected Data Formats

**GET /clients Response:**
```json
[
  {
    "ip": "192.168.1.100",
    "mac": "AA:BB:CC:DD:EE:01",
    "hostname": "iPhone-John",
    "download": 1524288000,
    "upload": 256789000,
    "downloadSpeed": 2500000,
    "uploadSpeed": 450000,
    "lastSeen": 1705420800000,
    "speedLimit": {
      "enabled": false,
      "downloadLimit": 0,
      "uploadLimit": 0
    }
  }
]
```

**GET /history Response:**
```json
[
  {
    "timestamp": 1705420800000,
    "download": 25000000,
    "upload": 5000000
  }
]
```

**GET /status Response:**
```json
{
  "running": true,
  "interface": "br-lan",
  "uptime": 86400,
  "version": "2.1.0"
}
```

**POST /limit Request:**
```json
{
  "mac": "AA:BB:CC:DD:EE:01",
  "limit": {
    "enabled": true,
    "downloadLimit": 10000,
    "uploadLimit": 5000
  }
}
```

## Speed Limit Implementation

**IMPORTANT:** This UI does NOT implement its own speed limiting logic.

Speed limits are applied using the existing Bandix mechanisms:

1. User sets limit via the UI modal
2. UI sends POST request to `/limit` endpoint
3. Backend (luci-app-bandix) calls `bandix-limit` command
4. Bandix applies the limit using its existing tc/iptables rules

To remove a limit, the UI sends `limit: null`.

## Customization

### Changing Colors

Edit `style.css` and modify the CSS variables at the top:

```css
:root {
  --color-primary: #22d3ee;      /* Main accent color */
  --color-download: #22c55e;     /* Download speed color */
  --color-upload: #c084fc;       /* Upload speed color */
  --color-bg: #0a0e1a;           /* Background color */
  /* ... more variables */
}
```

### Changing Poll Interval

Edit `app.js` and modify:

```javascript
const CONFIG = {
  pollInterval: 2000  // Change to 2 seconds
};
```

## Troubleshooting

### UI shows "Checking..." forever

1. Check if bandixd is running: `ps | grep bandix`
2. Check if the API endpoint is accessible: `curl http://192.168.1.1/cgi-bin/luci/admin/services/bandix/status`
3. Check browser console for errors (F12 → Console tab)

### No data in client table

1. Verify bandixd is collecting data: `cat /tmp/bandix/clients.json`
2. Check that the interface is correct (br-lan for most setups)

### Speed limit not working

1. Confirm bandix-limit command exists: `which bandix-limit`
2. Check if limit was applied: `tc -s qdisc show`
3. Verify the limit endpoint is working: check LuCI logs

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

No Internet Explorer support (uses modern ES6+ features).

## License

This UI is provided as-is for use with OpenWRT and Bandix.
Backend logic remains the property of timsaya/openwrt-bandix.
