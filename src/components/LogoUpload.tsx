import React, { useState, useRef } from "react";

interface LogoUploadProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  theme?: "light" | "dark";
}

export default function LogoUpload({
  value,
  onChange,
  disabled = false,
  theme = "light",
}: LogoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processAndUploadFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAndUploadFile(file);
    }
  };

  const processAndUploadFile = async (file: File) => {
    setError("");

    // Client-side validation: size (max 2MB)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("File size exceeds the 2MB limit.");
      return;
    }

    // Client-side validation: MIME type (must be image)
    const allowedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      setError("Only PNG, JPG, JPEG, GIF, SVG, and WEBP image files are allowed.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      onChange(data.url);
    } catch (err: any) {
      setError(err.message || "An error occurred during file upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Theme styles
  const isLight = theme === "light";
  
  const containerClasses = isLight
    ? "border-slate-200 hover:border-slate-400 bg-slate-50/50"
    : "border-white/10 hover:border-cyan-500/50 bg-slate-950/50";
    
  const draggingClasses = isLight
    ? "border-slate-800 bg-slate-100/85"
    : "border-cyan-500 bg-slate-800/85";

  const textMutedClasses = isLight ? "text-slate-400" : "text-slate-500";
  const textLabelClasses = isLight ? "text-slate-700 hover:text-slate-900" : "text-slate-300 hover:text-white";
  const previewContainerClasses = isLight
    ? "border-slate-200 bg-slate-50/30"
    : "border-white/10 bg-slate-950/30";
  const previewBoxClasses = isLight ? "bg-white border-slate-200" : "bg-slate-900 border-white/10";

  return (
    <div className="space-y-2">
      {value ? (
        // Preview State
        <div className={`flex items-center gap-6 p-4 border rounded-2xl transition ${previewContainerClasses}`}>
          <div className={`relative w-16 h-16 border rounded-xl flex items-center justify-center overflow-hidden p-1.5 ${previewBoxClasses}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Logo preview" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="flex-grow space-y-1">
            <p className={`text-xs font-bold ${isLight ? "text-slate-750" : "text-slate-200"}`}>Brand Logo Set</p>
            <p className={`text-[10px] truncate max-w-[200px] font-mono ${textMutedClasses}`}>
              {value}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={handleRemove}
            className="px-3 py-1.5 text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition"
          >
            Remove Logo
          </button>
        </div>
      ) : (
        // Dropzone State
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[140px] ${
            isDragging ? draggingClasses : containerClasses
          } ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            disabled={disabled || isUploading}
            className="hidden"
          />

          {isUploading ? (
            <div className="space-y-3 flex flex-col items-center">
              <div className={`animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 ${isLight ? "border-slate-800" : "border-cyan-500"}`} />
              <p className={`text-xs font-bold ${isLight ? "text-slate-750" : "text-slate-350"}`}>Uploading logo...</p>
            </div>
          ) : (
            <div className="space-y-2 flex flex-col items-center">
              <svg
                className={`h-9 w-9 ${isLight ? "text-slate-400" : "text-slate-500"}`}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-xs flex-col sm:flex-row items-center gap-1">
                <span className={`font-black underline transition ${textLabelClasses}`}>
                  Select a file
                </span>
                <span className={textMutedClasses}>or drag and drop here</span>
              </div>
              <p className={`text-[10px] font-semibold ${textMutedClasses}`}>
                PNG, JPG, GIF, SVG, WEBP up to 2MB
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-[11px] font-bold mt-1.5 transition-all">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
