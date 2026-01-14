import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect, Line } from "react-konva";
import Konva from "konva";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/App";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import { 
  Upload, Type, Shuffle, Download, Trash2, 
  Loader2, Image as ImageIcon, RotateCcw,
  Undo2, Redo2
} from "lucide-react";
import { motion } from "framer-motion";

// Google Fonts to load
const FONTS = [
  { name: "Roboto", family: "Roboto" },
  { name: "Montserrat", family: "Montserrat" },
  { name: "Oswald", family: "Oswald" },
  { name: "Anton", family: "Anton" },
  { name: "Bebas Neue", family: "Bebas Neue" },
];

// Available filters for background
const FILTER_TYPES = {
  NONE: "none",
  GRAYSCALE: "grayscale",
  SEPIA: "sepia",
  BRIGHTEN: "brighten",
  CONTRAST: "contrast",
  BLUR: "blur",
  INVERT: "invert",
};

const FILTERS = [
  { name: "Нет", type: FILTER_TYPES.NONE },
  { name: "Черно-белый", type: FILTER_TYPES.GRAYSCALE },
  { name: "Сепия", type: FILTER_TYPES.SEPIA },
  { name: "Яркость", type: FILTER_TYPES.BRIGHTEN },
  { name: "Контраст", type: FILTER_TYPES.CONTRAST },
  { name: "Размытие", type: FILTER_TYPES.BLUR },
  { name: "Инверсия", type: FILTER_TYPES.INVERT },
];

// Canvas settings
const CANVAS_SIZE = 500;
const OUTPUT_SIZE = 3000;
const PIXEL_RATIO = OUTPUT_SIZE / CANVAS_SIZE;

// Snapping settings
const SNAP_THRESHOLD = 6;
const GUIDE_COLOR = "#8B5CF6";
const GUIDE_STROKE_WIDTH = 1;

// History settings
const MAX_HISTORY = 50;
const STORAGE_KEY = "randomcover_autosave";

// Load Google Fonts
const loadFonts = () => {
  const link = document.createElement("link");
  link.href = "https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Montserrat:wght@400;700&family=Oswald:wght@400;700&family=Roboto:wght@400;700&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);
};

// ==================== SNAPPING LOGIC ====================
function getLineGuideStops(skipId, textElements) {
  const vertical = [0, CANVAS_SIZE / 2, CANVAS_SIZE];
  const horizontal = [0, CANVAS_SIZE / 2, CANVAS_SIZE];

  textElements.forEach((el) => {
    if (el.id === skipId) return;
    
    const box = {
      x: el.x,
      y: el.y,
      width: el.width || 100,
      height: el.fontSize || 48,
    };

    vertical.push(box.x, box.x + box.width / 2, box.x + box.width);
    horizontal.push(box.y, box.y + box.height / 2, box.y + box.height);
  });

  return { vertical, horizontal };
}

function getObjectSnappingEdges(node) {
  const box = node.getClientRect();
  const absPos = node.absolutePosition();

  return {
    vertical: [
      { guide: Math.round(box.x), offset: Math.round(absPos.x - box.x), snap: "start" },
      { guide: Math.round(box.x + box.width / 2), offset: Math.round(absPos.x - box.x - box.width / 2), snap: "center" },
      { guide: Math.round(box.x + box.width), offset: Math.round(absPos.x - box.x - box.width), snap: "end" },
    ],
    horizontal: [
      { guide: Math.round(box.y), offset: Math.round(absPos.y - box.y), snap: "start" },
      { guide: Math.round(box.y + box.height / 2), offset: Math.round(absPos.y - box.y - box.height / 2), snap: "center" },
      { guide: Math.round(box.y + box.height), offset: Math.round(absPos.y - box.y - box.height), snap: "end" },
    ],
  };
}

