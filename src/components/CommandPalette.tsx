import React, { useState, useEffect } from 'react';
import { Search, Building2, User, FileText, Activity } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from './ui/dialog';
import { Badge } from './ui/badge';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  agencies: any[];
  onSelectAgency?: (agencyId: string) => void;
}

export function CommandPalette({ isOpen, onClose, agencies, onSelectAgency }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (query.length === 0) {
      setResults([]);
      return;
    }

    const searchLower = query.toLowerCase();
    const agencyResults = agencies.filter(
      (agency) =>
        agency.name.toLowerCase().includes(searchLower) ||
        agency.subdomain.toLowerCase().includes(searchLower) ||
        agency.ein?.toLowerCase().includes(searchLower) ||
        agency.contact.toLowerCase().includes(searchLower)
    );

    setResults(agencyResults);
  }, [query, agencies]);

  const handleSelect = (agency: any) => {
    if (onSelectAgency) {
      onSelectAgency(agency.id);
    }
    onClose();
    setQuery('');
  };

  const getEnvironmentBadge = (env: string) => {
    const configs: Record<string, { icon: string; color: string }> = {
      Test: { icon: '🧪', color: 'bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD]' },
      Production: { icon: '🏥', color: 'bg-[#D1FAE5] text-[#047857] border-[#A7F3D0]' },
      Trial: { icon: '🌱', color: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' },
      Onboarding: { icon: '🚧', color: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]' },
    };
    const config = configs[env] || configs.Production;
    return (
      <Badge className={`${config.color} text-xs`}>
        <span className="mr-1">{config.icon}</span>
        {env}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 max-w-2xl">
        <div className="border-b border-[#e2e8f0] px-4 py-3 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search agencies, users, domains, EINs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-[#0f172a] placeholder:text-[#94a3b8]"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.length === 0 ? (
            <div className="p-8 text-center text-[#64748b]">
              <p className="text-sm">Start typing to search agencies, users, domains, or EINs</p>
              <p className="text-xs mt-2">
                <kbd className="px-2 py-1 text-xs bg-[#f8fafc] border border-[#e2e8f0] rounded">Cmd</kbd>
                {' + '}
                <kbd className="px-2 py-1 text-xs bg-[#f8fafc] border border-[#e2e8f0] rounded">K</kbd>
                {' to open'}
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-[#64748b]">
              <p className="text-sm">No results found for "{query}"</p>
            </div>
          ) : (
            <div>
              <div className="px-3 py-2 text-xs text-[#64748b] bg-[#f8fafc] border-b border-[#e2e8f0]">
                Agencies ({results.length})
              </div>
              {results.map((agency) => (
                <button
                  key={agency.id}
                  onClick={() => handleSelect(agency)}
                  className="w-full px-4 py-3 hover:bg-[#f8fafc] transition-colors border-b border-[#e2e8f0] last:border-b-0 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-[#0966CC]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-[#0f172a] truncate">{agency.name}</p>
                        {getEnvironmentBadge(agency.environment)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#64748b]">
                        <span className="truncate">{agency.subdomain}</span>
                        {agency.ein && (
                          <>
                            <span>•</span>
                            <span>EIN: {agency.ein}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
