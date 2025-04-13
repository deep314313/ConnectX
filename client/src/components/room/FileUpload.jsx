import React, { useRef } from 'react';
import { Files, Upload, Download } from 'lucide-react';

function FileUpload({ files }) {
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const files = e.target.files;
    if (!files.length) return;
    // TODO: Implement file upload
    console.log('Uploading files:', files);
  };

  const handleDownload = (file) => {
    // TODO: Implement file download
    console.log('Downloading file:', file);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
          Shared Files
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Upload className="w-5 h-5" />
          Upload File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      <div className="space-y-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-4 bg-black bg-opacity-30 rounded-lg border border-primary/5 hover:border-primary/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Files className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{file.name}</h3>
                <p className="text-sm text-gray-400">
                  {file.size} • Uploaded by {file.uploadedBy}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(file)}
              className="p-2 text-gray-400 hover:text-primary transition-colors"
              title="Download File"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        ))}
        {files.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Files className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No files shared yet</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-primary hover:text-primary-light mt-2"
            >
              Upload one now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUpload;