function getGuides(lineGuideStops, objectSnappingEdges) {
  const resultV = [];
  const resultH = [];

  lineGuideStops.vertical.forEach((lineGuide) => {
    objectSnappingEdges.vertical.forEach((objectBound) => {
      const diff = Math.abs(lineGuide - objectBound.guide);
      if (diff < SNAP_THRESHOLD) {
        resultV.push({
          lineGuide,
          diff,
          snap: objectBound.snap,
          offset: objectBound.offset,
        });
      }
    });
  });

  lineGuideStops.horizontal.forEach((lineGuide) => {
    objectSnappingEdges.horizontal.forEach((objectBound) => {
      const diff = Math.abs(lineGuide - objectBound.guide);
      if (diff < SNAP_THRESHOLD) {
        resultH.push({
          lineGuide,
          diff,
          snap: objectBound.snap,
          offset: objectBound.offset,
        });
      }
    });
  });

  const guides = [];

  const minV = resultV.sort((a, b) => a.diff - b.diff)[0];
  const minH = resultH.sort((a, b) => a.diff - b.diff)[0];

  if (minV) {
    guides.push({
      lineGuide: minV.lineGuide,
      offset: minV.offset,
      orientation: "V",
      snap: minV.snap,
    });
  }
  if (minH) {
    guides.push({
      lineGuide: minH.lineGuide,
      offset: minH.offset,
      orientation: "H",
      snap: minH.snap,
    });
  }

  return guides;
}

