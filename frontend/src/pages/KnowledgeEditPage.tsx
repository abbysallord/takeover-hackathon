import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Sparkles, AlertCircle, ShieldAlert, Key, Check, ChevronLeft, ChevronRight, RefreshCw, Eye } from 'lucide-react';
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
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [instruction, setInstruction] = useState('');
  const [proposedContent, setProposedContent] = useState('');
  const [diffSummary, setDiffSummary] = useState('');
  const [passcode, setPasscode] = useState('');

  // UI state
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isPasscodeOpen, setIsPasscodeOpen] = useState(false);
  const [hasProposed, setHasProposed] = useState(false);

  // Load all knowledge files to show in the sidebar
  const loadFiles = async () => {
    try {
      setIsLoadingFiles(true);
      const data = await mockApi.getKnowledgeFiles();
      setFiles(data);
      
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
      const content = await mockApi.getKnowledgeFileContent(file.category, file.name);
      setFileContent(content);
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
    navigate(`/dashboard/knowledge/edit/${file.category}/${file.name}`);
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
        toast('AI Proposal generated successfully!', 'success');
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
        // Reload fresh content
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
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectFile(file)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#3b82f6]/15 border-[#3b82f6] text-white shadow-md' 
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10 text-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-[#3b82f6]' : 'text-white/40'}`} />
                        <div className="overflow-hidden">
                          <div className="text-xs font-medium truncate">{file.name}</div>
                          <div className="text-[9px] opacity-55 mt-0.5 uppercase tracking-wider font-semibold">{file.category}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40 flex-shrink-0" />
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
                  <Badge variant="success">RAG Synced</Badge>
                </div>
              </div>

              {/* Raw File Viewer */}
              <div>
                <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40 block mb-2">Original Document Source</label>
                <div className="bg-black/30 border border-white/5 rounded-xl p-4 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto text-white/80">
                  {isLoadingContent ? (
                    <div className="flex items-center gap-2 text-white/40 text-xs py-4 justify-center">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading file contents...
                    </div>
                  ) : fileContent ? (
                    <pre className="whitespace-pre-wrap">{fileContent}</pre>
                  ) : (
                    <div className="text-white/40 italic py-4 justify-center text-center">Empty content.</div>
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
                  <button
                    onClick={() => setIsPasscodeOpen(true)}
                    className="w-full bg-gradient-to-r from-[#52b788] to-[#28c840] hover:from-[#40916c] hover:to-[#1b4332] text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:scale-98"
                  >
                    <Check className="w-4 h-4" />
                    Accept and Publish Changes
                  </button>
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
