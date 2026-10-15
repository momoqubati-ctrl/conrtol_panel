import React from 'react';

interface AuditEvent {
  id: string;
  type: string;
  actor: string;
  source_type: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  correlation_id: string;
}

const TYPE_COLORS: Record<string, string> = {
  'SETTLEMENT_BATCH_APPROVED': 'border-yellow-500 bg-yellow-50 text-yellow-800',
  'COMPLETED': 'border-indigo-500 bg-indigo-50 text-indigo-800', // Represents execution
  'FAILED': 'border-red-500 bg-red-50 text-red-800'
};

const DEFAULT_COLOR = 'border-gray-500 bg-gray-50 text-gray-800';

export const AuditEventCard: React.FC<{ event: AuditEvent }> = ({ event }) => {
  const colorClass = TYPE_COLORS[event.type] || DEFAULT_COLOR;

  return (
    <div className="flex mb-6 last:mb-0">
      {/* Timeline Line & Dot */}
      <div className="flex flex-col items-center mr-4">
        <div className={`w-3 h-3 rounded-full mt-1.5 ${colorClass.split(' ')[0].replace('border-', 'bg-')}`} />
        <div className="w-px h-full bg-gray-300 mt-2" />
      </div>

      {/* Card Content */}
      <div className={`flex-1 p-4 rounded-lg border-l-4 shadow-sm bg-white ${colorClass.split(' ')[0]}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-gray-900">{event.type.replace(/_/g, ' ')}</span>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600">
              {event.source_type}
            </span>
          </div>
          <div className="text-sm text-gray-500 font-mono">
            {new Date(event.created_at).toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>

        <div className="text-sm text-gray-700 mb-3">
          <span className="font-semibold text-gray-900">{event.actor}</span> acted on <span className="font-mono">{event.entity_type}</span> #{event.entity_id.split('-')[0]}
        </div>

        <div className="bg-gray-100 p-2 rounded flex items-center space-x-2">
          <span className="text-xs text-gray-500 uppercase font-bold">Correlation ID:</span>
          <span className="font-mono text-xs text-gray-800">{event.correlation_id}</span>
        </div>
      </div>
    </div>
  );
};
