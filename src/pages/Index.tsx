import { useState, useEffect, useCallback } from 'react';
import { Download, Upload, Activity, Users } from 'lucide-react';
import { Header } from '@/components/bandix/Header';
import { StatCard } from '@/components/bandix/StatCard';
import { BandwidthChart } from '@/components/bandix/BandwidthChart';
import { ClientsTable } from '@/components/bandix/ClientsTable';
import { InterfaceSelector } from '@/components/bandix/InterfaceSelector';
import { ServiceControls } from '@/components/bandix/ServiceControls';
import { 
  fetchClients, 
  fetchHistory, 
  fetchTotalTraffic, 
  fetchStatus,
  setSpeedLimit,
  setInterface,
  controlService 
} from '@/lib/bandixApi';
import { formatBytes, formatSpeed } from '@/lib/formatters';
import type { ClientTraffic, BandwidthSnapshot, TotalTraffic, BandixStatus, SpeedLimit } from '@/types/bandix';

/**
 * Bandix Dashboard - Main Page
 * 
 * This dashboard provides real-time network monitoring by:
 * 1. Polling bandixd backend every 1 second for fresh data
 * 2. Displaying bandwidth graphs, client tables, and traffic stats
 * 3. Allowing speed limit control via existing Bandix mechanisms
 * 
 * Data Flow:
 * - bandixd daemon collects traffic data from the specified interface
 * - Data is stored in /tmp/bandix/ as JSON files
 * - This UI reads that data via CGI endpoints or direct file access
 */
const Index = () => {
  const [clients, setClients] = useState<ClientTraffic[]>([]);
  const [history, setHistory] = useState<BandwidthSnapshot[]>([]);
  const [totalTraffic, setTotalTraffic] = useState<TotalTraffic | null>(null);
  const [status, setStatus] = useState<BandixStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentInterface, setCurrentInterface] = useState('br-lan');

  // Calculate current total speeds from all clients
  const totalDownloadSpeed = clients.reduce((sum, c) => sum + c.downloadSpeed, 0);
  const totalUploadSpeed = clients.reduce((sum, c) => sum + c.uploadSpeed, 0);

  /**
   * Fetch all data from bandixd backend
   * This is called every 1 second for real-time updates
   */
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [clientsData, historyData, trafficData, statusData] = await Promise.all([
        fetchClients(),
        fetchHistory(),
        fetchTotalTraffic(),
        fetchStatus(),
      ]);
      
      setClients(clientsData);
      setHistory(historyData);
      setTotalTraffic(trafficData);
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Set up polling interval for real-time updates
   * Polls every 1 second (1000ms)
   */
  useEffect(() => {
    refreshData(); // Initial fetch
    
    const interval = setInterval(refreshData, 1000);
    return () => clearInterval(interval);
  }, [refreshData]);

  /**
   * Handle speed limit changes
   * Uses existing Bandix limit mechanism via bandix-limit command
   */
  const handleSetLimit = async (mac: string, limit: SpeedLimit | null) => {
    try {
      await setSpeedLimit(mac, limit);
      // Refresh to get updated client data with new limits
      await refreshData();
    } catch (error) {
      console.error('Failed to set speed limit:', error);
    }
  };

  /**
   * Handle interface selection change
   * Updates bandixd config and restarts the service
   */
  const handleInterfaceChange = async (iface: string) => {
    try {
      await setInterface(iface);
      setCurrentInterface(iface);
    } catch (error) {
      console.error('Failed to change interface:', error);
    }
  };

  /**
   * Handle service control actions (start/stop/restart)
   */
  const handleServiceControl = async (action: 'start' | 'stop' | 'restart') => {
    try {
      await controlService(action);
      // Wait a moment for service to respond, then refresh
      setTimeout(refreshData, 1000);
    } catch (error) {
      console.error('Failed to control service:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        status={status} 
        isRefreshing={isRefreshing} 
        onRefresh={refreshData} 
      />
      
      <main className="container py-6 px-4 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Download Speed"
            value={formatSpeed(totalDownloadSpeed)}
            icon={<Download className="w-5 h-5" />}
            color="download"
          />
          <StatCard
            title="Upload Speed"
            value={formatSpeed(totalUploadSpeed)}
            icon={<Upload className="w-5 h-5" />}
            color="upload"
          />
          <StatCard
            title="Total Downloaded"
            value={formatBytes(totalTraffic?.download ?? 0)}
            icon={<Activity className="w-5 h-5" />}
            color="primary"
          />
          <StatCard
            title="Active Devices"
            value={clients.length.toString()}
            subtitle="connected now"
            icon={<Users className="w-5 h-5" />}
            color="primary"
          />
        </div>

        {/* Chart */}
        <BandwidthChart data={history} />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Clients Table - Takes up 3 columns on large screens */}
          <div className="lg:col-span-3">
            <ClientsTable clients={clients} onSetLimit={handleSetLimit} />
          </div>

          {/* Sidebar - Controls */}
          <div className="space-y-4">
            <InterfaceSelector 
              currentInterface={currentInterface} 
              onSelect={handleInterfaceChange} 
            />
            <ServiceControls 
              status={status} 
              onControl={handleServiceControl} 
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>Bandix Network Monitor • OpenWRT 24.x</p>
          <p className="text-xs mt-1">Real-time updates every 1 second</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
