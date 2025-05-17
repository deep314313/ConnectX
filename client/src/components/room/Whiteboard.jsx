import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import {
  Pencil, Square, Circle, Type, Grid, Eraser,
  Triangle, RectangleHorizontal, Palette, Undo, Redo, Trash2,
  ArrowRight, Trash
} from 'lucide-react';
import { toast } from 'react-toastify';

// Helper to decode JWT and extract roomId (ObjectId)
function getActualRoomIdFromJWT(jwtToken) {
  try {
    if (!jwtToken || typeof jwtToken !== 'string' || !jwtToken.includes('.')) {
      // console.log('[Whiteboard] Not a JWT token, returning as is:', jwtToken);
      return jwtToken;
    }
    
    const payload = JSON.parse(atob(jwtToken.split('.')[1]));
    // console.log('[Whiteboard] Decoded JWT payload:', payload);
    return payload.roomId || jwtToken;
  } catch (err) {
    console.error('[Whiteboard] Error decoding JWT:', err);
    return jwtToken;
  }
}

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
  const isDrawingRef = useRef(false);
  const isRemoteChangeRef = useRef(false);
  const canvasHistoryRef = useRef([]);
  const canvasHistoryIndexRef = useRef(-1);
  const socketRef = useRef(socket);

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

  // Save canvas state for undo/redo
  const saveCanvasState = (canvas) => {
    if (isRemoteChangeRef.current) return; // Don't save history for remote changes
    
    // Remove all states after current index if we've gone back in history
    if (canvasHistoryIndexRef.current < canvasHistoryRef.current.length - 1) {
      canvasHistoryRef.current = canvasHistoryRef.current.slice(0, canvasHistoryIndexRef.current + 1);
    }
    
    const json = canvas.toJSON(['id']);
    canvasHistoryRef.current.push(json);
    canvasHistoryIndexRef.current = canvasHistoryRef.current.length - 1;
    
        // console.log('[Whiteboard] Saved canvas state:', {     //   historyLength: canvasHistoryRef.current.length,     //   currentIndex: canvasHistoryIndexRef.current     // });
  };

  const undo = () => {
    const canvas = fabricRef.current;
    if (canvasHistoryIndexRef.current > 0) {
      canvasHistoryIndexRef.current--;
      const json = canvasHistoryRef.current[canvasHistoryIndexRef.current];
      isRemoteChangeRef.current = true;
      canvas.loadFromJSON(json, () => {
        canvas.renderAll();
        isRemoteChangeRef.current = false;
        // console.log('[Whiteboard] Undo - loaded state:', canvasHistoryIndexRef.current);
      });
    }
  };

  const redo = () => {
    const canvas = fabricRef.current;
    if (canvasHistoryIndexRef.current < canvasHistoryRef.current.length - 1) {
      canvasHistoryIndexRef.current++;
      const json = canvasHistoryRef.current[canvasHistoryIndexRef.current];
      isRemoteChangeRef.current = true;
      canvas.loadFromJSON(json, () => {
        canvas.renderAll();
        isRemoteChangeRef.current = false;
        // console.log('[Whiteboard] Redo - loaded state:', canvasHistoryIndexRef.current);
      });
    }
  };

  // Setup canvas and socket connections
  useEffect(() => {
    // console.log('[Whiteboard] Setting up canvas with socket:', !!socket, 'roomId:', roomId);
    socketRef.current = socket;
    
    if (!canvasRef.current) {
      console.error('[Whiteboard] Canvas ref not available');
      return;
    }
    
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
    
    // Setup keyboard shortcuts for deleting objects
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          canvas.remove(activeObject);
          canvas.renderAll();
          
          // Emit object removed event to server
          if (socketRef.current?.connected && activeObject.id) {
            const actualRoomId = getActualRoomIdFromJWT(roomId);
            socketRef.current.emit('canvas-object-removed', {
              roomId: actualRoomId,
              objectId: activeObject.id
            });
          }
        } else {
          toast.info('Select an object first to delete it');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Save initial state
    saveCanvasState(canvas);

    // Set up canvas event listeners for detecting changes
    canvas.on('object:added', (e) => {
      if (isRemoteChangeRef.current) return;
      
      // console.log('[Whiteboard] Object added locally');
      if (!e.target.id) {
        e.target.id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      }
      
      saveCanvasState(canvas);
      
      if (socketRef.current?.connected) {
        const actualRoomId = getActualRoomIdFromJWT(roomId);
        // console.log('[Whiteboard] Emitting object added:', e.target.id);
        socketRef.current.emit('canvas-object-added', {
          roomId: actualRoomId,
          object: e.target.toObject(['id'])
        });
      }
    });

    canvas.on('object:modified', (e) => {
      if (isRemoteChangeRef.current) return;
      
      console.log('[Whiteboard] Object modified locally');
      saveCanvasState(canvas);
      
      if (socketRef.current?.connected) {
        const actualRoomId = getActualRoomIdFromJWT(roomId);
        console.log('[Whiteboard] Emitting object modified:', e.target.id);
        socketRef.current.emit('canvas-object-modified', {
          roomId: actualRoomId,
          objectId: e.target.id,
          modifications: e.target.toObject(['id'])
        });
      }
    });

    canvas.on('object:removed', (e) => {
      if (isRemoteChangeRef.current) return;
      
      console.log('[Whiteboard] Object removed locally');
      saveCanvasState(canvas);
      
      if (socketRef.current?.connected) {
        const actualRoomId = getActualRoomIdFromJWT(roomId);
        console.log('[Whiteboard] Emitting object removed:', e.target.id);
        socketRef.current.emit('canvas-object-removed', {
          roomId: actualRoomId,
          objectId: e.target.id
        });
      }
    });

    // Track drawing state for paths
    canvas.on('mouse:down', () => {
      isDrawingRef.current = true;
    });

    canvas.on('mouse:up', () => {
      isDrawingRef.current = false;
    });

    // Setup for path synchronization
    canvas.on('path:created', (e) => {
      if (isRemoteChangeRef.current) return;
      
      if (!e.path.id) {
        e.path.id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      }
    });

    return () => {
      // Cleanup
      // console.log('[Whiteboard] Cleaning up canvas');
      canvas.dispose();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      
      if (socketRef.current?.connected) {
        const actualRoomId = getActualRoomIdFromJWT(roomId);
        socketRef.current.emit('whiteboard:leave', { roomId: actualRoomId });
      }
    };
  }, []);

  // Setup socket listeners for real-time collaboration
  useEffect(() => {
    if (!socket?.connected || !roomId) {
      // console.log('[Whiteboard] Socket not connected or no roomId');
      return;
    }
    
    socketRef.current = socket;
    const actualRoomId = getActualRoomIdFromJWT(roomId);
    
    // console.log('[Whiteboard] Setting up socket listeners for room:', actualRoomId);
    
    // Join whiteboard room
    socket.emit('whiteboard:join', { roomId: actualRoomId });
    
    // Listen for initial state from server
    const handleInitialState = ({ objects, version }) => {
      // console.log('[Whiteboard] Received initial whiteboard state:', { 
      //   objectCount: objects.length, 
      //   version 
      // });
      
      if (!fabricRef.current) {
        console.error('[Whiteboard] Canvas not initialized');
        return;
      }
      
      const canvas = fabricRef.current;
      
      // Only load if we have objects and our canvas is empty
      if (objects.length > 0 && canvas.getObjects().length === 0) {
        isRemoteChangeRef.current = true;
        
        fabric.util.enlivenObjects(objects, (enlivenedObjects) => {
          enlivenedObjects.forEach(obj => {
            canvas.add(obj);
          });
          
          canvas.renderAll();
          isRemoteChangeRef.current = false;
          
          // Save this state to history
          saveCanvasState(canvas);
        }, 'fabric');
      }
    };
    
    // Listen for object added by other users
    const handleObjectAdded = ({ roomId: eventRoomId, object }) => {
      if (eventRoomId !== actualRoomId) return;
      
      console.log('[Whiteboard] Remote object added:', object.id);
      
      if (!fabricRef.current) {
        console.error('[Whiteboard] Canvas not initialized');
        return;
      }
      
      const canvas = fabricRef.current;
      isRemoteChangeRef.current = true;
      
      fabric.util.enlivenObjects([object], (objects) => {
        objects.forEach(obj => {
          // Check if object already exists
          const existingObj = canvas.getObjects().find(o => o.id === obj.id);
          if (existingObj) {
            canvas.remove(existingObj);
          }
          
          canvas.add(obj);
        });
        
        canvas.renderAll();
        isRemoteChangeRef.current = false;
        
        // Save this state to history
        saveCanvasState(canvas);
      }, 'fabric');
    };

    // Listen for object modified by other users
    const handleObjectModified = ({ roomId: eventRoomId, objectId, modifications }) => {
      if (eventRoomId !== actualRoomId) return;
      
      console.log('[Whiteboard] Remote object modified:', objectId);
      
      if (!fabricRef.current) {
        console.error('[Whiteboard] Canvas not initialized');
        return;
      }
      
      const canvas = fabricRef.current;
      const object = canvas.getObjects().find(obj => obj.id === objectId);
      
      if (object) {
        isRemoteChangeRef.current = true;
        
        // Update the object
        object.set(modifications);
        canvas.renderAll();
        
        isRemoteChangeRef.current = false;
        
        // Save this state to history
        saveCanvasState(canvas);
      }
    };

    // Listen for object removed by other users
    const handleObjectRemoved = ({ roomId: eventRoomId, objectId }) => {
      if (eventRoomId !== actualRoomId) return;
      
      console.log('[Whiteboard] Remote object removed:', objectId);
      
      if (!fabricRef.current) {
        console.error('[Whiteboard] Canvas not initialized');
        return;
      }
      
      const canvas = fabricRef.current;
      const object = canvas.getObjects().find(obj => obj.id === objectId);
      
      if (object) {
        isRemoteChangeRef.current = true;
        
        canvas.remove(object);
        canvas.renderAll();
        
        isRemoteChangeRef.current = false;
        
        // Save this state to history
        saveCanvasState(canvas);
      }
    };

    // Listen for canvas cleared by other users
    const handleCanvasClear = ({ roomId: eventRoomId }) => {
      if (eventRoomId !== actualRoomId) return;
      
      console.log('[Whiteboard] Remote canvas clear');
      
      if (!fabricRef.current) {
        console.error('[Whiteboard] Canvas not initialized');
        return;
      }
      
      const canvas = fabricRef.current;
      isRemoteChangeRef.current = true;
      
      canvas.clear();
      createGrid(canvas);
      
      isRemoteChangeRef.current = false;
      
      // Save this state to history
      saveCanvasState(canvas);
    };
    
    // Register event listeners
    socket.on('whiteboard:init', handleInitialState);
    socket.on('canvas-object-added', handleObjectAdded);
    socket.on('canvas-object-modified', handleObjectModified);
    socket.on('canvas-object-removed', handleObjectRemoved);
    socket.on('canvas-clear', handleCanvasClear);
    
    // Clean up listeners on unmount
    return () => {
      console.log('[Whiteboard] Removing socket listeners');
      socket.off('whiteboard:init', handleInitialState);
      socket.off('canvas-object-added', handleObjectAdded);
      socket.off('canvas-object-modified', handleObjectModified);
      socket.off('canvas-object-removed', handleObjectRemoved);
      socket.off('canvas-clear', handleCanvasClear);
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
      case 'arrow':
        // Create a line
        const line = new fabric.Line([50, 50, 200, 50], {
          stroke: color,
          strokeWidth: lineWidth,
          selectable: true
        });
        
        // Create a triangle for the arrowhead
        const arrowHead = new fabric.Triangle({
          width: 15,
          height: 15,
          fill: color,
          left: 200,
          top: 50,
          angle: 90,
          originX: 'center',
          originY: 'center'
        });
        
        // Group the line and arrowhead together
        shape = new fabric.Group([line, arrowHead], {
          left: 100,
          top: 100
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
      canvas.freeDrawingBrush.width = lineWidth;
    } else if (toolId === 'eraser') {
      canvas.isDrawingMode = true;
      setLastBrushColor(color);
      canvas.freeDrawingBrush.color = bgColor;
      canvas.freeDrawingBrush.width = lineWidth * 2;
    } else {
      canvas.isDrawingMode = false;
      if (['rectangle', 'square', 'circle', 'triangle', 'text', 'arrow'].includes(toolId)) {
        addShape(toolId);
      } else if (toolId === 'delete') {
        deleteSelectedObject();
      }
    }
  };

  // Function to delete the currently selected object
  const deleteSelectedObject = () => {
    const canvas = fabricRef.current;
    const activeObject = canvas.getActiveObject();
    
    if (activeObject) {
      // Save object ID before removing
      const objectId = activeObject.id;
      
      // Remove from canvas
      canvas.remove(activeObject);
      canvas.renderAll();
      
      // Emit object removed event to server
      if (socketRef.current?.connected && objectId) {
        const actualRoomId = getActualRoomIdFromJWT(roomId);
        socketRef.current.emit('canvas-object-removed', {
          roomId: actualRoomId,
          objectId: objectId
        });
      }
      
      // Set the tool back to pencil after deletion
      setTool('pencil');
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = lineWidth;
    } else {
      // If no object is selected, show a message or notification
      toast.error('No object selected to delete');
    }
  };

  const clearCanvas = () => {
    const canvas = fabricRef.current;
    
    if (canvas) {
      // Clear all objects
      canvas.clear();
      
      // Re-create grid
      createGrid(canvas);
      
      // Send clear event to server
      if (socketRef.current?.connected) {
        const actualRoomId = getActualRoomIdFromJWT(roomId);
        socketRef.current.emit('canvas-clear', { roomId: actualRoomId });
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
    { id: 'arrow', icon: ArrowRight, label: 'Arrow Line' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'delete', icon: Trash, label: 'Delete Selected (or press Delete key)' }
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
          
          {/* Undo/Redo/Clear */}
          <button
            onClick={undo}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10"
            title="Undo"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10"
            title="Redo"
          >
            <Redo className="w-5 h-5" />
          </button>
          <button
            onClick={clearCanvas}
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10"
            title="Clear Canvas"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          
          <div className="w-px h-6 bg-gray-700 mx-2" />
          
          {/* Color picker */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                if (fabricRef.current) {
                  fabricRef.current.freeDrawingBrush.color = e.target.value;
                }
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
            onChange={(e) => {
              const width = Number(e.target.value);
              setLineWidth(width);
              if (fabricRef.current) {
                fabricRef.current.freeDrawingBrush.width = width;
              }
            }}
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