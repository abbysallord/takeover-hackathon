import { UploadCloud, File, Link as LinkIcon, Trash2 } from 'lucide-react';

export function KnowledgePage() {
  const docs = [
    { name: 'Enterprise_Pricing_Q4.pdf', type: 'pdf', size: '2.4 MB', date: 'Oct 20' },
    { name: 'Standard_Terms_and_Conditions.pdf', type: 'pdf', size: '1.1 MB', date: 'Oct 15' },
    { name: 'https://hackarena.com/docs/api', type: 'url', size: '-', date: 'Oct 10' },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Knowledge Base</h1>
          <p className="text-sm text-white/40">Upload documents and URLs to train your AI for RAG.</p>
        </div>
      </div>

      <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all cursor-pointer mb-8">
        <div className="w-16 h-16 rounded-full bg-[#3b82f6]/10 flex items-center justify-center mb-4">
          <UploadCloud className="w-8 h-8 text-[#3b82f6]" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Drag and drop files</h3>
        <p className="text-sm text-white/40 max-w-md">Upload PDFs, Word docs, or CSVs. The AI will instantly process them to answer customer queries.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-medium text-white">Indexed Sources</h3>
        </div>
        <div className="divide-y divide-white/5">
          {docs.map((doc, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  {doc.type === 'pdf' ? <File className="w-5 h-5 text-[#ff5f57]" /> : <LinkIcon className="w-5 h-5 text-[#3b82f6]" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{doc.name}</div>
                  <div className="text-xs text-white/40 mt-1">Uploaded {doc.date} • {doc.size}</div>
                </div>
              </div>
              <button className="p-2 text-white/40 hover:text-[#ff5f57] hover:bg-[#ff5f57]/10 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
