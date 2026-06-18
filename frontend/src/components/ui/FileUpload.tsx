import React, { useState, useRef, DragEvent } from 'react';
import { Upload, X, File, AlertCircle, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  onUpload: (files: File[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
  progress: number;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  accept = '*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  onUpload,
  onError,
  className = '',
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)}`;
    }

    // Check file type
    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type;

      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          return mimeType.startsWith(type.replace('/*', ''));
        }
        return mimeType === type;
      });

      if (!isAccepted) {
        return `File type not accepted. Accepted types: ${accept}`;
      }
    }

    return null;
  };

  const processFiles = (fileList: FileList) => {
    const newFiles: UploadedFile[] = [];
    const validFiles: File[] = [];

    Array.from(fileList).forEach(file => {
      const error = validateFile(file);

      if (error) {
        newFiles.push({ file, progress: 0, error });
        onError?.(error);
      } else {
        // Create preview for images
        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }

        newFiles.push({ file, preview, progress: 0 });
        validFiles.push(file);
      }
    });

    if (multiple) {
      setFiles(prev => [...prev, ...newFiles]);
    } else {
      setFiles(newFiles);
    }

    // Simulate upload progress
    if (validFiles.length > 0) {
      simulateUpload(newFiles.filter(f => !f.error));
      onUpload(validFiles);
    }
  };

  const simulateUpload = (uploadFiles: UploadedFile[]) => {
    uploadFiles.forEach((uploadFile, index) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles(prev =>
          prev.map(f =>
            f.file === uploadFile.file ? { ...f, progress: Math.min(progress, 100) } : f
          )
        );

        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 100);
    });
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      // Revoke preview URL if exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-secondary-300 hover:border-primary-400 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-primary-100' : 'bg-secondary-100'}`}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-primary-500' : 'text-secondary-500'}`} />
          </div>

          <div>
            <p className="text-lg font-semibold text-secondary-900 mb-1">
              {isDragging ? 'Drop files here' : 'Drop files or click to upload'}
            </p>
            <p className="text-sm text-secondary-500">
              {accept !== '*' && `Accepted formats: ${accept}`}
              {accept !== '*' && maxSize && ' • '}
              {maxSize && `Max size: ${formatFileSize(maxSize)}`}
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-3">
          {files.map((uploadedFile, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 bg-white border border-secondary-200 rounded-xl"
            >
              {/* Preview or Icon */}
              <div className="flex-shrink-0">
                {uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt={uploadedFile.file.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
                    <File className="w-6 h-6 text-secondary-500" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 truncate">
                  {uploadedFile.file.name}
                </p>
                <p className="text-xs text-secondary-500">
                  {formatFileSize(uploadedFile.file.size)}
                </p>

                {/* Progress Bar */}
                {!uploadedFile.error && uploadedFile.progress < 100 && (
                  <div className="mt-2 w-full bg-secondary-200 rounded-full h-1.5">
                    <div
                      className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadedFile.progress}%` }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {uploadedFile.error && (
                  <div className="mt-2 flex items-center gap-1 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-xs">{uploadedFile.error}</p>
                  </div>
                )}

                {/* Success */}
                {!uploadedFile.error && uploadedFile.progress === 100 && (
                  <div className="mt-2 flex items-center gap-1 text-primary-600">
                    <CheckCircle className="w-4 h-4" />
                    <p className="text-xs">Upload complete</p>
                  </div>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(index);
                }}
                className="flex-shrink-0 p-2 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-secondary-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
