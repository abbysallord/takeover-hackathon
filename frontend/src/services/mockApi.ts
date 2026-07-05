export const mockApi = {
  getStats: async (): Promise<any> => {
    try {
      const res = await fetch('http://127.0.0.1:8001/dashboard');
      if (!res.ok) throw new Error("Dashboard fetch failed");
      const data = await res.json();
      return {
        emailsToday: data.stats.total_workflows,
        activeLeads: data.stats.total_leads,
        quotesGenerated: data.stats.completed_workflows + data.stats.pending_approvals,
        revenuePipeline: `$${(data.stats.total_revenue / 1000).toFixed(1)}k`
      };
    } catch (e) {
      console.error("Error fetching stats:", e);
      return {
        emailsToday: 0,
        activeLeads: 0,
        quotesGenerated: 0,
        revenuePipeline: '$0k'
      };
    }
  },

  getWorkflows: async (): Promise<any[]> => {
    try {
      const res = await fetch('http://127.0.0.1:8001/dashboard');
      if (!res.ok) throw new Error("Dashboard fetch failed");
      const data = await res.json();
      const recent = data.recent_workflows;
      if (recent && recent.length > 0) {
        // Pick the latest workflow to display its steps in the pipeline table
        const wf = recent[0];
        return wf.steps.map((step: any) => {
          let stepName = step.stage.replace(/_/g, ' ').toLowerCase();
          stepName = stepName.charAt(0).toUpperCase() + stepName.slice(1);
          
          let desc = step.input_data?.reasoning || "Running autonomous step...";
          if (step.stage === "EMAIL_RECEIVED") {
            desc = "Parsed customer requirements from incoming email.";
          }
          
          let status = "Pending";
          let color = "text-white/40";
          if (step.status === "COMPLETED") {
            status = "Completed";
            color = "text-[#28c840]";
          } else if (step.status === "RUNNING") {
            status = "Processing";
            color = "text-[#3b82f6]";
          } else if (step.status === "FAILED") {
            status = "Failed";
            color = "text-[#ff5f57]";
          }
          
          return {
            id: step.id,
            step: stepName,
            desc: desc,
            status: status,
            color: color
          };
        });
      }
      return [];
    } catch (e) {
      console.error("Error fetching workflows:", e);
      return [];
    }
  },

  getApprovals: async (): Promise<any[]> => {
    try {
      const res = await fetch('http://127.0.0.1:8001/approvals');
      if (!res.ok) throw new Error("Approvals fetch failed");
      const data = await res.json();
      return data.map((app: any) => {
        let clientName = "Customer";
        if (app.quotation && app.quotation.items && app.quotation.items.length > 0) {
          clientName = `Acquisition of ${app.quotation.items[0].product}`;
        }
        
        let type = "Quotation Approval";
        let amount = "-";
        if (app.quotation) {
          amount = `$${app.quotation.total_amount.toLocaleString()}`;
        }
        
        return {
          id: app.id,
          type: type,
          client: clientName,
          amount: amount,
          confidence: 98,
          status: app.status.toLowerCase()
        };
      });
    } catch (e) {
      console.error("Error fetching approvals:", e);
      return [];
    }
  },

  approveAction: async (id: number): Promise<{ success: boolean, id: number }> => {
    try {
      const res = await fetch(`http://127.0.0.1:8001/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          approver: 'Manager Admin',
          notes: 'Approved via Sales Dashboard Approval Center.'
        })
      });
      if (!res.ok) throw new Error("Approval post failed");
      return { success: true, id };
    } catch (e) {
      console.error("Error approving action:", e);
      return { success: false, id };
    }
  },
  
  rejectAction: async (id: number): Promise<{ success: boolean, id: number }> => {
    try {
      const res = await fetch(`http://127.0.0.1:8001/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          approver: 'Manager Admin',
          notes: 'Rejected via Sales Dashboard Approval Center.'
        })
      });
      if (!res.ok) throw new Error("Rejection post failed");
      return { success: true, id };
    } catch (e) {
      console.error("Error rejecting action:", e);
      return { success: false, id };
    }
  }
};
