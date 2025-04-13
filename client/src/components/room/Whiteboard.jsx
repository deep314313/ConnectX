import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Eraser, Square, Circle, Type, Undo, Redo } from 'lucide-react';

function Whiteboard() {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      context.fillStyle = 'rgba(0, 0, 0, 0.3)';
      context.fillRect(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.closePath();
    setIsDrawing(false);

    // Save to history
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(canvas.toDataURL());
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const img = new Image();
      img.src = history[historyStep - 1];
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const img = new Image();
      img.src = history[historyStep + 1];
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
    }
  };

  const tools = [
    { id: 'pencil', icon: Pencil, label: 'Pencil' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'square', icon: Square, label: 'Square' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'text', icon: Type, label: 'Text' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
          Whiteboard
        </h2>
        <div className="flex items-center gap-2">
          {tools.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              className={`p-2 rounded-lg transition-colors ${
                tool === id
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-primary hover:bg-primary/10'
              }`}
              title={label}
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}
          <div className="w-px h-6 bg-gray-700 mx-2" />
          <button
            onClick={handleUndo}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:hover:text-gray-400"
            disabled={historyStep <= 0}
            title="Undo"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={handleRedo}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:hover:text-gray-400"
            disabled={historyStep >= history.length - 1}
            title="Redo"
          >
            <Redo className="w-5 h-5" />
          </button>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer"
            title="Pick Color"
          />
          <select
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="bg-black bg-opacity-50 border border-primary/20 rounded-lg px-2 py-1 text-white text-sm"
            title="Line Width"
          >
            <option value="1">Thin</option>
            <option value="2">Normal</option>
            <option value="4">Thick</option>
            <option value="8">Very Thick</option>
          </select>
        </div>
      </div>
      <div className="h-[calc(100vh-12rem)] bg-black bg-opacity-30 rounded-lg border border-primary/10 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          className="w-full h-full touch-none"
        />
      </div>
    </div>
  );
}

export default Whiteboard;
