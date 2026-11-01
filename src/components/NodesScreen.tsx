import React, { useState } from 'react';
import { Search, Star, Radio, Plus, Check, RefreshCw, X, Globe } from 'lucide-react';
import { ServerNode } from '../types/index.ts';
import { getLatencyClassification, parseConfigUri, TRANSLATIONS } from '../utils/network-core.ts';
import { useDialog } from '../utils/use-dialog.ts';

interface NodesScreenProps {
  nodes: ServerNode[];
  setNodes: React.Dispatch<React.SetStateAction<ServerNode[]>>;
  activeNode: ServerNode;
  onSelectNode: (node: ServerNode) => void;
  language: 'en' | 'fa';
  onTestPingAll: () => void;
  isPingingAll: boolean;
}

export const NodesScreen: React.FC<NodesScreenProps> = ({
  nodes,
  setNodes,
  activeNode,
  onSelectNode,
  language,
  onTestPingAll,
  isPingingAll,
}) => {
  const t = TRANSLATIONS[language];
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importError, setImportError] = useState('');
  const importDialogRef = useDialog(isImportModalOpen, () => setIsImportModalOpen(false));

  // Filtering
  const filteredNodes = nodes.filter(node => {
    const matchesSearch =
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      node.country.toLowerCase().includes(search.toLowerCase()) ||
      node.protocol.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedFilter === 'favorites') return node.isFavorite;
    if (selectedFilter === 'all') return true;
    return node.protocol.toLowerCase() === selectedFilter.toLowerCase();
  });

  const toggleFavorite = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(prev =>
      prev.map(n => (n.id === nodeId ? { ...n, isFavorite: !n.isFavorite } : n))
    );
  };

  const handleImportConfig = () => {
    setImportError('');
    if (!importInput.trim()) {
      setImportError('Please enter a valid configuration URI or subscription URL.');
      return;
    }

    const parsed = parseConfigUri(importInput);
    if (!parsed || !parsed.host) {
      setImportError(
        'Invalid configuration link. Supported schemes: vless://, vmess://, hysteria2://, trojan://, ss://, wireguard://'
      );
      return;
    }

    const newNode: ServerNode = {
      id: parsed.id || `node-${Date.now()}`,
      name: parsed.name ?? 'Custom Node',
      country: parsed.country || 'Global',
      countryCode: parsed.countryCode || 'UN',
      flag: parsed.flag || '🌐',
      host: parsed.host || 'node.custom.net',
      port: parsed.port || 443,
      protocol: parsed.protocol || 'VLESS',
      cipher: parsed.cipher || 'ChaCha20-Poly1305',
      pingMs: Math.floor(Math.random() * 60) + 40,
      jitterMs: 1.5,
      loadPercent: 20,
      isFavorite: true,
      tags: ['Imported', parsed.protocol || 'VLESS'],
      features: {
        udp: true,
        reality: parsed.protocol === 'VLESS',
        multiplex: true,
      },
    };

    setNodes(prev => [newNode, ...prev]);
    onSelectNode(newNode);
    setImportInput('');
    setIsImportModalOpen(false);
  };

  const loadPresetExample = (type: 'vless' | 'hy2') => {
    if (type === 'vless') {
      setImportInput('vless://e83f2142-881b-4395-8bc2-a27918b9554e@vless.helsinki.core:443?security=reality&sni=www.microsoft.com&fp=chrome#Helsinki-HighSpeed-Reality');
    } else {
      setImportInput('hysteria2://auth-key-token@hy2.frankfurt.fast:8443?insecure=0&sni=gateway.apple.com#Frankfurt-QUIC-BBRv3');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white font-['Space_Grotesk']">
            {t.nodes}
          </h2>
          <p className="text-xs text-[#b9cacb] font-mono mt-0.5">
            Distributed low-latency routing endpoints with real-time ping probing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onTestPingAll}
            disabled={isPingingAll}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono font-medium text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00f2fe] ${isPingingAll ? 'animate-spin' : ''}`} />
            <span>{isPingingAll ? t.importing : t.batchPing}</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#00f2fe]/20 hover:bg-[#00f2fe]/30 border border-[#00f2fe]/40 text-xs font-mono font-semibold text-[#e0fdff] transition-all cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.15)]"
          >
            <Plus className="w-3.5 h-3.5 text-[#00f2fe]" />
            <span>{t.importConfig}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#849495]" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchNodes}
            aria-label={t.searchNodes}
            dir="ltr"
            className="w-full bg-[#171b26]/80 border border-white/10 rounded-xl ps-10 pe-10 py-2 text-xs md:text-sm text-white placeholder-[#849495] focus:outline-none focus:border-[#00f2fe]/50 font-mono"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Filter Tabs (Functional segmented buttons) */}
        <div className="flex items-center gap-1 p-1 bg-[#171b26]/70 rounded-xl border border-white/10 overflow-x-auto">
          {[
            { id: 'all', label: 'All Nodes' },
            { id: 'favorites', label: 'Favorites' },
            { id: 'vless', label: 'VLESS' },
            { id: 'hysteria2', label: 'Hysteria 2' },
            { id: 'wireguard', label: 'WireGuard' },
            { id: 'shadowsocks', label: 'SS 2022' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                selectedFilter === f.id
                  ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                  : 'text-[#849495] hover:text-white hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {filteredNodes.map(node => {
          const isSelected = activeNode.id === node.id;
          const latInfo = getLatencyClassification(node.pingMs);

          return (
            <div
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`Select ${node.name}, ${node.country}, ${node.protocol}`}
              aria-pressed={isSelected}
              onClick={() => onSelectNode(node)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectNode(node);
                }
              }}
              className={`liquid-glass rounded-2xl p-4.5 cursor-pointer transition-all duration-300 relative group overflow-hidden focus-visible:ring-2 focus-visible:ring-[#00f2fe]/70 ${
                isSelected
                  ? 'border-[#00f2fe]/60 bg-[#1c2a38]/80 shadow-[0_0_24px_rgba(0,242,254,0.15)]'
                  : 'hover:border-white/20 hover:bg-[#1f2433]/70'
              }`}
            >
              {/* Top Row: Flag, Name, Favorite Star */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0">
                    {node.flag}
                  </span>
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-white font-['Space_Grotesk'] leading-tight">
                      {node.name}
                    </h3>
                    <p className="text-xs text-[#849495] font-mono mt-0.5">
                      {node.country} ·{' '}
                      <span dir="ltr">
                        {node.host}:{node.port}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={e => toggleFavorite(node.id, e)}
                  aria-label={node.isFavorite ? 'Remove favorite' : 'Add favorite'}
                  className="p-1 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                >
                  <Star
                    className={`w-4 h-4 ${node.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`}
                  />
                </button>
              </div>

              {/* Protocol tags unboxed with middle dot */}
              <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-[#b9cacb]">
                <span className="text-[#00f2fe] font-semibold">{node.protocol}</span>
                <span>·</span>
                <span className="truncate max-w-[130px]" title={node.cipher} dir="ltr">{node.cipher}</span>
                {node.features.reality && (
                  <>
                    <span>·</span>
                    <span className="text-[#4edea3]">REALITY</span>
                  </>
                )}
              </div>

              {/* Ping Latency & Load Level */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                {/* Ping latency */}
                <div className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#00f2fe]" />
                  <span className="text-xs font-mono font-bold tabular-nums text-white">
                    {node.pingMs > 0 ? `${node.pingMs} ms` : 'timeout'}
                  </span>
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${latInfo.bgClass} ${latInfo.textClass}`}>
                    {latInfo.label}
                  </span>
                </div>

                {/* Connect button / Active tag */}
                <div>
                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 px-2.5 py-1 rounded-lg border border-[#00f2fe]/30">
                      <Check className="w-3 h-3" aria-hidden="true" />
                      {t.activeLabel}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onSelectNode(node);
                      }}
                      className="text-[11px] font-mono text-[#b9cacb] hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
                    >
                      {t.select}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredNodes.length === 0 && (
        <div className="liquid-glass rounded-2xl p-12 text-center">
          <Globe className="w-10 h-10 text-slate-500 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-white font-['Space_Grotesk']">{t.noNodesFound}</h3>
          <p className="text-xs text-[#849495] font-mono mt-1">{t.noNodesHint}</p>
        </div>
      )}

      {/* Import Configuration Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md" role="presentation">
          <div
            ref={importDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-node-title"
            className="liquid-glass rounded-2xl max-w-lg w-full p-6 border border-white/20 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#00f2fe]" aria-hidden="true" />
                <h3 id="import-node-title" className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Import Node Configuration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                aria-label={t.close}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-[#b9cacb]">
              Paste a standard subscription or protocol link (VLESS, Hysteria 2, WireGuard, Shadowsocks, Trojan):
            </p>

            <textarea
              rows={4}
              value={importInput}
              onChange={e => setImportInput(e.target.value)}
              placeholder="vless://... or hysteria2://... or ss://..."
              aria-label="Configuration URI"
              spellCheck={false}
              dir="ltr"
              className="w-full bg-[#0a0e18] border border-white/15 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00f2fe]/60"
            />

            {importError && (
              <p className="text-xs text-red-400 font-mono" role="alert">{importError}</p>
            )}

            {/* Quick Presets for User Testing */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Load test preset:</span>
              <button
                type="button"
                onClick={() => loadPresetExample('vless')}
                className="text-[11px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[#00f2fe] border border-white/10"
              >
                + VLESS REALITY Link
              </button>
              <button
                type="button"
                onClick={() => loadPresetExample('hy2')}
                className="text-[11px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[#4edea3] border border-white/10"
              >
                + Hysteria 2 QUIC Link
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-mono rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportConfig}
                className="px-4 py-2 text-xs font-mono font-bold rounded-xl bg-[#00f2fe] hover:bg-[#00f2fe]/90 text-slate-950 transition-colors shadow-lg shadow-[#00f2fe]/20"
              >
                Add Node to Core
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
