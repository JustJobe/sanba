"use client";

import { useState, useCallback } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

const MAX_FILES = 50;

export default function UploadZone() {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [photoType, setPhotoType] = useState<'color' | 'bw' | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (!photoType) return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            if (files.length > MAX_FILES) {
                setStatus('error');
                setMessage(`Too many files. Maximum ${MAX_FILES} files per batch.`);
                return;
            }
            await uploadFiles(files);
        }
    }, [photoType]);

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            if (files.length > MAX_FILES) {
                setStatus('error');
                setMessage(`Too many files. Maximum ${MAX_FILES} files per batch.`);
                return;
            }
            await uploadFiles(files);
        }
    };

    const uploadFiles = async (files: File[]) => {
        if (!photoType) return;
        setUploading(true);
        setStatus('idle');
        setMessage('');

        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file);
        });
        formData.append('photo_type', photoType);

        try {
            const response = await api.post('/jobs/upload', formData);
            setStatus('success');
            setMessage(`Job created! ID: ${response.data.id}`);
        } catch (error) {
            setStatus('error');
            setMessage('Upload failed. Please try again.');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const resetAll = () => {
        setStatus('idle');
        setPhotoType(null);
    };

    return (
        <div className="w-full">
            <h3 className="font-syne font-bold text-2xl mb-6">New Restoration</h3>

            <div className="bg-background border-2 border-foreground p-6 brutalist-shadow">
                <AnimatePresence mode="wait">
                    {uploading ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key="uploading"
                            className="flex flex-col items-center py-12"
                        >
                            <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                            <p className="font-mono text-sm uppercase tracking-widest">Applying Magic...</p>
                        </motion.div>
                    ) : status === 'success' ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key="success"
                            className="flex flex-col items-center py-8"
                        >
                            <CheckCircle className="w-16 h-16 text-primary mb-4" />
                            <p className="font-syne font-bold text-2xl mb-2">Complete</p>
                            <p className="font-mono text-xs bg-accent py-1 px-3 mb-6">{message}</p>
                            <button
                                onClick={resetAll}
                                className="px-8 py-3 bg-foreground text-background hover:bg-primary transition-colors font-mono uppercase text-xs tracking-widest"
                            >
                                Start New
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            key="idle"
                            className="w-full"
                        >
                            {/* Step 1: Select Type */}
                            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 mb-3">1. Select Type</p>
                            <div className="flex gap-3 mb-6">
                                <button
                                    onClick={() => setPhotoType('color')}
                                    className={`flex-1 py-3 border-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                                        photoType === 'color'
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'bg-background text-foreground border-foreground/30 hover:border-foreground'
                                    }`}
                                >
                                    Color
                                </button>
                                <button
                                    onClick={() => setPhotoType('bw')}
                                    className={`flex-1 py-3 border-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                                        photoType === 'bw'
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'bg-background text-foreground border-foreground/30 hover:border-foreground'
                                    }`}
                                >
                                    B&amp;W
                                </button>
                            </div>

                            {/* Step 2: Upload */}
                            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 mb-3">2. Upload</p>
                            <div
                                onDragEnter={photoType ? handleDrag : undefined}
                                onDragLeave={photoType ? handleDrag : undefined}
                                onDragOver={photoType ? handleDrag : undefined}
                                onDrop={photoType ? handleDrop : undefined}
                                className={`
                                    border-2 border-dashed p-12 flex flex-col items-center transition-colors
                                    ${!photoType ? 'opacity-40 cursor-not-allowed border-foreground/10' :
                                        isDragging ? 'border-primary bg-primary/10' : 'border-foreground/20 hover:border-foreground'}
                                `}
                            >
                                <Upload className="w-12 h-12 text-foreground/40 mb-4" />
                                <p className="font-syne font-bold text-lg mb-1">
                                    Drop Files Here
                                </p>
                                <p className="font-mono text-xs text-foreground/40 mb-1">or</p>
                                <p className="font-mono text-[10px] text-foreground/30 mb-5 uppercase tracking-widest">Up to {MAX_FILES} files per batch</p>

                                <label className={`relative px-8 py-3 font-mono uppercase text-xs tracking-widest transition-colors ${
                                    photoType
                                        ? 'bg-foreground text-background hover:bg-primary cursor-pointer'
                                        : 'bg-foreground/20 text-background/60 cursor-not-allowed pointer-events-none'
                                }`}>
                                    <span>Browse Files</span>
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        disabled={!photoType}
                                        onChange={handleFileInput}
                                    />
                                </label>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {status === 'error' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 border border-destructive bg-destructive/10 text-destructive font-mono text-xs flex items-center gap-2"
                >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>{message}</p>
                </motion.div>
            )}
        </div>
    );
}
