import React, { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { requestCodeState, onInitialCode, onCodeChange, emitCodeChange } from '../../services/socket';
import { executeCode } from '../../services/compilerService';
import codeTemplates from '../../utils/codeTemplates';
import { toast } from 'react-toastify';

// Helper to decode JWT and extract roomId (ObjectId) - NO LOGGING VERSION
function getActualRoomIdFromJWT(jwtToken) {
  try {
    if (!jwtToken || typeof jwtToken !== 'string' || !jwtToken.includes('.')) {
      return jwtToken;
    }
    
    const payload = JSON.parse(atob(jwtToken.split('.')[1]));
    return payload.roomId || jwtToken;
  } catch (err) {
    return jwtToken;
  }
}

// User-friendly error messages
const getErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';
  
  // If it's a string already, return it
  if (typeof error === 'string') return error;
  
  // If it's an Error object
  if (error.message) {
    const message = error.message;
    
    // Handle common error patterns
    if (message.includes('Network Error')) {
      return 'Network error. Please check your internet connection.';
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'The request timed out. The server might be busy.';
    }
    
    if (message.includes('403')) {
      return 'API access forbidden. The API key might be invalid or rate-limited.';
    }
    
    if (message.includes('429')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    
    if (message.includes('500')) {
      return 'The compiler server encountered an error. Please try again later.';
    }
    
    return message;
  }
  
  // If it's an axios error with a response
  if (error.response) {
    const status = error.response.status;
    
    if (status === 400) return 'Invalid request to the compiler service.';
    if (status === 401 || status === 403) return 'API access not authorized. The API key might be invalid.';
    if (status === 404) return 'Compiler service endpoint not found.';
    if (status === 429) return 'API rate limit exceeded. Please try again later.';
    if (status >= 500) return 'Compiler service is experiencing issues. Please try again later.';
    
    return `Error ${status}: ${error.response.data?.message || 'Unknown error'}`;
  }
  
  return 'An unexpected error occurred while executing the code.';
};

function CodeEditor({ socket, roomId, onCodeUpdate }) {
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState('vs-dark');
  const [code, setCode] = useState(codeTemplates.javascript);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState(null);
  const [executionStats, setExecutionStats] = useState(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [decorations, setDecorations] = useState([]);
  const codeRef = useRef(code);
  const lastEmittedCodeRef = useRef('');
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const blockChangeHandler = useRef(false);

  const languages = [
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
    { id: 'cpp', label: 'C++' },
    { id: 'csharp', label: 'C#' },
    { id: 'php', label: 'PHP' },
    { id: 'ruby', label: 'Ruby' },
    { id: 'go', label: 'Go' },
    { id: 'rust', label: 'Rust' },
  ];

  // Update the code ref whenever code changes
  useEffect(() => {
    codeRef.current = code;
    
    // Report code changes to parent component for AI assistant
    if (onCodeUpdate) {
      onCodeUpdate(code, language);
    }
  }, [code, language, onCodeUpdate]);

  // Handle language change - update code template
  useEffect(() => {
    // Only set template if the editor is empty or using a template
    const isUsingTemplate = languages.some(lang => 
      code === codeTemplates[lang.id]
    );
    
    if (isUsingTemplate || !code || code === '// Start coding here...') {
      setCode(codeTemplates[language]);
      lastEmittedCodeRef.current = codeTemplates[language];
      
      if (socket?.connected) {
        const actualRoomId = getActualRoomIdFromJWT(roomId);
        emitCodeChange(actualRoomId, codeTemplates[language]);
      }
    }
  }, [language]);

  // Extract room ID from JWT token if needed - NO LOGGING VERSION
  const extractRoomIdFromToken = (jwtToken) => {
    try {
      // Check if it's a JWT token by seeing if it has the JWT structure
      if (jwtToken && jwtToken.split('.').length === 3) {
        const payload = JSON.parse(atob(jwtToken.split('.')[1]));
        if (payload && payload.roomId) {
          return payload.roomId;
        }
      }
      return jwtToken;
    } catch (e) {
      return jwtToken;
    }
  };

  // Get the actual MongoDB ID for the room
  const actualRoomId = extractRoomIdFromToken(roomId);

  // Initial code loading
  useEffect(() => {
    const requestInitialCode = () => {
      if (!socket || !actualRoomId) {
        // console.log('[CodeEditor] Cannot request initial code - missing socket or roomId');
        return;
      }
      
      // console.log('[CodeEditor] Requesting initial code for room:', actualRoomId);
      socket.emit('code:request', { roomId: actualRoomId });
    };

    const handleInitialCode = (payload) => {
      // console.log('[CodeEditor] Received initial code:', payload);
      if (payload && typeof payload.code === 'string') {
        setCode(payload.code);
        lastEmittedCodeRef.current = payload.code;
        
        // Reset the undo manager to avoid undoing to empty state
        if (editorInstance && editorInstance.editor) {
          editorInstance.editor.getSession().getUndoManager().reset();
        }
      }
    };

    // Setup socket listeners for code changes
    const setupSocketListeners = () => {
      if (!socket) {
        // console.log('[CodeEditor] Cannot listen for code changes - socket not available');
        return;
      }
      
      // console.log('[CodeEditor] Setting up code:change listener');
      
      // Handle code change events
      socket.on('code:change', (payload) => {
        // console.log('[CodeEditor] Received code:change payload:', payload);
        // console.log('[CodeEditor] Current socket state:', {
        //   connected: socket?.connected,
        //   id: socket?.id,
        //   receivedPayload: !!payload
        // });
        
        // Only process if we have a valid payload with code
        if (!payload || typeof payload.code !== 'string') {
          return;
        }
        
        // Skip update if the code is the same we just emitted
        if (lastEmittedCodeRef.current === payload.code) {
          // console.log('[CodeEditor] Processing code change:', {
          //   codeLength: payload.code.length,
          //   sameAsLastEmitted: true
          // });
          return;
        }
        
        // console.log('[CodeEditor] Processing code change:', {
        //   codeLength: payload.code.length,
        //   isFromSelf: false
        // });
        
        // Skip if the code didn't actually change
        if (codeRef.current === payload.code) return;
        
        // console.log('[CodeEditor] Updating code state from remote');
        
        // Block local changeHandler during remote update
        blockChangeHandler.current = true;
        
        // Update state
        setCode(payload.code);
        lastEmittedCodeRef.current = payload.code;
        
        // Update editor
        if (editorInstance && editorInstance.editor) {
          const editor = editorInstance.editor;
          const cursor = editor.getCursorPosition();
          editor.setValue(payload.code, -1);
          editor.moveCursorToPosition(cursor);
        }
        
        // Re-enable change handler
        setTimeout(() => {
          blockChangeHandler.current = false;
        }, 10);
      });
      
      // Listen for initial code
      socket.on('code:initial', handleInitialCode);
    };

    setupSocketListeners();
    requestInitialCode();

    return () => {
      if (socket) {
        socket.off('code:change');
        socket.off('code:initial', handleInitialCode);
      }
    };
  }, [socket, actualRoomId]);

  // Handle editor mount
  const handleEditorDidMount = (editor) => {
    setEditorInstance(editor);
    
    editor.onDidChangeCursorPosition(e => {
      // Extract ID silently without logging
      let actualRoomId;
      try {
        if (roomId && roomId.split('.').length === 3) {
          const payload = JSON.parse(atob(roomId.split('.')[1]));
          actualRoomId = payload.roomId || roomId;
        } else {
          actualRoomId = roomId;
        }
      } catch (err) {
        actualRoomId = roomId;
      }
      
      if (socket && actualRoomId) {
        socket.emit('cursor:position', { roomId: actualRoomId, position: e.position });
      }
    });
    
    editor.onDidChangeCursorSelection(e => {
      // Extract ID silently without logging
      let actualRoomId;
      try {
        if (roomId && roomId.split('.').length === 3) {
          const payload = JSON.parse(atob(roomId.split('.')[1]));
          actualRoomId = payload.roomId || roomId;
        } else {
          actualRoomId = roomId;
        }
      } catch (err) {
        actualRoomId = roomId;
      }
      
      if (socket && actualRoomId) {
        socket.emit('selection:update', { roomId: actualRoomId, selection: e.selection });
      }
    });
    
    // console.log('[CodeEditor] Editor mounted successfully');
  };

  // Emit code changes
  const handleEditorChange = (value) => {
    // console.log('[CodeEditor] Editor value changed:', value);
    
    // Update local state immediately
    setCode(value);
    
    // Mark that we're typing to avoid update loops
    isTypingRef.current = true;
    
    // Clear previous timeout if it exists
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to mark when typing stops
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 500);
    
    // Only emit if code actually changed from last emit
    if (value !== lastEmittedCodeRef.current) {
      // Extract ID silently without logging
      let actualRoomId;
      try {
        if (roomId && roomId.split('.').length === 3) {
          const payload = JSON.parse(atob(roomId.split('.')[1]));
          actualRoomId = payload.roomId || roomId;
        } else {
          actualRoomId = roomId;
        }
      } catch (err) {
        actualRoomId = roomId;
      }
      
      if (socket?.connected && actualRoomId) {
        // console.log('[CodeEditor] Emitting code change:', { 
        //   roomId: actualRoomId, 
        //   code: value,
        //   socketId: socket.id,
        //   socketConnected: socket.connected,
        //   socketRooms: Array.from(socket.rooms || [])
        // });
        
        emitCodeChange(actualRoomId, value);
        lastEmittedCodeRef.current = value;
      } else {
        console.error('[CodeEditor] Cannot emit - missing socket or roomId:', { 
          socket: !!socket, 
          roomId,
          socketId: socket?.id,
          socketConnected: socket?.connected,
          socketRooms: socket ? Array.from(socket.rooms || []) : []
        });
      }
    } else {
      // console.log('[CodeEditor] Skipping emit - code unchanged from last emit');
    }
  };

  const handleRunCode = async () => {
    try {
      setIsExecuting(true);
      setOutput('');
      setExecutionError(null);
      setExecutionStats(null);
      
      // console.log('[CodeEditor] Running code:', { language, input });
      
      // Validate code before sending
      if (!code || code.trim() === '') {
        throw new Error('Code is empty. Please write some code before running.');
      }
      
      // Special handling for C++ to ensure there's a main function
      if (language === 'cpp' && !code.includes('main(')) {
        toast.warning("Your C++ code doesn't have a main() function, which is required for execution.");
      }
      
      // Debug log full request details
      // console.log('[CodeEditor] Full execution request:', { 
      //   language, 
      //   code: code.substring(0, 100) + '...', // Truncated for log readability
      //   input 
      // });
      
      const result = await executeCode(language, code, input);
      
      // console.log('[CodeEditor] Execution result:', result);
      
      if (result.error) {
        const friendlyError = getErrorMessage(result.error);
        setExecutionError(friendlyError);
        setOutput(friendlyError);
      } else {
        setOutput(result.output || 'Program executed successfully with no output.');
        
        // Set execution stats if available
        if (result.executionTime || result.memory) {
          setExecutionStats({
            time: result.executionTime,
            memory: result.memory
          });
        }
      }
    } catch (error) {
      console.error('[CodeEditor] Error executing code:', error);
      
      // Format error message for display
      const friendlyError = getErrorMessage(error);
      setExecutionError(friendlyError);
      setOutput(friendlyError);
      
      // Debug log for troubleshooting
      console.error('[CodeEditor] Detailed error info:', {
        message: error.message,
        stack: error.stack,
        status: error.response?.status,
        responseData: error.response?.data
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    setInput('');
    setOutput('');
    setExecutionError(null);
    setExecutionStats(null);
  };
  
  const handleResetCode = () => {
    // Confirm before resetting code
    if (window.confirm('Reset code to template? This will discard all your changes.')) {
      setCode(codeTemplates[language]);
      lastEmittedCodeRef.current = codeTemplates[language];
      
      // Emit code change to other users
      if (socket?.connected) {
        const actualRoomId = getActualRoomIdFromJWT(roomId);
        emitCodeChange(actualRoomId, codeTemplates[language]);
      }
      
      toast.info('Code reset to template.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
          Code Editor
        </h2>
        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-black bg-opacity-50 border border-primary/20 rounded-lg px-3 py-2 text-white"
          >
            {languages.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="bg-black bg-opacity-50 border border-primary/20 rounded-lg px-3 py-2 text-white"
          >
            <option value="vs-dark">Dark</option>
            <option value="light">Light</option>
          </select>
          <button
            onClick={handleResetCode}
            className="p-2 bg-red-500/10 text-red-400 text-sm rounded-lg hover:bg-red-500/20 transition-colors"
            title="Reset Code to Template"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="px-6">
        <div className="w-full bg-black bg-opacity-30 rounded-lg border border-primary/10 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
          <Editor
            height="100%"
            defaultLanguage="javascript"
            language={language}
            theme={theme}
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              fontSize: 14,
              minimap: { enabled: true },
              scrollBeyondLastLine: true,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              renderWhitespace: 'selection',
              renderLineHighlight: 'all',
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                verticalScrollbarSize: 12,
                horizontalScrollbarSize: 12,
                useShadows: true,
              },
            }}
          />
        </div>
      </div>

      {/* Input/Output Section */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4 h-[160px]">
          {/* Input Box */}
          <div className="bg-black bg-opacity-30 rounded-lg border border-primary/10 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-primary/10 flex justify-between items-center bg-black/40">
              <span className="text-sm font-medium">Input</span>
              <button
                onClick={handleReset}
                className="p-1 text-gray-400 hover:text-primary transition-colors"
                title="Reset Input/Output"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter input here..."
              className="flex-1 w-full bg-transparent p-4 text-white placeholder-gray-400 focus:outline-none resize-none font-mono text-sm"
            />
          </div>

          {/* Output Box */}
          <div className="bg-black bg-opacity-30 rounded-lg border border-primary/10 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-primary/10 flex justify-between items-center bg-black/40">
              <span className="text-sm font-medium">
                Output
                {executionStats && (
                  <span className="ml-2 text-xs text-gray-400">
                    {executionStats.time && `Time: ${executionStats.time}s`}
                    {executionStats.memory && ` | Memory: ${Math.round(executionStats.memory / 1024)} KB`}
                  </span>
                )}
              </span>
              <button
                onClick={handleRunCode}
                disabled={isExecuting}
                className={`flex items-center gap-2 px-3 py-1 ${
                  isExecuting 
                    ? 'bg-gray-600/30 text-gray-400 cursor-not-allowed' 
                    : 'bg-primary/20 text-primary hover:bg-primary/30'
                } text-sm rounded-lg transition-colors`}
              >
                {isExecuting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isExecuting ? 'Running...' : 'Run'}
              </button>
            </div>
            <div 
              className={`flex-1 p-4 font-mono text-sm overflow-auto whitespace-pre-wrap ${
                executionError ? 'text-red-400' : 'text-white'
              }`}
            >
              {output || 'Output will appear here...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodeEditor;