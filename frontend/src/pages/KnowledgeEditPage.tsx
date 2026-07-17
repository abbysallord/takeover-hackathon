import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Sparkles, AlertCircle, ShieldAlert, Key, Check, ChevronLeft, ChevronRight, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/ToastContext';
import { PageTransition } from '../components/PageTransition';
import { mockApi } from '../services/mockApi';

export function KnowledgeEditPage() {
  const { category: paramCategory, filename: paramFilename } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [files, setFiles] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [instruction, setInstruction] = useState('');
  const [proposedContent, setProposedContent] = useState('');
  const [diffSummary, setDiffSummary] = useState('');
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  const [editableContent, setEditableContent] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [passcode, setPasscode] = useState('');

  // UI state
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isPasscodeOpen, setIsPasscodeOpen] = useState(false);
  const [hasProposed, setHasProposed] = useState(false);

  // Load all active drafts
  const loadDrafts = async () => {
    try {
      const data = await mockApi.getKnowledgeDrafts();
      setDrafts(data);
    } catch (e) {
      console.error("Failed to load drafts:", e);
    }
  };

  // Load all knowledge files to show in the sidebar
  const loadFiles = async () => {
    try {
      setIsLoadingFiles(true);
      const data = await mockApi.getKnowledgeFiles();
      setFiles(data);
      await loadDrafts();
      
      // Select the current file from params
      if (paramCategory && paramFilename) {
        const found = data.find(f => f.category === paramCategory && f.name === paramFilename);
        if (found) {
          setSelectedFile(found);
        } else if (data.length > 0) {
          setSelectedFile(data[0]);
        }
      } else if (data.length > 0) {
        setSelectedFile(data[0]);
      }
    } catch (e) {
      console.error(e);
      toast('Failed to load files.', 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Load content of selected file
  const loadFileContent = async (file: any) => {
    if (!file) return;
    try {
      setIsLoadingContent(true);
      setProposedContent('');
      setDiffSummary('');
      setHasProposed(false);
      const res = await mockApi.getKnowledgeFileContent(file.category, file.name);
      setFileContent(res.content);
      
      if (res.draft) {
        setProposedContent(res.draft.draft_content);
        setDiffSummary(res.draft.diff_summary);
        setInstruction(res.draft.instruction || '');
        setEditableContent(res.draft.draft_content);
        setHasProposed(true);
      } else {
        setInstruction('');
        setEditableContent(res.content);
      }
    } catch (e) {
      console.error(e);
      toast('Failed to read file content.', 'error');
    } finally {
      setIsLoadingContent(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [paramCategory, paramFilename]);

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile]);

  const handleSelectFile = (file: any) => {
    setSelectedFile(file);
    navigate(`/dashboard/knowledge/file/edit/${file.category}/${file.name}`);
  };

  const handleGenerateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !instruction.trim()) return;

    try {
      setIsProposing(true);
      const res = await mockApi.proposeKnowledgeEdit(selectedFile.category, selectedFile.name, instruction);
      if (res && res.success) {
        setProposedContent(res.proposed_content);
        setDiffSummary(res.diff_summary);
        setHasProposed(true);
        toast('AI Proposal saved to drafts!', 'success');
        
        // Refresh sidebar tags/badges
        await loadFiles();
      } else {
        toast('Failed to generate proposal.', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Error communicating with LLM service.', 'error');
    } finally {
      setIsProposing(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!selectedFile) return;
    if (!window.confirm("Are you sure you want to discard this draft? Uncommitted changes will be lost.")) return;

    try {
      setIsDiscarding(true);
      const res = await mockApi.discardKnowledgeDraft(selectedFile.category, selectedFile.name);
      if (res && res.success) {
        toast('Draft discarded successfully.', 'success');
        // Reload files list to update sidebar badges, and reload file content
        await loadFiles();
        await loadFileContent(selectedFile);
      } else {
        toast('Failed to discard draft.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Error discarding draft.', 'error');
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableContent(e.target.value);
  };

  const handleSaveDirectEdit = async () => {
    if (!selectedFile) return;
    try {
      setIsSavingDraft(true);
      const res = await mockApi.saveKnowledgeDraft(
        selectedFile.category,
        selectedFile.name,
        editableContent,
        "Direct manual edit"
      );
      if (res && res.success) {
        toast('Manual changes saved to draft!', 'success');
        // Reload draft and file content to update diff and badges!
        await loadFiles();
        await loadFileContent(selectedFile);
      } else {
        toast('Failed to save manual changes.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Error saving changes.', 'error');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!selectedFile || !proposedContent || !passcode) return;

    try {
      setIsApplying(true);
      setIsPasscodeOpen(false);
      const res = await mockApi.applyKnowledgeEdit(
        selectedFile.category,
        selectedFile.name,
        proposedContent,
        instruction,
        passcode
      );
      if (res && res.success) {
        toast('Changes applied and RAG database successfully updated!', 'success');
        setPasscode('');
        setInstruction('');
        setProposedContent('');
        setDiffSummary('');
        setHasProposed(false);
        // Reload fresh content and files list to update badges
        await loadFiles();
        loadFileContent(selectedFile);
      } else {
        toast('Failed to apply changes. Check your security passcode.', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Verification failed.', 'error');
    } finally {
      setIsApplying(false);
    }
  };


  // Render unified diff line by line with premium visual styling
  const renderDiff = () => {
    if (!diffSummary) return <div className="text-white/40 italic text-xs">No proposed diff. Enter an instruction to generate one.</div>;

    const lines = diffSummary.split('\n');
    return (
      <div className="font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap bg-[#0b0c10] p-4 rounded-xl border border-white/5 max-h-[500px]">
        {lines.map((line, idx) => {
          let lineClass = 'text-white/60';
          if (line.startsWith('+') && !line.startsWith('+++')) {
            lineClass = 'bg-[#1b4332]/50 text-[#52b788] border-l-2 border-[#52b788] pl-2 py-0.5 my-0.5 block';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineClass = 'bg-[#4a121a]/50 text-[#ff5f57] border-l-2 border-[#ff5f57] pl-2 py-0.5 my-0.5 block';
          } else if (line.startsWith('@@')) {
            lineClass = 'text-[#3b82f6]/80 font-semibold py-1 block border-b border-white/5';
          }
          return (
            <div key={idx} className={lineClass}>
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="animate-fade-up">
        {/* Top bar header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard/knowledge')} 
              className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">Smart Knowledge Editor</h1>
              <p className="text-xs text-white/40">Select documents, edit dynamically with AI, and securely publish modifications.</p>
            </div>
          </div>
        </div>

        {/* Two-Column Workspace Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          
          {/* Left panel: Document Switcher Sidebar */}
          <div className="w-full lg:w-80 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white mb-1">Knowledge Files</h2>
              <p className="text-[11px] text-white/40">Select a file to update pricing, stock, or rules.</p>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] lg:max-h-[500px] pr-1">
              {isLoadingFiles ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                ))
              ) : files.length === 0 ? (
                <div className="text-center text-xs text-white/40 py-8 italic">No indexed files.</div>
              ) : (
                files.map((file, idx) => {
                  const isSelected = selectedFile?.category === file.category && selectedFile?.name === file.name;
                  const hasDraft = drafts.some(d => d.category === file.category && d.filename === file.name);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectFile(file)}
                      className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#3b82f6]/15 border-[#3b82f6] text-white shadow-md' 
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10 text-white/60'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-[#3b82f6]' : 'text-white/40'}`} />
                          <div className="overflow-hidden">
                            <div className="text-xs font-medium truncate">{file.name}</div>
                            <div className="text-[9px] opacity-55 mt-0.5 uppercase tracking-wider font-semibold">{file.category}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-40 flex-shrink-0" />
                      </div>
                      {hasDraft && (
                        <div className="pl-7">
                          <Badge variant="warning">Uncommitted Draft</Badge>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Editor & Diff Interface */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Top segment: Active Doc Header and Raw Preview */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#3b82f6]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{selectedFile?.name || 'No document selected'}</h3>
                    <div className="text-[10px] text-white/40 uppercase mt-0.5 font-bold">Category: {selectedFile?.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasProposed ? (
                    <Badge variant="warning">Uncommitted Draft</Badge>
                  ) : (
                    <Badge variant="success">RAG Synced</Badge>
                  )}
                </div>
              </div>

              {/* Raw File Viewer or Direct Editor */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40">
                    {activeTab === 'view' ? 'Original Document Source' : 'Direct Workspace Editor (Draft)'}
                  </label>
                  <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                    <button
                      onClick={() => setActiveTab('view')}
                      className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${
                        activeTab === 'view'
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-white/40 hover:text-white/80'
                      }`}
                    >
                      View Source
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('edit');
                        if (proposedContent) {
                          setEditableContent(proposedContent);
                        } else {
                          setEditableContent(fileContent);
                        }
                      }}
                      className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${
                        activeTab === 'edit'
                          ? 'bg-[#3b82f6]/20 text-[#3b82f6] shadow-sm border border-[#3b82f6]/20'
                          : 'text-white/40 hover:text-white/80'
                      }`}
                    >
                      Edit Directly
                    </button>
                  </div>
                </div>

                <div className="relative">
                  {isLoadingContent ? (
                    <div className="bg-black/30 border border-white/5 rounded-xl p-4 font-mono text-[11px] leading-relaxed max-h-72 min-h-[200px] flex items-center justify-center gap-2 text-white/40">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading file contents...
                    </div>
                  ) : activeTab === 'view' ? (
                    <div className="bg-black/30 border border-white/5 rounded-xl p-4 font-mono text-[11px] leading-relaxed max-h-72 overflow-y-auto text-white/80">
                      <pre className="whitespace-pre-wrap">{fileContent}</pre>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <textarea
                        value={editableContent}
                        onChange={handleEditorChange}
                        rows={12}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-[#3b82f6] resize-y min-h-[200px] max-h-[400px]"
                        placeholder="Start typing to modify this document directly..."
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveDirectEdit}
                          disabled={isSavingDraft || isLoadingContent}
                          className="px-4 py-2 bg-gradient-to-r from-[#3b82f6] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSavingDraft ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3" />
                              Save Draft Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom segment: Propose instruction & Proposed changes */}
            <div className="grid grid-col-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* Proposal Instruction Panel */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#3b82f6]" />
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">AI Edit Assistant</h4>
                </div>
                <p className="text-[11px] text-white/50">Describe the changes you want to apply in plain English. The AI agent will compute the precise modifications.</p>

                <form onSubmit={handleGenerateProposal} className="flex flex-col gap-3 flex-1 justify-between">
                  <textarea
                    rows={4}
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Example: 'Change Widget A base price to $12.50' or 'Add a rule that Widget C requires 15% discount for orders above 200 units'"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-[#3b82f6] resize-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isProposing || !instruction.trim() || isLoadingContent}
                    className="w-full mt-2 bg-gradient-to-r from-[#3b82f6] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:scale-98"
                  >
                    {isProposing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Analyzing and editing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate AI Edit Proposal
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Diff Preview Panel */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#52b788]" />
                      <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Proposed Changes (Diff)</h4>
                    </div>
                    {hasProposed && <Badge variant="neutral">Diff Computed</Badge>}
                  </div>
                  
                  {renderDiff()}
                </div>

                {hasProposed && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      onClick={handleDiscardDraft}
                      disabled={isDiscarding}
                      className="flex-1 bg-white/5 border border-white/10 hover:bg-[#ff5f57]/20 hover:border-[#ff5f57]/30 hover:text-[#ff5f57] text-white/80 font-semibold text-xs px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDiscarding ? 'Discarding...' : 'Discard Draft'}
                    </button>
                    <button
                      onClick={() => setIsPasscodeOpen(true)}
                      className="flex-[2] bg-gradient-to-r from-[#52b788] to-[#28c840] hover:from-[#40916c] hover:to-[#1b4332] text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:scale-98"
                    >
                      <Check className="w-4 h-4" />
                      Accept and Publish
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

        {/* Passcode validation Dialog */}
        <Dialog
          isOpen={isPasscodeOpen}
          onClose={() => setIsPasscodeOpen(false)}
          title="Secure Verification Code"
          confirmText="Apply & Publish"
          onConfirm={handleApplyChanges}
        >
          <div className="flex flex-col gap-4 text-xs text-white/80">
            <div className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-[#ff9f0a] flex-shrink-0" />
              <p>Security lock: A workspace passcode is required to apply changes to the RAG knowledge documents.</p>
            </div>
            
            <div>
              <label className="text-[10px] uppercase font-semibold text-white/40 block mb-2 tracking-wider">Workspace Security Passcode</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-white/20" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode (e.g. 1234)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>
          </div>
        </Dialog>

      </div>
    </PageTransition>
  );
}
