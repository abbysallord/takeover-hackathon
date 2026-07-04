import { useState } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export function LeadsPage() {
  const [columns] = useState([
    { id: 'col-0', name: 'New Inbound' },
    { id: 'col-1', name: 'AI Contacted' },
    { id: 'col-2', name: 'Quote Sent' },
    { id: 'col-3', name: 'Closed Won' },
  ]);

  const [leads, setLeads] = useState([
    { id: 'lead-1', name: 'TechFlow Corp', contact: 'David Chen', value: '$12,000', col: 'col-0', priority: 'high' },
    { id: 'lead-2', name: 'Acme Inc', contact: 'Sarah J.', value: '$5,000', col: 'col-0', priority: 'medium' },
    { id: 'lead-3', name: 'Global Retail', contact: 'Amanda T.', value: '$45,000', col: 'col-1', priority: 'high' },
    { id: 'lead-4', name: 'Startup Co', contact: 'Mike R.', value: '$2,500', col: 'col-2', priority: 'low' },
  ]);

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newLeads = Array.from(leads);
    const draggedLeadIndex = newLeads.findIndex(l => l.id === draggableId);
    if (draggedLeadIndex !== -1) {
      newLeads[draggedLeadIndex].col = destination.droppableId;
      setLeads([...newLeads]);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Leads Pipeline</h1>
          <p className="text-sm text-white/40">Manage and track your AI-driven sales pipeline.</p>
        </div>
        <button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-4 flex-1">
          {columns.map((col) => {
            const colLeads = leads.filter(l => l.col === col.id);
            return (
              <div key={col.id} className="flex flex-col gap-4">
                <div className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl border border-white/10">
                  <h3 className="font-medium text-white/90 text-sm">{col.name}</h3>
                  <Badge variant="neutral">{colLeads.length}</Badge>
                </div>
                
                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex flex-col gap-3 min-h-[200px]"
                    >
                      {colLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white/5 border border-white/10 p-4 rounded-xl hover:border-white/20 transition-colors cursor-grab ${snapshot.isDragging ? 'opacity-70 bg-white/10 scale-[1.02]' : ''}`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium text-white">{lead.name}</span>
                                <button className="text-white/40 hover:text-white transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                              </div>
                              <div className="text-xs text-white/40 mb-4">{lead.contact}</div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-white/90">{lead.value}</span>
                                <Badge variant={lead.priority === 'high' ? 'warning' : 'neutral'}>{lead.priority}</Badge>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
