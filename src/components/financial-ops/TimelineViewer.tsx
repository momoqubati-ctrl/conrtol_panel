import React from 'react';
import { CheckCircle2, Clock, XCircle, FileText, ArrowRightCircle, Box } from 'lucide-react';

export interface TimelineNode {
  title: string;
  subtitle?: string;
  timestamp?: string;
  status: 'pending' | 'success' | 'failed' | 'processing';
  icon: 'request' | 'lock' | 'reservation' | 'journal' | 'outbox' | 'projection';
}

interface TimelineViewerProps {
  nodes: TimelineNode[];
}

export const TimelineViewer: React.FC<TimelineViewerProps> = ({ nodes }) => {
  const getIcon = (type: string, status: string) => {
    let iconColor = 'text-gray-400';
    let bgColor = 'bg-gray-800';

    if (status === 'success') {
      iconColor = 'text-green-500';
      bgColor = 'bg-green-500/10';
    } else if (status === 'failed') {
      iconColor = 'text-red-500';
      bgColor = 'bg-red-500/10';
    } else if (status === 'processing') {
      iconColor = 'text-amber-500';
      bgColor = 'bg-amber-500/10';
    }

    const wrapper = (IconNode: any) => (
      <div className={`p-2 rounded-full ${bgColor} border border-current ${iconColor}`}>
        <IconNode className="w-5 h-5" />
      </div>
    );

    switch (type) {
      case 'request': return wrapper(ArrowRightCircle);
      case 'lock': return wrapper(Clock);
      case 'reservation': return wrapper(Box);
      case 'journal': return wrapper(FileText);
      case 'outbox': return wrapper(CheckCircle2);
      case 'projection': return wrapper(CheckCircle2);
      default: return wrapper(CheckCircle2);
    }
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {nodes.map((node, idx) => (
          <li key={idx}>
            <div className="relative pb-8">
              {idx !== nodes.length - 1 ? (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-700" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>{getIcon(node.icon, node.status)}</div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5 ml-4">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{node.title}</p>
                    {node.subtitle && <p className="text-sm text-slate-500 mt-1">{node.subtitle}</p>}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-slate-500">
                    {node.timestamp || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
