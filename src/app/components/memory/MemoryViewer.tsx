import { useState, useEffect } from 'react';
import { Trash2, Search, Calendar, Tag, Brain, Download, RefreshCw, Sparkles } from 'lucide-react';

interface Memory {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  metadata?: {
    threadId?: string;
    threadTitle?: string;
    [key: string]: any;
  };
}

interface MemoryViewerProps {
  userId: string;
  apiUrl?: string;
}

export function MemoryViewer({ userId, apiUrl = 'http://localhost:8787' }: MemoryViewerProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemories();
  }, [userId]);

  const fetchMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/memory/list/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch memories');
      const data = await response.json();
      setMemories(data.memories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!confirm('Delete this memory? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`${apiUrl}/api/memory/${memoryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) throw new Error('Failed to delete memory');
      
      setMemories(memories.filter(m => m.id !== memoryId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete memory');
    }
  };

  const filteredMemories = memories.filter(memory => {
    const matchesSearch = searchQuery === '' || 
      memory.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || memory.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const groupedByDate = filteredMemories.reduce((groups, memory) => {
    const date = new Date(memory.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(memory);
    return groups;
  }, {} as Record<string, Memory[]>);

  const getTypeInfo = (type: string) => {
    const types: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
      fact: { 
        icon: '💡', 
        label: 'Fact', 
        color: 'text-blue-700', 
        bg: 'bg-blue-50', 
        border: 'border-blue-200' 
      },
      preference: { 
        icon: '⚙️', 
        label: 'Preference', 
        color: 'text-purple-700', 
        bg: 'bg-purple-50', 
        border: 'border-purple-200' 
      },
      context: { 
        icon: '💬', 
        label: 'Context', 
        color: 'text-gray-700', 
        bg: 'bg-gray-50', 
        border: 'border-gray-200' 
      },
      episode: { 
        icon: '📖', 
        label: 'Episode', 
        color: 'text-green-700', 
        bg: 'bg-green-50', 
        border: 'border-green-200' 
      },
    };
    return types[type] || { 
      icon: '📝', 
      label: type, 
      color: 'text-gray-700', 
      bg: 'bg-gray-50', 
      border: 'border-gray-200' 
    };
  };

  const memoryStats = {
    total: memories.length,
    facts: memories.filter(m => m.type === 'fact').length,
    preferences: memories.filter(m => m.type === 'preference').length,
    context: memories.filter(m => m.type === 'context').length,
    episodes: memories.filter(m => m.type === 'episode').length,
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin size-10 border-4 border-zaki-primary border-t-transparent rounded-full mb-4" />
        <p className="text-sm text-zaki-disabled">Loading your memories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-zaki-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">⚠️</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-900 text-sm">Failed to load memories</p>
            <p className="mt-1 text-xs text-red-700">{error}</p>
            <button
              onClick={fetchMemories}
              className="mt-4 rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="size-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Brain className="size-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zaki-primary">Memory Bank</h3>
            <p className="text-sm text-zaki-disabled mt-0.5">
              ZAKI learns from your conversations and remembers important details
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {memories.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          <div className="rounded-zaki-lg border border-zaki bg-zaki-elevated p-3 text-center">
            <div className="text-2xl font-bold text-zaki-primary">{memoryStats.total}</div>
            <div className="text-xs text-zaki-disabled mt-1">Total</div>
          </div>
          <div className="rounded-zaki-lg border border-blue-200 bg-blue-50 p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{memoryStats.facts}</div>
            <div className="text-xs text-blue-600 mt-1">Facts</div>
          </div>
          <div className="rounded-zaki-lg border border-purple-200 bg-purple-50 p-3 text-center">
            <div className="text-2xl font-bold text-purple-700">{memoryStats.preferences}</div>
            <div className="text-xs text-purple-600 mt-1">Preferences</div>
          </div>
          <div className="rounded-zaki-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <div className="text-2xl font-bold text-gray-700">{memoryStats.context}</div>
            <div className="text-xs text-gray-600 mt-1">Context</div>
          </div>
          <div className="rounded-zaki-lg border border-green-200 bg-green-50 p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{memoryStats.episodes}</div>
            <div className="text-xs text-green-600 mt-1">Episodes</div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      {memories.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zaki-disabled" />
            <input
              type="text"
              placeholder="Search your memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-zaki-lg border border-zaki-strong pl-10 pr-4 py-2.5 text-sm text-zaki-primary placeholder:text-zaki-disabled outline-none focus:border-zaki-focus focus:ring-2 focus:ring-zaki-focus/20 transition-all"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-zaki-disabled" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-zaki-strong bg-white px-3 py-1.5 text-sm text-zaki-primary outline-none focus:border-zaki-focus transition-colors"
              >
                <option value="all">All Types</option>
                <option value="fact">Facts</option>
                <option value="preference">Preferences</option>
                <option value="context">Context</option>
                <option value="episode">Episodes</option>
              </select>
            </div>
            <span className="text-xs text-zaki-disabled">
              {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'}
            </span>
          </div>
        </div>
      )}

      {/* Memory List */}
      {filteredMemories.length === 0 ? (
        <div className="rounded-zaki-2xl border-2 border-dashed border-zaki-strong bg-zaki-base p-12 text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 mb-4">
            <Sparkles className="size-8 text-purple-600" />
          </div>
          <h4 className="text-base font-semibold text-zaki-primary mb-2">
            {searchQuery || typeFilter !== 'all' 
              ? 'No memories match your filters'
              : 'No memories yet'}
          </h4>
          <p className="text-sm text-zaki-disabled max-w-md mx-auto">
            {searchQuery || typeFilter !== 'all'
              ? 'Try adjusting your search or selecting a different memory type'
              : 'Start chatting with ZAKI and important details will be automatically remembered for future conversations'}
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {Object.entries(groupedByDate).map(([date, dayMemories]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white py-2 z-10">
                <div className="flex items-center gap-2 bg-zaki-elevated rounded-full px-3 py-1.5 border border-zaki">
                  <Calendar className="size-3.5 text-zaki-disabled" />
                  <span className="text-xs font-semibold text-zaki-secondary">{date}</span>
                </div>
                <div className="flex-1 h-px bg-zaki" />
              </div>

              {/* Memories */}
              <div className="space-y-3">
                {dayMemories.map((memory) => {
                  const typeInfo = getTypeInfo(memory.type);
                  return (
                    <div
                      key={memory.id}
                      className="group rounded-zaki-xl border border-zaki bg-white p-4 hover:border-zaki-strong hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`size-10 rounded-xl ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-lg">{typeInfo.icon}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeInfo.color} ${typeInfo.bg} ${typeInfo.border}`}>
                              {typeInfo.label}
                            </span>
                            {memory.metadata?.threadTitle && (
                              <span className="text-xs text-zaki-disabled truncate">
                                from: {memory.metadata.threadTitle}
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-zaki-primary leading-relaxed">
                            {memory.content}
                          </p>

                          <div className="text-xs text-zaki-disabled">
                            {new Date(memory.createdAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        <button
                          onClick={() => deleteMemory(memory.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity size-8 rounded-lg hover:bg-red-50 text-zaki-disabled hover:text-red-600 flex items-center justify-center flex-shrink-0"
                          aria-label="Delete memory"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      {memories.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-zaki">
          <button
            onClick={fetchMemories}
            className="inline-flex items-center gap-2 text-sm text-zaki-secondary hover:text-zaki-primary transition-colors"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              const dataStr = JSON.stringify(memories, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `zaki-memories-${new Date().toISOString().split('T')[0]}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-2 text-sm text-zaki-brand hover:underline"
          >
            <Download className="size-4" />
            Export All
          </button>
        </div>
      )}
    </div>
  );
}
