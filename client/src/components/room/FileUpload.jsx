import React, { useState, useEffect, useRef } from 'react';
import { Files, Upload, Download, Trash2, AlertCircle, X, Clock, FileText, FileImage, File as FileIcon } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, BASE_URL } from '../../services/api';

function FileUpload({ roomId, currentUser }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  
  // Extract room ID from JWT token
  const extractRoomIdFromToken = () => {
    try {
      // Check if it's a JWT token by seeing if it has the JWT structure
      if (roomId && roomId.split('.').length === 3) {
        const payload = JSON.parse(atob(roomId.split('.')[1]));
        // console.log('Extracted payload:', payload);
        return payload.roomId || roomId;
      }
    } catch (e) {
      // console.log('Not a valid JWT token or unable to extract roomId:', e);
    }
    return roomId;
  };

  // Get the actual MongoDB room ID
  const actualRoomId = extractRoomIdFromToken();
  // console.log('Using room ID:', actualRoomId);

  // Test ping the server
  useEffect(() => {
    const testServerConnection = async () => {
      try {
        // Test the root API endpoint
        // console.log('Testing server connection...');
        const rootResponse = await axios.get(BASE_URL);
        // console.log('Server root response:', rootResponse.data);
        
        // Test the files endpoint
        const filesApiTest = await axios.get(`${API_URL}/files/test`);
        // console.log('Files API test response:', filesApiTest.data);
      } catch (error) {
        console.error('Server connection test error:', error.message);
        if (error.response) {
          // console.log('Error response data:', error.response.data);
          // console.log('Error response status:', error.response.status);
        }
      }
    };
    
    testServerConnection();
  }, [API_URL, BASE_URL]);

  // Fetch files on component mount
  useEffect(() => {
    if (roomId) {
      fetchFiles();
    }
  }, [roomId]);

  // Fetch all files for the room
  const fetchFiles = async () => {
    try {
      setLoading(true);
      // Use the API_URL from environment variable
      const filesUrl = `${API_URL}/files/${actualRoomId}`;
      // console.log(`Fetching files using URL: ${filesUrl}`);
      
      const response = await axios.get(filesUrl);
      // console.log('Files response:', response.data);
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles.length) return;

    // Check file size (4MB limit)
    const MAX_SIZE = 4 * 1024 * 1024; // 4MB
    for (let i = 0; i < selectedFiles.length; i++) {
      if (selectedFiles[i].size > MAX_SIZE) {
        toast.error(`File ${selectedFiles[i].name} exceeds the 4MB limit.`);
        return;
      }
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Upload each file
      let successCount = 0;
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', currentUser?.uid || 'anonymous');
        formData.append('userName', currentUser?.displayName || 'Anonymous');

        try {
          // console.log(`Uploading ${file.name} to room ${actualRoomId}...`);
          
          // Use environment variable for URL
          const uploadUrl = `${API_URL}/files/${actualRoomId}/upload`;
          // console.log('Using URL:', uploadUrl);
          
          // Use the actual MongoDB ID with the correct URL
          await axios.post(uploadUrl, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            },
          });
          successCount++;
        } catch (fileError) {
          // console.error(`Error uploading file ${file.name}:`, fileError);
          const errorMessage = fileError.response?.data?.message || 
                               fileError.message || 
                               'Unknown error';
          toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
        }

        // Update progress for multiple files
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      // Refresh file list with the correct URL
      try {
        const filesUrl = `${API_URL}/files/${actualRoomId}`;
        // console.log('Using files list URL:', filesUrl);
        const response = await axios.get(filesUrl);
        setFiles(response.data.files || []);
      } catch (fetchError) {
        // console.error('Error fetching updated file list:', fetchError);
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} of ${selectedFiles.length} file(s) uploaded successfully!`);
      } else {
        toast.error('No files were uploaded successfully.');
      }
    } catch (error) {
      console.error('Error in upload process:', error);
      toast.error(
        error.response?.data?.message || 'Failed to upload files. Please try again.'
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file download
  const handleDownload = async (file) => {
    try {
      // console.log('Download file data:', file);
      
      // If there's no URL, show an error
      if (!file.url) {
        // console.error('No URL available for download');
        toast.error(`Cannot download ${file.originalName}: No download URL available`);
        return;
      }
      
      // Show downloading toast
      const toastId = toast.info(`Downloading ${file.originalName}...`, {
        autoClose: 2000
      });
      
      // For PDFs, create a direct download link
      if (file.mimetype === 'application/pdf') {
        // Create an anchor element for direct download
        const link = document.createElement('a');
        
        // Use server endpoint for downloads with the correct API URL
        link.href = `${API_URL}/files/${actualRoomId}/download/${file.id}`;
        link.download = file.originalName; // Force download with original filename
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          
          // Update toast - using string value instead of toast.TYPE.SUCCESS
          toast.update(toastId, {
            render: `Downloaded ${file.originalName}`,
            type: 'success',
            autoClose: 3000
          });
        }, 1000);
        
        return;
      }
      
      // For non-PDFs, continue using the open in new tab approach
      const downloadUrl = file.url.includes('cloudinary') ? file.url : 
        `${API_URL}/files/${actualRoomId}/download/${file.id}`;
      
      // console.log('Using download URL:', downloadUrl);
      
      // Open in new tab for non-PDFs
      window.open(downloadUrl, '_blank');
      
      // Update toast for non-PDFs - using string value instead of toast.TYPE.SUCCESS
      setTimeout(() => {
        toast.update(toastId, {
          render: `Opened ${file.originalName}`,
          type: 'success',
          autoClose: 3000
        });
      }, 1000);
    } catch (error) {
      console.error('Error in download handler:', error);
      toast.error('Failed to handle file. Please try again.');
    }
  };

  // Handle file deletion
  const handleDelete = async (file) => {
    // Check if current user has permission to delete
    const isUploader = file.uploadedBy.userId === currentUser?.uid;
    const isRoomCreator = currentUser?.isCreator;

    if (!isUploader && !isRoomCreator) {
      toast.error('You can only delete files you uploaded.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${file.originalName}?`)) {
      try {
        const hardcodedDeleteUrl = `${API_URL}/files/${actualRoomId}/${file.id}`;
        // console.log('Using direct delete URL:', hardcodedDeleteUrl);
        
        await axios.delete(hardcodedDeleteUrl, {
          data: { 
            userId: currentUser?.uid
          }
        });
        
        // Update file list
        setFiles(files.filter(f => f.id !== file.id));
        toast.success('File deleted successfully');
      } catch (error) {
        console.error('Error deleting file:', error);
        toast.error(
          error.response?.data?.message || 'Failed to delete file. Please try again.'
        );
      }
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Determine file icon based on mimetype
  const getFileIcon = (mimetype) => {
    if (mimetype.startsWith('image/')) {
      return <FileImage className="w-5 h-5 text-primary" />;
    } else if (mimetype.startsWith('text/') || mimetype.includes('javascript') || mimetype.includes('json')) {
      return <FileText className="w-5 h-5 text-primary" />;
    } else {
      return <FileIcon className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary-light bg-clip-text text-transparent">
          Shared Files
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            uploading
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          {uploading ? (
            <>
              <Clock className="w-5 h-5 animate-spin" />
              Uploading {uploadProgress}%
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload File
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
          <p className="text-gray-400">Loading files...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {files.length > 0 ? (
            files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 bg-black bg-opacity-30 rounded-lg border border-primary/5 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    {getFileIcon(file.mimetype)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" title={file.originalName}>
                      {file.originalName}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {formatFileSize(file.size)} • {formatDate(file.uploadedAt)} • 
                      <span className="ml-1 text-primary-light">
                        {file.uploadedBy.name}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 text-gray-400 hover:text-primary transition-colors"
                    title="Download File"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  {(file.uploadedBy.userId === currentUser?.uid || currentUser?.isCreator) && (
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete File"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Files className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No files shared yet</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:text-primary-light mt-2"
                disabled={uploading}
              >
                Upload one now
              </button>
            </div>
          )}
        </div>
      )}

      {/* File size limit notice */}
      <div className="mt-8 flex items-start gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-medium mb-1">File upload limits:</p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>Maximum file size: 4MB per file</li>
            <li>
              File permissions: 
              <span className="text-gray-400 ml-1">
                You can only delete files you uploaded (room creators can delete any file)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
