import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, AlertCircle, RefreshCw, Eye, ExternalLink } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { useToast } from '../components/ui/ToastContext';
import { Dialog } from '../components/ui/Dialog';
import { mockApi } from '../services/mockApi';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = async (showSkeleton = true) => {
    try {
      if (showSkeleton) setIsLoading(true);
      const data = await mockApi.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await mockApi.markNotificationRead(id);
      loadNotifications(false); // Reload silently
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await mockApi.markAllNotificationsRead();
      loadNotifications(false); // Reload silently
      toast('All notifications marked as read.', 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectNotif = (notif: any) => {
    setSelectedNotif(notif);
    setIsOpen(true);
    if (!notif.read) {
      handleMarkRead(notif.id);
    }
  };

  return (
    <PageTransition>
      <div className="animate-fade-up max-w-3xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Notifications</h1>
            <p className="text-sm text-white/40">Recent system events and workflow alerts.</p>
          </div>
          <div className="flex items-center gap-3">
            {notifications.some(n => !n.read) && (
              <button 
                onClick={handleMarkAllRead}
                className="bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Mark All Read
              </button>
            )}
            <button 
              onClick={() => loadNotifications(true)}
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="p-5 h-20 bg-white/5 animate-pulse" />
              ))
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center text-xs text-white/35 italic">No alerts logged.</div>
            ) : (
              notifications.map((notif) => {
                const notifTitle = notif.type
                  ? notif.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                  : 'System Alert';
                const isWarning = notifTitle.toLowerCase().includes('fail') || 
                                  notifTitle.toLowerCase().includes('error') || 
                                  notifTitle.toLowerCase().includes('pending') || 
                                  notifTitle.toLowerCase().includes('request');
                return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleSelectNotif(notif)}
                    className={`p-5 flex items-start gap-4 hover:bg-white/5 transition-colors cursor-pointer ${notif.read ? 'opacity-50' : 'bg-white/[0.01]'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isWarning ? 'bg-[#ff9f0a]/10 text-[#ff9f0a]' : 'bg-[#28c840]/10 text-[#28c840]'
                    }`}>
                      {isWarning ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-sm font-medium text-white flex items-center gap-2">
                          {notifTitle}
                          {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />}
                        </h3>
                        <span className="text-[10px] text-white/40">{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-white/60">{notif.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* View Notification Details Modal */}
        <Dialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={selectedNotif ? selectedNotif.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Notification Details'}
          onConfirm={() => setIsOpen(false)}
          confirmText="Done"
        >
          {selectedNotif && (
            <div className="flex flex-col gap-4 text-xs text-white/80">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Message Details</span>
                <p className="text-sm font-medium text-white leading-relaxed">{selectedNotif.message}</p>
              </div>

              <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/40 uppercase tracking-wider font-bold">Logged At</span>
                  <span className="text-white/60">{new Date(selectedNotif.created_at).toLocaleString()}</span>
                </div>

                {selectedNotif.workflow_id && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/dashboard/workflow', { state: { workflowId: selectedNotif.workflow_id } });
                    }}
                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> View Workflow Timeline
                  </button>
                )}
              </div>
            </div>
          )}
        </Dialog>
      </div>
    </PageTransition>
  );
}
