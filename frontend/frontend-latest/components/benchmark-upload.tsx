'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Trash2
} from 'lucide-react';
import type { EvaluationSession } from '@/lib/types';
import { convertBenchmarkToSessions } from '@/lib/benchmark-converter';

interface BenchmarkUploadProps {
  onBenchmarkLoad: (sessions: EvaluationSession[], name: string) => void;
  onBenchmarkRemove: (name: string) => void;
  loadedBenchmarks: string[];
}

const BenchmarkUpload: React.FC<BenchmarkUploadProps> = ({ 
  onBenchmarkLoad, 
  onBenchmarkRemove, 
  loadedBenchmarks 
}) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateBenchmarkData = (data: unknown): boolean => {
    // Check if the JSON has the required structure
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    
    const obj = data as Record<string, unknown>;
    if (!obj.model_statistics || !obj.task_results || !obj.models) {
      return false;
    }
    
    // Check if it has at least one model
    if (!Array.isArray(obj.models) || obj.models.length === 0) {
      return false;
    }
    
    // Check if model_statistics has data for all models
    for (const model of obj.models) {
      if (!(obj.model_statistics as Record<string, unknown>)[model]) {
        return false;
      }
    }
    
    return true;
  };

  const handleFileUpload = async (file: File) => {
    setUploadStatus('uploading');
    setErrorMessage('');
    
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
      const data = JSON.parse(text);
      
      if (!validateBenchmarkData(data)) {
        throw new Error('Invalid benchmark data format. Expected model_statistics, task_results, and models fields.');
      }
      
      // Convert to sessions
      const sessions = convertBenchmarkToSessions(data);
      const benchmarkName = file.name.replace('.json', '') || 'Custom Benchmark';
      
      onBenchmarkLoad(sessions, benchmarkName);
      setUploadStatus('success');
      
      // Reset after 2 seconds
      setTimeout(() => {
        setUploadStatus('idle');
      }, 2000);
      
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to parse JSON file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Upload Button */}
      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadStatus === 'uploading'}
          className="flex items-center gap-2"
        >
          {uploadStatus === 'uploading' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              Processing...
            </>
          ) : uploadStatus === 'success' ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              Uploaded
            </>
          ) : uploadStatus === 'error' ? (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              Error
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Results
            </>
          )}
        </Button>
        
        {uploadStatus === 'error' && (
          <span className="text-sm text-red-600">{errorMessage}</span>
        )}
        
        {uploadStatus === 'success' && (
          <span className="text-sm text-green-600">Benchmark loaded successfully!</span>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Loaded Benchmarks */}
      {loadedBenchmarks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Loaded Benchmarks
            </CardTitle>
            <CardDescription>
              Currently loaded benchmark datasets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loadedBenchmarks.map((name, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{name}</span>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onBenchmarkRemove(name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BenchmarkUpload;
