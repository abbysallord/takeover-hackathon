export const mockApi = {
  getStats: async (): Promise<any> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          emailsToday: 142,
          activeLeads: 38,
          quotesGenerated: 24,
          revenuePipeline: '$1.2M'
        });
      }, 500);
    });
  },

  getWorkflows: async (): Promise<any[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 1, step: 'Information Extraction', desc: 'Parsing requirements from incoming customer email.', status: 'Completed', color: 'text-[#28c840]' },
          { id: 2, step: 'Knowledge Retrieval', desc: 'RAG search for related technical documentation.', status: 'Completed', color: 'text-[#28c840]' },
          { id: 3, step: 'Inventory Check', desc: 'Checking CRM & warehouse for available stock.', status: 'Processing', color: 'text-[#3b82f6]' },
          { id: 4, step: 'Quotation Generation', desc: 'Drafting PDF quote based on available inventory.', status: 'Pending', color: 'text-white/40' },
          { id: 5, step: 'Manager Approval', desc: 'Awaiting human review before sending out email.', status: 'Pending', color: 'text-white/40' }
        ]);
      }, 600);
    });
  },

  approveAction: async (id: number): Promise<{ success: boolean, id: number }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, id });
      }, 800);
    });
  },
  
  rejectAction: async (id: number): Promise<{ success: boolean, id: number }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, id });
      }, 500);
    });
  }
};
