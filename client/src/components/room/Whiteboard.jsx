import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import {
  Pencil, Square, Circle, Type, Grid, Eraser,
  Triangle, RectangleHorizontal, Palette
} from 'lucide-react';

function Whiteboard({ socket, roomId }) {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#1a1a1a');
  const [lineWidth, setLineWidth] = useState(2);
  const [fontSize, setFontSize] = useState(20);
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [gridColor, setGridColor] = useState('#333333');
  const [lastBrushColor, setLastBrushColor] = useState(color);
  const [gridPattern, setGridPattern] = useState('grid');

  const createGrid = (canvas) => {
    if (!showGrid) {
      canvas.setBackgroundColor(bgColor, canvas.renderAll.bind(canvas));
      return;
    }

    const patternCanvas = document.createElement('canvas');
    const ctx = patternCanvas.getContext('2d');
    const size = gridSize;
    patternCanvas.width = size;
    patternCanvas.height = size;
    
    // Clear and fill with background color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    
    // Set grid line style
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    
    switch (gridPattern) {
      case 'dots':
        ctx.fillStyle = gridColor;
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.arc(size, 0, 2, 0, Math.PI * 2);
        ctx.arc(0, size, 2, 0, Math.PI * 2);
        ctx.arc(size, size, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'lines':
        ctx.beginPath();
        ctx.moveTo(0, size/2);
        ctx.lineTo(size, size/2);
        ctx.moveTo(size/2, 0);
        ctx.lineTo(size/2, size);
        ctx.stroke();
        break;
        
      case 'grid':
      default:
        // Draw vertical line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, size);
        ctx.stroke();
        
        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();
        break;
        
      case 'dashed':
        ctx.setLineDash([4, 4]);
        // Draw vertical line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, size);
        ctx.stroke();
        
        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
    }

    // Convert the pattern canvas to an image
    const img = new Image();
    img.src = patternCanvas.toDataURL();
    
    img.onload = () => {
      const pattern = new fabric.Pattern({
        source: img,
        repeat: 'repeat'
      });
      
      canvas.setBackgroundColor(pattern, () => {
        canvas.renderAll();
      });
    };
  };

  useEffect(() => {
    // Initialize Fabric canvas
    fabricRef.current = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      width: canvasRef.current.parentElement.clientWidth,
      height: canvasRef.current.parentElement.clientHeight,
      backgroundColor: bgColor
    });

    const canvas = fabricRef.current;

    // Set up drawing brush
    canvas.freeDrawingBrush.color = color;
    canvas.freeDrawingBrush.width = lineWidth;

    // Create initial grid if enabled
    createGrid(canvas);

    // Handle window resize
    const handleResize = () => {
      canvas.setWidth(canvasRef.current.parentElement.clientWidth);
      canvas.setHeight(canvasRef.current.parentElement.clientHeight);
      createGrid(canvas); // Re-create grid after resize
    };
    window.addEventListener('resize', handleResize);

    // Set up socket listeners for real-time collaboration
    if (socket) {
      // Listen for object added by other users
      socket.on('canvas-object-added', (data) => {
        if (data.roomId === roomId) {
          fabric.util.enlivenObjects([data.object], (objects) => {
            objects.forEach(obj => {
              canvas.add(obj);
              canvas.renderAll();
            });
          });
        }
      });

      // Listen for object modified by other users
      socket.on('canvas-object-modified', (data) => {
        if (data.roomId === roomId) {
          const object = canvas.getObjects().find(obj => obj.id === data.objectId);
          if (object) {
            object.set(data.modifications);
            canvas.renderAll();
          }
        }
      });

      // Listen for object removed by other users
      socket.on('canvas-object-removed', (data) => {
        if (data.roomId === roomId) {
          const object = canvas.getObjects().find(obj => obj.id === data.objectId);
          if (object) {
            canvas.remove(object);
            canvas.renderAll();
          }
        }
      });
    }

    // Set up canvas event listeners
    canvas.on('object:added', (e) => {
      if (!e.target.id) {
        e.target.id = Date.now().toString();
      }
      if (socket) {
        socket.emit('canvas-object-added', {
          roomId,
          object: e.target.toObject()
        });
      }
    });

    canvas.on('object:modified', (e) => {
      if (socket) {
        socket.emit('canvas-object-modified', {
          roomId,
          objectId: e.target.id,
          modifications: e.target.toObject()
        });
      }
    });

    canvas.on('object:removed', (e) => {
      if (socket) {
        socket.emit('canvas-object-removed', {
          roomId,
          objectId: e.target.id
        });
      }
    });

    return () => {
      canvas.dispose();
      window.removeEventListener('resize', handleResize);
      if (socket) {
        socket.off('canvas-object-added');
        socket.off('canvas-object-modified');
        socket.off('canvas-object-removed');
      }
    };
  }, [socket, roomId]);

  // Update grid when settings change
  useEffect(() => {
    if (fabricRef.current) {
      createGrid(fabricRef.current);
    }
  }, [showGrid, gridSize, gridColor, bgColor, gridPattern]);

  const addShape = (shapeType) => {
    const canvas = fabricRef.current;
    let shape;

    switch (shapeType) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: 100,
          top: 100,
          width: 100,
          height: 60,
          fill: 'transparent',
          stroke: color,
          strokeWidth: lineWidth
        });
        break;
      case 'square':
        shape = new fabric.Rect({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: 'transparent',
          stroke: color,
          strokeWidth: lineWidth
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          left: 100,
          top: 100,
          radius: 50,
          fill: 'transparent',
          stroke: color,
          strokeWidth: lineWidth
        });
        break;
      case 'triangle':
        shape = new fabric.Triangle({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: 'transparent',
          stroke: color,
          strokeWidth: lineWidth
        });
        break;
      case 'text':
        shape = new fabric.IText('Type here...', {
          left: 100,
          top: 100,
          fontFamily: 'Arial',
          fill: color,
          fontSize: 20
        });
        break;
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  };

  const handleToolClick = (toolId) => {
    setTool(toolId);
    const canvas = fabricRef.current;

    if (toolId === 'pencil') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = color;
    } else if (toolId === 'eraser') {
      canvas.isDrawingMode = true;
      setLastBrushColor(color);
      canvas.freeDrawingBrush.color = bgColor;
      canvas.freeDrawingBrush.width = lineWidth * 2;
    } else {
      canvas.isDrawingMode = false;
      if (['rectangle', 'square', 'circle', 'triangle', 'text'].includes(toolId)) {
        addShape(toolId);
      }
    }
  };

  const tools = [
    { id: 'pencil', icon: Pencil, label: 'Pencil' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'rectangle', icon: RectangleHorizontal, label: 'Rectangle' },
    { id: 'square', icon: Square, label: 'Square' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'text', icon: Type, label: 'Text' }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
            Whiteboard
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {tools.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleToolClick(id)}
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
          
          {/* Color picker */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                if (tool === 'eraser') {
                  handleToolClick('pencil');
                }
              }}
              className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer"
              title="Drawing Color"
            />
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer bg-opacity-50"
              title="Background Color"
            />
          </div>

          {/* Line width selector */}
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

          {/* Text size selector (show only when text tool is selected) */}
          {tool === 'text' && (
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="bg-black bg-opacity-50 border border-primary/20 rounded-lg px-2 py-1 text-white text-sm"
              title="Font Size"
            >
              <option value="12">12px</option>
              <option value="16">16px</option>
              <option value="20">20px</option>
              <option value="24">24px</option>
              <option value="32">32px</option>
              <option value="48">48px</option>
            </select>
          )}

          {/* Grid controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg transition-colors ${
                showGrid
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-primary hover:bg-primary/10'
              }`}
              title="Toggle Grid"
            >
              <Grid className="w-5 h-5" />
            </button>
            {showGrid && (
              <>
                <select
                  value={gridPattern}
                  onChange={(e) => setGridPattern(e.target.value)}
                  className="bg-black bg-opacity-50 border border-primary/20 rounded-lg px-2 py-1 text-white text-sm"
                  title="Grid Pattern"
                >
                  <option value="grid">Grid</option>
                  <option value="dots">Dots</option>
                  <option value="lines">Lines</option>
                  <option value="dashed">Dashed</option>
                </select>
                <select
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="bg-black bg-opacity-50 border border-primary/20 rounded-lg px-2 py-1 text-white text-sm"
                  title="Grid Size"
                >
                  <option value="10">10px</option>
                  <option value="20">20px</option>
                  <option value="30">30px</option>
                  <option value="40">40px</option>
                  <option value="50">50px</option>
                </select>
                <input
                  type="color"
                  value={gridColor}
                  onChange={(e) => setGridColor(e.target.value)}
                  className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer"
                  title="Grid Color"
                />
              </>
            )}
          </div>
        </div>
      </div>
      <div className="h-[calc(100vh-12rem)] bg-black bg-opacity-30 rounded-lg border border-primary/10 overflow-hidden relative">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default Whiteboard;