// ==================== TEXT ELEMENT COMPONENT ====================
function TextElement({ 
  shapeProps, 
  isSelected, 
  onSelect, 
  onChange, 
  onDragMove,
  onDragEnd,
  onTransformEnd 
}) {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Text
        ref={shapeRef}
        {...shapeProps}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragMove={(e) => onDragMove?.(e, shapeRef.current)}
        onDragEnd={(e) => {
          const newProps = {
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          };
          onChange(newProps);
          onDragEnd?.(newProps);
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);
          
          const newProps = {
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(50, node.width() * scaleX),
            fontSize: Math.max(12, shapeProps.fontSize * scaleY),
            rotation: node.rotation(),
          };
          onChange(newProps);
          onTransformEnd?.(newProps);
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

// ==================== BACKGROUND IMAGE COMPONENT ====================
function BackgroundImage({ image, filterType, filterValue }) {
  const imageRef = useRef();

  useEffect(() => {
    if (imageRef.current && image) {
      const node = imageRef.current;
      node.clearCache();
      
      if (filterType && filterType !== FILTER_TYPES.NONE && Konva.Filters) {
        node.cache();
        
        switch (filterType) {
          case FILTER_TYPES.GRAYSCALE:
            if (Konva.Filters.Grayscale) node.filters([Konva.Filters.Grayscale]);
            break;
          case FILTER_TYPES.SEPIA:
            if (Konva.Filters.Sepia) node.filters([Konva.Filters.Sepia]);
            break;
          case FILTER_TYPES.BRIGHTEN:
            if (Konva.Filters.Brighten) {
              node.filters([Konva.Filters.Brighten]);
              node.brightness(filterValue || 0.3);
            }
            break;
          case FILTER_TYPES.CONTRAST:
            if (Konva.Filters.Contrast) {
              node.filters([Konva.Filters.Contrast]);
              node.contrast(filterValue || 30);
            }
            break;
          case FILTER_TYPES.BLUR:
            if (Konva.Filters.Blur) {
              node.filters([Konva.Filters.Blur]);
              node.blurRadius(filterValue || 10);
            }
            break;
          case FILTER_TYPES.INVERT:
            if (Konva.Filters.Invert) node.filters([Konva.Filters.Invert]);
            break;
          default:
            node.filters([]);
        }
        node.getLayer()?.batchDraw();
      } else {
        node.filters([]);
        node.getLayer()?.batchDraw();
      }
    }
  }, [filterType, filterValue, image]);

  if (!image) return null;

  const scale = Math.max(CANVAS_SIZE / image.width, CANVAS_SIZE / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (CANVAS_SIZE - width) / 2;
  const y = (CANVAS_SIZE - height) / 2;

  return (
    <KonvaImage
      ref={imageRef}
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
    />
  );
}

// ==================== MAIN COMPONENT ====================
export default function RandomCover() {
  const stageRef = useRef();
  const containerRef = useRef();
  const fileInputRef = useRef();
  
  // Canvas state
  const [bgImage, setBgImage] = useState(null);
  const [bgImageData, setBgImageData] = useState(null); // Base64 for saving
  const [textElements, setTextElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [currentFilter, setCurrentFilter] = useState(FILTER_TYPES.NONE);
  const [filterValue, setFilterValue] = useState(0.5);
  const [saving, setSaving] = useState(false);
  const [containerSize, setContainerSize] = useState(CANVAS_SIZE);
  
  // Snapping guides
  const [guides, setGuides] = useState([]);
  
  // History for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);
  
  // Recovery dialog
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [savedProject, setSavedProject] = useState(null);
  
  // Selected text settings (live preview)
  const selectedText = useMemo(() => {
    return textElements.find((el) => el.id === selectedId);
  }, [textElements, selectedId]);

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    loadFonts();
    
    // Check for saved project
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const project = JSON.parse(saved);
        if (project.textElements?.length > 0 || project.bgImageData) {
          setSavedProject(project);
          setShowRecoveryDialog(true);
        }
      } catch (e) {
        console.error("Failed to parse saved project:", e);
      }
    }
  }, []);

  // Responsive container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.parentElement?.clientWidth || 600;
        const maxSize = Math.min(parentWidth - 32, CANVAS_SIZE);
        setContainerSize(maxSize);
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // ==================== KEYBOARD SHORTCUTS ====================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "z")) {
        e.preventDefault();
        handleRedo();
      }
      // Delete selected
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteSelectedText();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history, selectedId]);

  // ==================== AUTO-SAVE ====================
  const saveToLocalStorage = useCallback(() => {
    const project = {
      textElements,
      currentFilter,
      filterValue,
      bgImageData,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [textElements, currentFilter, filterValue, bgImageData]);

  useEffect(() => {
    if (!isUndoRedo && (textElements.length > 0 || bgImageData)) {
      saveToLocalStorage();
    }
  }, [textElements, currentFilter, filterValue, bgImageData, saveToLocalStorage, isUndoRedo]);

  // ==================== HISTORY MANAGEMENT ====================
  const saveToHistory = useCallback(() => {
    const snapshot = {
      textElements: JSON.parse(JSON.stringify(textElements)),
      currentFilter,
      filterValue,
      bgImageData,
    };
    
    setHistory((prev) => {
      // Remove any redo states
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [textElements, currentFilter, filterValue, bgImageData, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setIsUndoRedo(true);
      const prevState = history[historyIndex - 1];
      setTextElements(prevState.textElements);
      setCurrentFilter(prevState.currentFilter);
      setFilterValue(prevState.filterValue);
      if (prevState.bgImageData && prevState.bgImageData !== bgImageData) {
        loadImageFromData(prevState.bgImageData);
      }
      setHistoryIndex(historyIndex - 1);
      setTimeout(() => setIsUndoRedo(false), 100);
      toast.success("Отменено");
    }
  }, [historyIndex, history, bgImageData]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedo(true);
      const nextState = history[historyIndex + 1];
      setTextElements(nextState.textElements);
      setCurrentFilter(nextState.currentFilter);
      setFilterValue(nextState.filterValue);
      if (nextState.bgImageData && nextState.bgImageData !== bgImageData) {
        loadImageFromData(nextState.bgImageData);
      }
      setHistoryIndex(historyIndex + 1);
      setTimeout(() => setIsUndoRedo(false), 100);
      toast.success("Повторено");
    }
  }, [historyIndex, history, bgImageData]);

  // ==================== IMAGE HANDLING ====================
  const loadImageFromData = (dataUrl) => {
    const img = new window.Image();
    img.src = dataUrl;
    img.onload = () => {
      setBgImage(img);
      setBgImageData(dataUrl);
    };
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      loadImageFromData(dataUrl);
      saveToHistory();
      toast.success("Изображение загружено");
    };
    reader.readAsDataURL(file);
  };

  // ==================== RECOVERY ====================
  const recoverProject = () => {
    if (savedProject) {
      setTextElements(savedProject.textElements || []);
      setCurrentFilter(savedProject.currentFilter || FILTER_TYPES.NONE);
      setFilterValue(savedProject.filterValue || 0.5);
      if (savedProject.bgImageData) {
        loadImageFromData(savedProject.bgImageData);
      }
      toast.success("Проект восстановлен!");
    }
    setShowRecoveryDialog(false);
  };

  const discardRecovery = () => {
    localStorage.removeItem(STORAGE_KEY);
    setShowRecoveryDialog(false);
  };

  // ==================== TEXT MANAGEMENT ====================
  const addTextElement = () => {
    const newText = {
      id: `text-${Date.now()}`,
      text: "Новый текст",
      x: CANVAS_SIZE / 2 - 100,
      y: CANVAS_SIZE / 2,
      fontSize: 48,
      fontFamily: "Anton",
      fill: "#ffffff",
      width: 200,
      align: "center",
      rotation: 0,
    };
    setTextElements((prev) => [...prev, newText]);
    setSelectedId(newText.id);
    saveToHistory();
    toast.success("Текст добавлен");
  };

  const updateTextElement = useCallback((id, newAttrs) => {
    setTextElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...newAttrs } : el))
    );
  }, []);

  // Live update selected text (no "Apply" button needed)
  const updateSelectedText = useCallback((key, value) => {
    if (selectedId) {
      setTextElements((prev) =>
        prev.map((el) => (el.id === selectedId ? { ...el, [key]: value } : el))
      );
    }
  }, [selectedId]);

  const deleteSelectedText = () => {
    if (selectedId) {
      setTextElements((prev) => prev.filter((el) => el.id !== selectedId));
      setSelectedId(null);
      saveToHistory();
      toast.success("Текст удален");
    }
  };

  // ==================== SNAPPING ====================
  const handleDragMove = useCallback((e, node) => {
    if (!node) return;
    
    const lineGuideStops = getLineGuideStops(node.id(), textElements);
    const objectSnappingEdges = getObjectSnappingEdges(node);
    const currentGuides = getGuides(lineGuideStops, objectSnappingEdges);

    if (currentGuides.length === 0) {
      setGuides([]);
      return;
    }

    setGuides(currentGuides);

    // Apply snapping
    const absPos = node.absolutePosition();
    currentGuides.forEach((lg) => {
      if (lg.orientation === "V") {
        absPos.x = lg.lineGuide + lg.offset;
      } else if (lg.orientation === "H") {
        absPos.y = lg.lineGuide + lg.offset;
      }
    });
    node.absolutePosition(absPos);
  }, [textElements]);

  const handleDragEnd = useCallback(() => {
    setGuides([]);
    saveToHistory();
  }, [saveToHistory]);

  const handleTransformEnd = useCallback(() => {
    saveToHistory();
  }, [saveToHistory]);

  // ==================== RANDOM DESIGN ====================
  const randomizeDesign = () => {
    const randomFilterIndex = Math.floor(Math.random() * (FILTERS.length - 1)) + 1;
    setCurrentFilter(FILTERS[randomFilterIndex].type);
    setFilterValue(Math.random() * 0.5 + 0.3);

    setTextElements((prev) =>
      prev.map((el) => ({
        ...el,
        x: Math.random() * (CANVAS_SIZE - 200) + 50,
        y: Math.random() * (CANVAS_SIZE - 100) + 50,
        fontFamily: FONTS[Math.floor(Math.random() * FONTS.length)].family,
        rotation: Math.random() * 30 - 15,
        fontSize: Math.floor(Math.random() * 40) + 32,
      }))
    );
    saveToHistory();
    toast.success("Случайный дизайн применен!");
  };

  const resetDesign = () => {
    setCurrentFilter(FILTER_TYPES.NONE);
    setFilterValue(0.5);
    setTextElements([]);
    setBgImage(null);
    setBgImageData(null);
    setSelectedId(null);
    setHistory([]);
    setHistoryIndex(-1);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Дизайн сброшен");
  };

  // ==================== SAVE/EXPORT ====================
  const saveCover = async () => {
    if (!stageRef.current) return;

    setSaving(true);
    try {
      setSelectedId(null);
      setGuides([]);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataURL = stageRef.current.toDataURL({
        pixelRatio: PIXEL_RATIO,
        mimeType: "image/png",
      });

      await api.post("/covers/upload", {
        image: dataURL,
        filename: `cover_${Date.now()}.png`,
      });

      toast.success("Обложка сохранена!");
      
      const link = document.createElement("a");
      link.download = `cover_${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Ошибка сохранения обложки");
    } finally {
      setSaving(false);
    }
  };

  const scale = containerSize / CANVAS_SIZE;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <Sidebar>
      {/* Recovery Dialog */}
      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Восстановить проект?</DialogTitle>
            <DialogDescription>
              Найден несохранённый проект. Хотите восстановить его?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={discardRecovery}>
              Отклонить
            </Button>
            <Button onClick={recoverProject} className="bg-primary">
              Восстановить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">RandomCover</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Создайте уникальную обложку для вашей музыки
                  </p>
                </div>
              </div>
              
              {/* Undo/Redo buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  title="Отменить (Ctrl+Z)"
                  className="h-9 w-9"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRedo}
                  disabled={!canRedo}
                  title="Повторить (Ctrl+Y)"
                  className="h-9 w-9"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-[1fr,320px] gap-6">
            {/* Canvas Area */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="order-2 lg:order-1"
            >
              <div 
                ref={containerRef}
                className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4 sm:p-6"
              >
                <div 
                  className="mx-auto bg-zinc-800 rounded-xl overflow-hidden relative"
                  style={{ 
                    width: containerSize, 
                    height: containerSize,
                    boxShadow: "0 0 60px rgba(139, 92, 246, 0.1)"
                  }}
                >
                  <Stage
                    ref={stageRef}
                    width={containerSize}
                    height={containerSize}
                    scaleX={scale}
                    scaleY={scale}
                    onMouseDown={(e) => {
                      if (e.target === e.target.getStage()) {
                        setSelectedId(null);
                      }
                    }}
                    onTouchStart={(e) => {
                      if (e.target === e.target.getStage()) {
                        setSelectedId(null);
                      }
                    }}
                  >
                    {/* Background Layer */}
                    <Layer>
                      <Rect
                        x={0}
                        y={0}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        fill="#1a1a1a"
                      />
                      <BackgroundImage 
                        image={bgImage} 
                        filterType={currentFilter}
                        filterValue={filterValue}
                      />
                    </Layer>
                    
                    {/* Text Layer */}
                    <Layer>
                      {textElements.map((el) => (
                        <TextElement
                          key={el.id}
                          shapeProps={el}
                          isSelected={el.id === selectedId}
                          onSelect={() => setSelectedId(el.id)}
                          onChange={(newAttrs) => updateTextElement(el.id, newAttrs)}
                          onDragMove={handleDragMove}
                          onDragEnd={handleDragEnd}
                          onTransformEnd={handleTransformEnd}
                        />
                      ))}
                    </Layer>
                    
                    {/* Guides Layer */}
                    <Layer>
                      {guides.map((guide, i) => {
                        if (guide.orientation === "H") {
                          return (
                            <Line
                              key={`guide-${i}`}
                              points={[0, guide.lineGuide, CANVAS_SIZE, guide.lineGuide]}
                              stroke={GUIDE_COLOR}
                              strokeWidth={GUIDE_STROKE_WIDTH}
                              dash={[4, 4]}
                            />
                          );
                        } else if (guide.orientation === "V") {
                          return (
                            <Line
                              key={`guide-${i}`}
                              points={[guide.lineGuide, 0, guide.lineGuide, CANVAS_SIZE]}
                              stroke={GUIDE_COLOR}
                              strokeWidth={GUIDE_STROKE_WIDTH}
                              dash={[4, 4]}
                            />
                          );
                        }
                        return null;
                      })}
                    </Layer>
                  </Stage>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  Финальное разрешение: {OUTPUT_SIZE}x{OUTPUT_SIZE}px • 
                  История: {historyIndex + 1}/{history.length}
                </p>
              </div>
            </motion.div>

            {/* Controls Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="order-1 lg:order-2 space-y-4"
            >
              {/* Image Upload */}
              <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  Фоновое изображение
                </h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {bgImage ? "Заменить фото" : "Загрузить фото"}
                </Button>

                {bgImage && (
                  <div className="mt-3">
                    <Label className="text-xs">Фильтр</Label>
                    <Select
                      value={currentFilter}
                      onValueChange={(val) => {
                        setCurrentFilter(val);
                        saveToHistory();
                      }}
                    >
                      <SelectTrigger className="mt-1 bg-zinc-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FILTERS.map((f) => (
                          <SelectItem key={f.type} value={f.type}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Text Controls - Live Preview */}
              <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  Текст {selectedText && <span className="text-xs text-muted-foreground">(выбран)</span>}
                </h3>
                
                <div className="space-y-3">
                  {selectedText ? (
                    <>
                      <div>
                        <Label className="text-xs">Содержание</Label>
                        <Input
                          value={selectedText.text}
                          onChange={(e) => updateSelectedText("text", e.target.value)}
                          className="mt-1 bg-zinc-800"
                          placeholder="Введите текст"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Шрифт</Label>
                        <Select 
                          value={selectedText.fontFamily} 
                          onValueChange={(val) => updateSelectedText("fontFamily", val)}
                        >
                          <SelectTrigger className="mt-1 bg-zinc-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONTS.map((f) => (
                              <SelectItem key={f.family} value={f.family}>
                                <span style={{ fontFamily: f.family }}>{f.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Цвет</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="color"
                              value={selectedText.fill}
                              onChange={(e) => updateSelectedText("fill", e.target.value)}
                              className="w-10 h-9 p-1 bg-zinc-800"
                            />
                            <Input
                              value={selectedText.fill}
                              onChange={(e) => updateSelectedText("fill", e.target.value)}
                              className="flex-1 bg-zinc-800 font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Размер: {Math.round(selectedText.fontSize)}px</Label>
                          <Slider
                            value={[selectedText.fontSize]}
                            onValueChange={([val]) => updateSelectedText("fontSize", val)}
                            min={12}
                            max={120}
                            step={1}
                            className="mt-3"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={deleteSelectedText}
                        variant="outline"
                        className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить текст
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Выберите текст на холсте или добавьте новый
                    </p>
                  )}

                  <Button 
                    onClick={addTextElement} 
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <Type className="w-4 h-4 mr-1" />
                    Добавить текст
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4 space-y-3">
                <Button
                  onClick={randomizeDesign}
                  variant="outline"
                  className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  disabled={textElements.length === 0 && !bgImage}
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  Случайный дизайн
                </Button>

                <Button
                  onClick={resetDesign}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Сбросить
                </Button>

                <Button
                  onClick={saveCover}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                  disabled={saving || (!bgImage && textElements.length === 0)}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Сохранить (3000x3000)
                </Button>
              </div>

              {/* Tips */}
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-blue-400 mb-2">Советы</h4>
                <ul className="text-xs text-zinc-400 space-y-1">
                  <li>• Изменения применяются мгновенно</li>
                  <li>• Элементы примагничиваются к центру и друг к другу</li>
                  <li>• <kbd className="px-1 bg-zinc-800 rounded">Ctrl+Z</kbd> — отмена, <kbd className="px-1 bg-zinc-800 rounded">Ctrl+Y</kbd> — повтор</li>
                  <li>• Проект автоматически сохраняется</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
