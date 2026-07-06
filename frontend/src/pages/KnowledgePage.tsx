import { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, Trash2, ShieldAlert, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/ToastContext';
import { PageTransition } from '../components/PageTransition';
import { mockApi } from '../services/mockApi';

export function KnowledgePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Dialog State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('products');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<any | null>(null);
  const [viewContent, setViewContent] = useState<string>('');
  const [isViewLoading, setIsViewLoading] = useState(false);

  const handleViewDoc = async (doc: any) => {
    try {
      setIsViewLoading(true);
      setViewDoc(doc);
      const content = await mockApi.getKnowledgeFileContent(doc.category, doc.name);
      setViewContent(content);
    } catch (e) {
      console.error(e);
      setViewContent("Failed to load file content.");
    } finally {
      setIsViewLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const data = await mockApi.getKnowledgeFiles();
      setDocs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndPrepareFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndPrepareFile(e.target.files[0]);
    }
  };

  const validateAndPrepareFile = (file: File) => {
    const validExtensions = ['.md', '.txt', '.csv'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      toast('Invalid file type. Please upload a Markdown (.md) or Text (.txt) file.', 'error');
      return;
    }
    
    setSelectedFile(file);
    setIsConfirmOpen(true);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUploadConfirm = async () => {
    if (!selectedFile) return;
    try {
      setIsUploading(true);
      setIsConfirmOpen(false);
      const res = await mockApi.uploadKnowledgeFile(category, selectedFile);
      if (res && res.success) {
        toast(`Successfully uploaded & RAG indexed ${selectedFile.name}!`, 'success');
        loadDocuments();
      } else {
        toast('Upload failed. Try again.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Internal upload server error.', 'error');
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  };

  const handleDeleteDoc = async (doc: any) => {
    if (!window.confirm(`Are you sure you want to delete '${doc.name}'? This will remove it from the RAG search index.`)) return;
    try {
      const success = await mockApi.deleteKnowledgeFile(doc.category, doc.name);
      if (success) {
        toast(`Successfully deleted ${doc.name} from RAG index.`, 'success');
        loadDocuments();
      } else {
        toast('Failed to delete file.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Error deleting document.', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="animate-fade-up">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Knowledge Base</h1>
            <p className="text-sm text-white/40">Upload Markdown guidelines, price sheets, and catalogs to update RAG search indexing.</p>
          </div>
          <button 
            onClick={loadDocuments}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer mb-8 ${dragActive ? 'border-[#3b82f6] bg-white/[0.06]' : 'border-white/10 hover:border-white/20'}`}
        >
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".md,.txt,.csv"
            style={{ display: 'none' }}
          />
          <div className="w-16 h-16 rounded-full bg-[#3b82f6]/10 flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8 text-[#3b82f6]" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {isUploading ? "Indexing document..." : "Drag and drop markdown file here, or click to browse"}
          </h3>
          <p className="text-xs text-white/40 max-w-md">
            Supports Markdown (.md), Plain Text (.txt), and CSV (.csv). Upload catalogs or discount rules to immediately update your RAG knowledge base.
          </p>
        </div>

        {/* Documents Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Indexed RAG Documents</h3>
            <Badge variant="neutral">{docs.length} Sources</Badge>
          </div>
          
          <div className="divide-y divide-white/5">
            {isLoading ? (
              [1, 2].map(i => (
                <div key={i} className="p-4 h-16 bg-white/5 animate-pulse" />
              ))
            ) : docs.length === 0 ? (
              <div className="p-12 text-center text-xs text-white/40 italic">
                No custom indexed files. Drag and drop file to catalog.
              </div>
            ) : (
              docs.map((doc, i) => (
                <div 
                  key={i} 
                  onClick={() => handleViewDoc(doc)}
                  className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                  title="Click to view file content"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#3b82f6]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white hover:text-blue-400 transition-colors">{doc.name}</div>
                      <div className="text-[10px] text-white/40 mt-1">
                        Category: <span className="uppercase text-white/60 font-semibold">{doc.category}</span> • Size: {(doc.size_bytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="success">RAG Active</Badge>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDoc(doc);
                      }}
                      className="p-1.5 text-white/40 hover:text-[#ff5f57] hover:bg-white/5 rounded transition-colors"
                      title="Delete source document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upload Category Dialog */}
        <Dialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          title="Select Document Category"
          onConfirm={handleUploadConfirm}
          confirmText="Upload & Index"
        >
          <div className="flex flex-col gap-4 text-xs text-white/80">
            <div className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-[#ff9f0a] flex-shrink-0" />
              <p>Choosing the correct category enables the AI agent to accurately reference this file during active workflow executions.</p>
            </div>
            
            <div>
              <label className="text-[10px] uppercase font-semibold text-white/40 block mb-2 tracking-wider">Document category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="products">Products & Inventory Catalogs</option>
                <option value="pricing">Pricing Rules & Volume Tiers</option>
                <option value="policies">Company Return & Discount Policies</option>
                <option value="general">General Sales FAQs</option>
              </select>
            </div>
          </div>
        </Dialog>

        {/* Document Viewer Dialog */}
        <Dialog
          isOpen={!!viewDoc}
          onClose={() => { setViewDoc(null); setViewContent(''); }}
          title={viewDoc ? `${viewDoc.name} (${viewDoc.category.toUpperCase()})` : "Document Viewer"}
          confirmText="Close"
          onConfirm={() => { setViewDoc(null); setViewContent(''); }}
        >
          <div className="text-left max-h-[60vh] overflow-y-auto pr-1">
            {isViewLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-xs text-white/40">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Reading document from database RAG path...</span>
              </div>
            ) : (
              <pre className="text-[11px] text-white/80 font-mono whitespace-pre-wrap leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5">
                {viewContent}
              </pre>
            )}
          </div>
        </Dialog>
      </div>
    </PageTransition>
  );
}
