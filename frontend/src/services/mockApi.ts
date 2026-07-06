const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

export const mockApi = {
  getStats: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/dashboard`);
      if (!res.ok) throw new Error("Dashboard fetch failed");
      const data = await res.json();
      return {
        emailsReceived: data.stats.emails_received,
        activeWorkflows: data.stats.running_workflows,
        pendingApprovals: data.stats.pending_approvals,
        completedWorkflows: data.stats.completed_workflows,
        quotesGenerated: data.stats.quotes_generated,
        revenuePipeline: `$${data.stats.total_revenue.toLocaleString()}`,
        avgResponseTime: data.stats.avg_response_time_seconds > 0 ? `${data.stats.avg_response_time_seconds}s` : 'N/A',
        timeSaved: `${data.stats.estimated_time_saved_minutes} mins`,
        aiConfidence: `${Math.round(data.stats.avg_ai_confidence * 100)}%`
      };
    } catch (e) {
      console.error("Error fetching stats:", e);
      return {
        emailsReceived: 0,
        activeWorkflows: 0,
        pendingApprovals: 0,
        completedWorkflows: 0,
        quotesGenerated: 0,
        revenuePipeline: '$0',
        avgResponseTime: '0s',
        timeSaved: '0 mins',
        aiConfidence: '100%'
      };
    }
  },

  simulateWorkflow: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/workflows/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'tony@starkindustries.com',
          recipient: 'sales@company.com',
          subject: 'Requesting 120 units of Widget-B',
          body: 'Hi, Stark Industries needs to place a bulk order of 120 units of Widget B. Can you provide price quotes?'
        })
      });
      if (!res.ok) throw new Error("Simulation fetch failed");
      return await res.json();
    } catch (e) {
      console.error("Error simulating workflow:", e);
      return null;
    }
  },

  getWorkflows: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/dashboard`);
      if (!res.ok) throw new Error("Dashboard fetch failed");
      const data = await res.json();
      const recent = data.recent_workflows;
      if (recent && recent.length > 0) {
        // Pick the latest workflow to display its steps in the pipeline table
        const wf = recent[0];
        return wf.steps.map((step: any) => {
          let stepName = step.stage;
          if (step.stage === "EMAIL_RECEIVED") {
            stepName = "Reading Email & Understanding Intent...";
          } else if (step.stage === "RETRIEVE_PRICING" && step.input_data?.tool === "rag_tool") {
            stepName = "Searching Knowledge Base (RAG)...";
          } else if (step.stage === "RETRIEVE_PRICING" && step.input_data?.tool === "pricing_tool") {
            stepName = "Calculating Pricing & Volume Discount...";
          } else if (step.stage === "CHECK_INVENTORY") {
            stepName = "Checking Inventory Stock...";
          } else if (step.stage === "GENERATE_QUOTATION") {
            stepName = "Generating Quote PDF...";
          } else if (step.stage === "REQUEST_APPROVAL") {
            stepName = "Waiting For Manager Approval...";
          } else if (step.stage === "SEND_REPLY") {
            stepName = "Sending Response Email...";
          } else if (step.stage === "CREATE_LEAD") {
            stepName = "Creating CRM Qualified Lead...";
          } else if (step.stage === "SCHEDULE_FOLLOWUP") {
            stepName = "Scheduling Callback Follow-up...";
          } else if (step.stage === "COMPLETED") {
            stepName = "Completed.";
          }
          
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
          
          const duration = step.completed_at && step.started_at 
            ? ((new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 1000).toFixed(2) + "s" 
            : "Active";

          return {
            id: step.id,
            step: stepName,
            desc: desc,
            status: status,
            color: color,
            tool: step.input_data?.tool || "System Orchestrator",
            duration: duration,
            confidence: step.input_data?.confidence ? `${Math.round(step.input_data.confidence * 100)}%` : "N/A",
            reasoning: step.input_data?.reasoning || desc
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
      const res = await fetch(`${API_BASE}/approvals`);
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
          status: app.status.toLowerCase(),
          suggestedReply: app.suggested_reply || null,
          quotation: app.quotation || null
        };
      });
    } catch (e) {
      console.error("Error fetching approvals:", e);
      return [];
    }
  },

  approveAction: async (id: number): Promise<{ success: boolean, id: number }> => {
    try {
      const res = await fetch(`${API_BASE}/approvals/${id}`, {
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
      const res = await fetch(`${API_BASE}/approvals/${id}`, {
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
  },

  getWorkspace: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/workspace`);
      if (!res.ok) throw new Error("Workspace fetch failed");
      return await res.json();
    } catch (e) {
      console.error("Error fetching workspace:", e);
      return null;
    }
  },

  setupWorkspace: async (data: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/workspace/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Workspace setup failed");
      return await res.json();
    } catch (e) {
      console.error("Error setting up workspace:", e);
      return null;
    }
  },

  completeWorkspaceOnboarding: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/workspace/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error("Workspace completion failed");
      return await res.json();
    } catch (e) {
      console.error("Error completing workspace onboarding:", e);
      return null;
    }
  },

  runDemoMode: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/workflows/demo-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error("Demo mode failed");
      return await res.json();
    } catch (e) {
      console.error("Error running demo mode:", e);
      return null;
    }
  },

  getGoogleAuthUrl: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/workspace/auth-url`);
      if (!res.ok) throw new Error("Google auth url failed");
      return await res.json();
    } catch (e) {
      console.error("Error getting google auth url:", e);
      return null;
    }
  },

  resetWorkspace: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/workspace/reset`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error("Workspace reset failed");
      return await res.json();
    } catch (e) {
      console.error("Error resetting workspace:", e);
      return null;
    }
  },

  getEmails: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/emails`);
      if (!res.ok) throw new Error("Emails fetch failed");
      return await res.json();
    } catch (e) {
      console.error("Error fetching emails:", e);
      return [];
    }
  },

  getWorkflowByEmailId: async (emailId: number): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/workflows/email/${emailId}`);
      if (!res.ok) throw new Error("Workflow details failed");
      return await res.json();
    } catch (e) {
      console.error("Error fetching workflow by email id:", e);
      return null;
    }
  },

  rerunWorkflow: async (id: number): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/workflows/${id}/rerun`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error("Workflow rerun failed");
      return await res.json();
    } catch (e) {
      console.error("Error rerunning workflow:", e);
      return null;
    }
  },

  getLeads: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/leads`);
      if (!res.ok) throw new Error("Leads fetch failed");
      return await res.json();
    } catch (e) {
      console.error("Error fetching leads:", e);
      return [];
    }
  },

  createLead: async (data: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Lead creation failed");
      return await res.json();
    } catch (e) {
      console.error("Error creating lead:", e);
      return null;
    }
  },

  updateLeadStatus: async (leadId: number, status: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Lead status update failed");
      return await res.json();
    } catch (e) {
      console.error("Error updating lead status:", e);
      return null;
    }
  },

  deleteLead: async (leadId: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Lead deletion failed");
      return true;
    } catch (e) {
      console.error("Error deleting lead:", e);
      return false;
    }
  },

  getCustomers: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/customers`);
      if (!res.ok) throw new Error("Customers fetch failed");
      return await res.json();
    } catch (e) {
      console.error("Error fetching customers:", e);
      return [];
    }
  },

  createCustomer: async (data: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Customer creation failed");
      return await res.json();
    } catch (e) {
      console.error("Error creating customer:", e);
      return null;
    }
  },

  getQuotations: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/quotations`);
      if (!res.ok) throw new Error("Quotations fetch failed");
      return await res.json();
    } catch (e) {
      console.error("Error fetching quotations:", e);
      return [];
    }
  },

  sendQuotation: async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/quotations/${id}/send`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error("Quotation send failed");
      const data = await res.json();
      return data?.success || false;
    } catch (e) {
      console.error("Error sending quotation:", e);
      return false;
    }
  },

  getNotifications: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/notifications`);
      if (!res.ok) throw new Error("Notifications fetch failed");
      return await res.json();
    } catch (e) {
      console.error("Error fetching notifications:", e);
      return [];
    }
  },

  markNotificationRead: async (id: number): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'POST'
      });
      return await res.json();
    } catch (e) {
      console.error("Error marking notification read:", e);
      return null;
    }
  },

  markAllNotificationsRead: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'POST'
      });
      return await res.json();
    } catch (e) {
      console.error("Error marking all notifications read:", e);
      return null;
    }
  },

  getKnowledgeFiles: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/knowledge/files`);
      if (!res.ok) throw new Error("Knowledge files fetch failed");
      return await res.json();
    } catch (e) {
      console.error("Error fetching knowledge files:", e);
      return [];
    }
  },

  uploadKnowledgeFile: async (category: string, file: File): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${API_BASE}/knowledge/upload?category=${category}`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Knowledge file upload failed");
      return await res.json();
    } catch (e) {
      console.error("Error uploading knowledge file:", e);
      return null;
    }
  },

  deleteKnowledgeFile: async (category: string, filename: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/knowledge/files/${category}/${filename}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Knowledge file deletion failed");
      const data = await res.json();
      return data?.success || false;
    } catch (e) {
      console.error("Error deleting knowledge file:", e);
      return false;
    }
  },

  getKnowledgeFileContent: async (category: string, filename: string): Promise<string> => {
    try {
      const res = await fetch(`${API_BASE}/knowledge/files/${category}/${filename}`);
      if (!res.ok) throw new Error("Fetch file content failed");
      const data = await res.json();
      return data.content;
    } catch (e) {
      console.error("Error reading file:", e);
      return "Failed to load document content.";
    }
  },

  getAnalytics: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/analytics`);
      if (!res.ok) throw new Error("Analytics fetch failed");
      return await res.json();
    } catch (e) {
      console.error("Error fetching analytics:", e);
      return null;
    }
  },

  getCredentialsDefaults: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/workspace/credentials-defaults`);
      if (!res.ok) throw new Error("Fetch credentials defaults failed");
      return await res.json();
    } catch (e) {
      console.error("Error fetching credentials defaults:", e);
      return { client_id: '', client_secret: '' };
    }
  }
};
