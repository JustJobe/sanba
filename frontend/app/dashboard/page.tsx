"use client";

import { useState, useEffect } from "react";
import { Upload, Download, Loader2, RefreshCw, X, Play, Image as ImageIcon, Check, Clock, Trash2, ChevronDown, ChevronUp, ScanLine, Minimize2 } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ComparisonSlider from "@/components/ComparisonSlider";

interface Job {
  id: string;
  status: string;
  created_at: string;
  source: string;
  files: string[];
  processed_files: string[];
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [credits, setCredits] = useState(user?.credits || 0);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<'restoration_full' | 'restoration_bw'>('restoration_full');
  const [isUploading, setIsUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  
  // Comparison Modal State
  const [comparingFiles, setComparingFiles] = useState<{ before: string, after: string } | null>(null);

  // Batch expand state
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const toggleExpand = (jobId: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      next.has(jobId) ? next.delete(jobId) : next.add(jobId);
      return next;
    });
  };

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs/');
      const sorted = response.data.sort((a: Job, b: Job) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setJobs(sorted);
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) setCredits(user.credits);
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      const formData = new FormData();
      Array.from(e.target.files).forEach((file) => {
        formData.append('files', file);
      });

      try {
        await api.post('/jobs/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        await fetchJobs();
      } catch (error) {
        console.error("Upload failed", error);
        alert("Failed to upload files.");
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const startProcessing = async (jobId: string) => {
    setProcessingId(jobId);
    try {
      await api.post(`/jobs/${jobId}/process?operation=${activeType}`);
      await fetchJobs();
      await refreshUser();
    } catch (error: any) {
      console.error("Processing failed", error);
      if (error.response && error.response.status === 402) {
        setShowCreditModal(true);
      } else {
        alert("Failed to start processing.");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm("Are you sure? This action is permanent.")) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (error) {
      console.error("Failed to delete job", error);
    }
  };

  const handleDownloadZip = async (jobId: string) => {
    try {
      const response = await api.get(`/jobs/${jobId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `job_${jobId.slice(0, 8)}_restored.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download zip", error);
      alert("Failed to download zip");
    }
  };

  const getFileUrl = (path: string) => {
    if (!path) return '';
    const relativePath = path.replace(/\\/g, '/').replace(/^uploads\//, '');
    return `/files/${relativePath}`;
  };

  return (
    <div className="min-h-screen bg-[#111] text-[#eee] font-sans selection:bg-white selection:text-black">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-[#111]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="leading-none font-bold text-xl tracking-tighter hover:opacity-80 transition-opacity">
              <div>San</div>
              <div>Ba.</div>
            </Link>
            <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />
            <button 
              onClick={() => { setLoading(true); fetchJobs(); }} 
              className="p-2 border border-white/20 rounded hover:bg-white hover:text-black transition-colors hidden sm:block"
            >
              <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-mono uppercase tracking-wider">
            <span className="text-white/60">Credits: <span className="text-white font-bold">{credits}</span></span>
            <Link href="/store" className="hover:text-white/80 transition-colors">Buy More</Link>
            <Link href="/profile" className="hover:text-white/80 transition-colors">Account</Link>
          </div>

          <button 
            className="md:hidden p-2 text-white/80"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <div className="space-y-1.5"><div className="w-6 h-0.5 bg-current"/><div className="w-6 h-0.5 bg-current"/><div className="w-6 h-0.5 bg-current"/></div>}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#111] p-4 space-y-4 font-mono text-sm uppercase tracking-wider">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/60">Credits</span>
              <span className="font-bold">{credits}</span>
            </div>
            <Link href="/store" className="block py-2 hover:bg-white/5">Buy More</Link>
            <Link href="/profile" className="block py-2 hover:bg-white/5">Account</Link>
          </div>
        )}
      </nav>

      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-12 md:mb-20">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] mb-4">
            Dash<br/>board
          </h1>
          <p className="text-white/60 font-mono text-sm max-w-md ml-1 md:ml-2">
            Manage your restoration queue and download results.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8 md:gap-12 lg:gap-20">
          
          <section className="order-2 lg:order-1">
            <div className="flex items-center justify-between mb-6 border-b border-white/20 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-5 h-5" /> Archive
              </h2>
              <button 
                className="p-2 hover:bg-white/10 rounded transition-colors lg:hidden" 
                onClick={() => { setLoading(true); fetchJobs(); }}
              >
                <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
              </button>
            </div>

            <div className="space-y-4">
              {jobs.map(job => (
                <div key={job.id} className="group border border-white/20 bg-white/5 p-4 flex flex-col sm:flex-row gap-4 hover:border-white/40 transition-all relative">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-mono font-bold text-lg">Job #{job.id.slice(0,8)}</span>
                      <span className={clsx(
                        "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                        job.status === 'completed' ? "bg-green-500/20 text-green-400 border-green-500/50" :
                        job.status === 'processing' ? "bg-blue-500/20 text-blue-400 border-blue-500/50 animate-pulse" :
                        job.status === 'queued' ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" :
                        "bg-red-500/20 text-red-400 border-red-500/50"
                      )}>
                        {job.status}
                      </span>
                    </div>
                    <div className="text-white/40 text-xs font-mono space-y-1">
                      <div>{new Date(job.created_at).toLocaleString()}</div>
                      <div>{job.files.length} FILE(S) • {job.source}</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between sm:justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10 w-full sm:w-auto">
                     {/* Thumbnails */}
                     <div className="flex gap-2">
                        {job.files.length > 0 && (
                          <div className="w-12 h-12 bg-white/10 border border-white/10 relative overflow-hidden group/thumb cursor-pointer" 
                               onClick={() => window.open(getFileUrl(job.files[0]), '_blank')}>
                            <img src={getFileUrl(job.files[0])} alt="Original" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-[8px] font-mono uppercase">Orig</div>
                          </div>
                        )}
                        {job.status === 'completed' && job.processed_files.length > 0 && (
                          <div className="w-12 h-12 bg-white/10 border border-white/10 relative overflow-hidden group/thumb cursor-pointer"
                               onClick={() => window.open(getFileUrl(job.processed_files[0]), '_blank')}>
                             <img src={getFileUrl(job.processed_files[0])} alt="Restored" className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-[8px] font-mono uppercase">New</div>
                          </div>
                        )}
                     </div>
                     
                     {/* Actions */}
                     <div className="flex gap-2 w-full sm:w-auto">
                        {job.status === 'queued' ? (
                           <>
                             <button 
                                onClick={() => startProcessing(job.id)}
                                disabled={processingId === job.id}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 transition-colors disabled:opacity-50"
                             >
                                {processingId === job.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4" />}
                                Restore
                             </button>
                             <button onClick={() => deleteJob(job.id)} className="p-2 border border-white/20 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                <Trash2 className="w-4 h-4" />
                             </button>
                           </>
                        ) : job.status === 'completed' ? (
                           <>
                             {/* Compare Button */}
                             <button 
                               onClick={() => setComparingFiles({ 
                                 before: getFileUrl(job.files[0]), 
                                 after: getFileUrl(job.processed_files[0]) 
                               })}
                               className="p-2 border border-white/20 hover:bg-white hover:text-black transition-colors"
                               title="Compare Side-by-Side"
                             >
                               <ScanLine className="w-4 h-4" />
                             </button>

                             <button 
                               onClick={() => handleDownloadZip(job.id)}
                               className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 transition-colors"
                             >
                               <Download className="w-4 h-4" />
                               <span className="hidden lg:inline">ZIP</span>
                             </button>
                           </>
                        ) : null}
                     </div>
                  </div>

                  {/* Batch file list — shown when job has multiple files */}
                  {job.files.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <button
                        onClick={() => toggleExpand(job.id)}
                        className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                      >
                        {expandedJobs.has(job.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expandedJobs.has(job.id) ? 'Hide files' : `Show all ${job.files.length} files`}
                      </button>

                      {expandedJobs.has(job.id) && (
                        <div className="mt-3 space-y-2">
                          {job.files.map((file: string, index: number) => {
                            const processed = job.processed_files?.[index] ?? null;
                            return (
                              <div key={index} className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-2">
                                <span className="text-xs font-mono text-white/50 truncate max-w-[140px] sm:max-w-xs">
                                  {file.split(/[/\\]/).pop()}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <a href={getFileUrl(file)} target="_blank" rel="noopener noreferrer"
                                    className="block w-10 h-10 border border-white/20 overflow-hidden hover:border-white/60 transition-colors">
                                    <img src={getFileUrl(file)} className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" />
                                  </a>
                                  {processed && (
                                    <>
                                      <a href={getFileUrl(processed)} target="_blank" rel="noopener noreferrer"
                                        className="block w-10 h-10 border border-white/20 overflow-hidden hover:border-white/60 transition-colors">
                                        <img src={getFileUrl(processed)} className="w-full h-full object-cover" />
                                      </a>
                                      <button
                                        onClick={() => setComparingFiles({ before: getFileUrl(file), after: getFileUrl(processed) })}
                                        className="p-1.5 border border-white/20 hover:bg-white hover:text-black transition-colors"
                                        title="Compare"
                                      >
                                        <ScanLine className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {jobs.length === 0 && !loading && (
                <div className="text-center py-12 border border-dashed border-white/20">
                  <p className="text-white/40 font-mono text-sm">No jobs found.</p>
                </div>
              )}
            </div>
          </section>

          {/* Right Column: New Restoration (Upload) */}
          <section className="order-1 lg:order-2 mb-8 lg:mb-0">
            <h2 className="text-xl font-bold mb-6 border-b border-white/20 pb-4">New Restoration</h2>
            
            <div className="border border-white/20 bg-[#1a1a1a] p-6 sticky top-24">
              <div className="mb-8">
                <label className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-4">1. Select Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setActiveType('restoration_full')}
                    className={clsx(
                      "flex flex-col items-center justify-center gap-3 p-6 border transition-all h-32 group relative overflow-hidden",
                      activeType === 'restoration_full' ? "border-white bg-white/5" : "border-white/20 hover:border-white/40 hover:bg-white/5"
                    )}
                  >
                    <div className={clsx("w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center", activeType === 'restoration_full' ? "border-red-500" : "border-white/40")}>
                        {activeType === 'restoration_full' && <div className="w-3 h-3 bg-red-500 rounded-full" />}
                    </div>
                    <span className="font-bold text-xs uppercase tracking-wider">Color</span>
                    <div className="absolute inset-0 bg-gradient-to-tr from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </button>

                  <button 
                    onClick={() => setActiveType('restoration_bw')}
                    className={clsx(
                      "flex flex-col items-center justify-center gap-3 p-6 border transition-all h-32 group relative overflow-hidden",
                      activeType === 'restoration_bw' ? "border-white bg-white/5" : "border-white/20 hover:border-white/40 hover:bg-white/5"
                    )}
                  >
                     <div className={clsx("w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center", activeType === 'restoration_bw' ? "border-white" : "border-white/40")}>
                        {activeType === 'restoration_bw' && <div className="w-3 h-3 bg-white rounded-full" />}
                    </div>
                    <span className="font-bold text-xs uppercase tracking-wider">B&W</span>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-4">2. Upload</label>
                <div className="border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all min-h-[250px] relative flex flex-col items-center justify-center gap-4 group cursor-pointer">
                   <input 
                      type="file" 
                      multiple
                      className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      onChange={handleUpload}
                      disabled={isUploading}
                      accept="image/jpeg,image/png,image/webp"
                   />
                   
                   {isUploading ? (
                     <div className="text-center animate-pulse">
                        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-white/60" />
                        <span className="font-mono text-sm uppercase tracking-widest text-white/60">Uploading...</span>
                     </div>
                   ) : (
                     <>
                        <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Upload className="w-5 h-5 text-white/60" />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="font-bold text-sm uppercase tracking-wider">Drop Files Here</p>
                          <p className="text-xs text-white/40 font-mono">or</p>
                          <span className="inline-block px-4 py-2 bg-white/10 text-xs font-mono uppercase tracking-widest group-hover:bg-white group-hover:text-black transition-colors mt-2">Browse</span>
                        </div>
                        <p className="absolute bottom-4 text-[10px] text-white/20 font-mono uppercase">JPG, PNG, WEBP • Max 10MB</p>
                     </>
                   )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-between items-center text-xs font-mono uppercase tracking-widest text-white/40 border-t border-white/10 pt-4">
                 <span>Cost: 1 Credit/Img</span>
                 <span className={clsx(credits > 0 ? "text-green-400" : "text-red-400")}>Balance: {credits}</span>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Comparison Modal */}
      {comparingFiles && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
           <div className="w-full max-w-4xl flex flex-col gap-4">
              <div className="flex justify-between items-center text-white">
                 <h3 className="font-syne font-bold text-xl flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-white/60" />
                    Comparison View
                 </h3>
                 <button 
                   onClick={() => setComparingFiles(null)}
                   className="p-2 hover:bg-white/10 rounded-full transition-colors"
                 >
                    <X className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                 <ComparisonSlider 
                    before={comparingFiles.before} 
                    after={comparingFiles.after} 
                 />
              </div>
              
              <div className="flex justify-center">
                 <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Drag slider to compare</p>
              </div>
           </div>
        </div>
      )}

      {/* Credit Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a1a] border-2 border-white p-8 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/50 flex items-center justify-center mx-auto mb-6 rounded-full">
                    <Clock className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="font-bold text-2xl mb-2 text-white">Out of Credits</h3>
                <p className="font-mono text-xs text-white/60 mb-8">
                    You need more credits to process this job.
                </p>
                <div className="flex flex-col gap-3">
                    <Link href="/store" className="w-full py-3 bg-white text-black font-bold uppercase tracking-wider hover:bg-white/90">
                        Get Credits
                    </Link>
                    <button onClick={() => setShowCreditModal(false)} className="w-full py-3 bg-transparent border border-white/20 text-white font-mono text-xs uppercase tracking-widest hover:bg-white/10">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}