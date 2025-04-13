import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw } from 'lucide-react';
import {
  requestCodeState,
  onInitialCode,
  emitCodeChange,
  onCodeChange,
  emitCursorPosition,
  onCursorUpdate,
  emitSelection,
  onSelectionUpdate
} from '../../services/socket';

function CodeEditor({ socket, roomId }) {
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState('vs-dark');
  const [code, setCode] = useState('// Start coding here...');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [editorInstance, setEditorInstance] = useState(null);
  const [decorations, setDecorations] = useState([]);

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

  useEffect(() => {
    if (!socket || !roomId) return;

    // Request initial code state
    requestCodeState(roomId);

    // Listen for initial code
    onInitialCode(({ code: initialCode }) => {
      if (initialCode) {
        setCode(initialCode);
      }
    });

    // Listen for code changes
    onCodeChange(({ userId, userName, change }) => {
      if (change.code !== code) {
        setCode(change.code);
      }
    });

    // Listen for cursor updates
    onCursorUpdate(({ userId, userName, cursor }) => {
      if (editorInstance) {
        // Remove old cursor for this user
        setDecorations(prev => 
          prev.filter(d => !d.userId || d.userId !== userId)
        );

        // Add new cursor
        const newDecoration = {
          userId,
          range: cursor,
          options: {
            className: 'cursor-decoration',
            hoverMessage: { value: userName },
            beforeContentClassName: `cursor-${userId}`,
          }
        };

        setDecorations(prev => [...prev, newDecoration]);
      }
    });

    // Listen for selection updates
    onSelectionUpdate(({ userId, userName, selection }) => {
      if (editorInstance) {
        // Remove old selection for this user
        setDecorations(prev => 
          prev.filter(d => !d.userId || d.userId !== userId)
        );

        // Add new selection
        const newDecoration = {
          userId,
          range: selection,
          options: {
            className: `selection-${userId}`,
            hoverMessage: { value: `Selected by ${userName}` }
          }
        };

        setDecorations(prev => [...prev, newDecoration]);
      }
    });
  }, [socket, roomId, editorInstance]);

  // Handle editor mount
  const handleEditorDidMount = (editor) => {
    setEditorInstance(editor);

    // Add cursor and selection change listeners
    editor.onDidChangeCursorPosition(e => {
      emitCursorPosition(roomId, e.position);
    });

    editor.onDidChangeCursorSelection(e => {
      emitSelection(roomId, e.selection);
    });
  };

  // Handle code changes
  const handleEditorChange = (value) => {
    setCode(value);
    emitCodeChange(roomId, { code: value });
  };

  const handleRunCode = () => {
    // TODO: Implement code execution
    setOutput('Code execution result will appear here...');
  };

  const handleReset = () => {
    setInput('');
    setOutput('');
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
                title="Clear Input/Output"
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
              <span className="text-sm font-medium">Output</span>
              <button
                onClick={handleRunCode}
                className="flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary text-sm rounded-lg hover:bg-primary/30 transition-colors"
              >
                <Play className="w-4 h-4" />
                Run
              </button>
            </div>
            <div className="flex-1 p-4 font-mono text-sm overflow-auto whitespace-pre-wrap">
              {output || 'Output will appear here...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodeEditor;
