import { useState } from 'react';
import { ArrowUpDown, ArrowDown, ArrowUp, Gauge, X } from 'lucide-react';
import type { ClientTraffic, SpeedLimit } from '@/types/bandix';
import { formatBytes, formatSpeed, formatMac, shortHostname } from '@/lib/formatters';
import { SpeedLimitModal } from './SpeedLimitModal';

interface ClientsTableProps {
  clients: ClientTraffic[];
  onSetLimit: (mac: string, limit: SpeedLimit | null) => void;
}

type SortField = 'hostname' | 'ip' | 'download' | 'upload' | 'downloadSpeed' | 'uploadSpeed';
type SortDirection = 'asc' | 'desc';

export function ClientsTable({ clients, onSetLimit }: ClientsTableProps) {
  const [sortField, setSortField] = useState<SortField>('downloadSpeed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedClient, setSelectedClient] = useState<ClientTraffic | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedClients = [...clients].sort((a, b) => {
    let aVal: string | number = a[sortField] ?? '';
    let bVal: string | number = b[sortField] ?? '';
    
    if (sortField === 'hostname') {
      aVal = shortHostname(a.hostname).toLowerCase();
      bVal = shortHostname(b.hostname).toLowerCase();
    }
    
    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal);
    }
    
    return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  return (
    <>
      <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium">Connected Devices</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {clients.length} device{clients.length !== 1 ? 's' : ''} active
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort('hostname')}
                  >
                    Device <SortIcon field="hostname" />
                  </button>
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort('ip')}
                  >
                    IP / MAC <SortIcon field="ip" />
                  </button>
                </th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">
                  <button 
                    className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
                    onClick={() => handleSort('downloadSpeed')}
                  >
                    <SortIcon field="downloadSpeed" /> ↓ Speed
                  </button>
                </th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">
                  <button 
                    className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
                    onClick={() => handleSort('uploadSpeed')}
                  >
                    <SortIcon field="uploadSpeed" /> ↑ Speed
                  </button>
                </th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                  <button 
                    className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
                    onClick={() => handleSort('download')}
                  >
                    <SortIcon field="download" /> ↓ Total
                  </button>
                </th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                  <button 
                    className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
                    onClick={() => handleSort('upload')}
                  >
                    <SortIcon field="upload" /> ↑ Total
                  </button>
                </th>
                <th className="p-3 text-xs font-medium text-muted-foreground text-center w-20">
                  Limit
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((client) => (
                <tr 
                  key={client.mac} 
                  className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {shortHostname(client.hostname).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{shortHostname(client.hostname)}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{client.ip}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <p className="text-sm">{client.ip}</p>
                    <p className="text-xs text-muted-foreground">{formatMac(client.mac)}</p>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-sm font-medium text-download">
                      {formatSpeed(client.downloadSpeed)}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-sm font-medium text-upload">
                      {formatSpeed(client.uploadSpeed)}
                    </span>
                  </td>
                  <td className="p-3 text-right hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatBytes(client.download)}
                    </span>
                  </td>
                  <td className="p-3 text-right hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatBytes(client.upload)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {client.speedLimit?.enabled ? (
                      <button
                        onClick={() => onSetLimit(client.mac, null)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-warning/20 text-warning text-xs font-medium hover:bg-warning/30 transition-colors"
                        title="Remove limit"
                      >
                        <Gauge className="w-3 h-3" />
                        <X className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                        title="Set speed limit"
                      >
                        <Gauge className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClient && (
        <SpeedLimitModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onApply={(limit) => {
            onSetLimit(selectedClient.mac, limit);
            setSelectedClient(null);
          }}
        />
      )}
    </>
  );
}
