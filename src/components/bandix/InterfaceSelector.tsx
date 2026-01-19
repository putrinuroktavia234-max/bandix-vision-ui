import { Network } from 'lucide-react';

interface InterfaceSelectorProps {
  currentInterface: string;
  onSelect: (iface: string) => void;
}

const INTERFACES = [
  { id: 'br-lan', label: 'LAN Bridge', description: 'Monitor all LAN traffic' },
  { id: 'eth0', label: 'WAN', description: 'Monitor WAN interface' },
  { id: 'wlan0', label: 'WiFi 2.4GHz', description: 'Monitor 2.4GHz wireless' },
  { id: 'wlan1', label: 'WiFi 5GHz', description: 'Monitor 5GHz wireless' },
];

export function InterfaceSelector({ currentInterface, onSelect }: InterfaceSelectorProps) {
  return (
    <div className="card-gradient rounded-xl border border-border p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium">Monitor Interface</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {INTERFACES.map((iface) => (
          <button
            key={iface.id}
            onClick={() => onSelect(iface.id)}
            className={`p-3 rounded-lg text-left transition-all ${
              currentInterface === iface.id
                ? 'bg-primary/20 border border-primary/50 ring-1 ring-primary/30'
                : 'bg-secondary/50 border border-transparent hover:bg-secondary'
            }`}
          >
            <p className={`text-sm font-medium ${currentInterface === iface.id ? 'text-primary' : ''}`}>
              {iface.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{iface.id}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
