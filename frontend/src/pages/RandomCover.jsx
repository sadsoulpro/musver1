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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/App";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import { 
  Upload, Type, Shuffle, Download, Trash2, 
  Loader2, Image as ImageIcon, RotateCcw,
  Undo2, Redo2, Save, FolderOpen, Plus, 
  FileImage, Clock, MoreVertical, PanelRightOpen,
  PanelRightClose, ChevronDown, ChevronUp, Settings2
} from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  
  // Projects state
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProjectName, setCurrentProjectName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  
  // AI Image Generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  
  // Mobile UI state
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [activeControlTab, setActiveControlTab] = useState("image"); // image, text, actions
  
  // Selected text settings (live preview)
  const selectedText = useMemo(() => {
    return textElements.find((el) => el.id === selectedId);
  }, [textElements, selectedId]);

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    loadFonts();
    fetchProjects();
    
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

  // ==================== PROJECTS API ====================
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await api.get("/projects");
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const saveProject = async (name) => {
    if (!name?.trim()) {
      toast.error("Введите название проекта");
      return;
    }

    setSavingProject(true);
    try {
      // Generate preview image
      let previewImage = null;
      if (stageRef.current) {
        setSelectedId(null);
        setGuides([]);
        await new Promise((resolve) => setTimeout(resolve, 100));
        previewImage = stageRef.current.toDataURL({
          pixelRatio: 0.5,
          mimeType: "image/png",
        });
      }

      // Build canvas JSON with all state needed for restoration
      const canvasState = {
        textElements,
        currentFilter,
        filterValue,
        bgImageData, // Base64 image data for background
      };

      const response = await api.post("/projects/save", {
        project_id: currentProjectId,
        project_name: name.trim(),
        canvas_json: JSON.stringify(canvasState),
        preview_image: previewImage,
      });

      if (response.data.success) {
        const savedProject = response.data.project;
        setCurrentProjectId(savedProject.id);
        setCurrentProjectName(savedProject.project_name);
        toast.success(currentProjectId ? "Проект обновлён" : "Проект сохранён");
        fetchProjects();
        setShowSaveDialog(false);
      }
    } catch (error) {
      console.error("Save project error:", error);
      toast.error("Ошибка сохранения проекта");
    } finally {
      setSavingProject(false);
    }
  };

  const loadProject = async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      const project = response.data.project;
      
      if (!project) {
        toast.error("Проект не найден");
        return;
      }

      // Parse canvas state
      const canvasState = JSON.parse(project.canvas_json);
      
      // Restore state
      setTextElements(canvasState.textElements || []);
      setCurrentFilter(canvasState.currentFilter || FILTER_TYPES.NONE);
      setFilterValue(canvasState.filterValue || 0.5);
      
      // Restore background image
      if (canvasState.bgImageData) {
        loadImageFromData(canvasState.bgImageData);
      } else {
        setBgImage(null);
        setBgImageData(null);
      }
      
      // Set project info
      setCurrentProjectId(project.id);
      setCurrentProjectName(project.project_name);
      setSelectedId(null);
      setGuides([]);
      
      // Clear history for new project
      setHistory([]);
      setHistoryIndex(-1);
      
      // Switch to editor tab
      setActiveTab("editor");
      
      toast.success(`Загружен проект: ${project.project_name}`);
    } catch (error) {
      console.error("Load project error:", error);
      toast.error("Ошибка загрузки проекта");
    }
  };

  const deleteProject = async (projectId, e) => {
    e?.stopPropagation();
    
    if (!confirm("Удалить этот проект?")) return;
    
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success("Проект удалён");
      
      // Clear current project if deleted
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
        setCurrentProjectName("");
      }
      
      fetchProjects();
    } catch (error) {
      console.error("Delete project error:", error);
      toast.error("Ошибка удаления проекта");
    }
  };

  const startNewProject = () => {
    setCurrentProjectId(null);
    setCurrentProjectName("");
    setTextElements([]);
    setBgImage(null);
    setBgImageData(null);
    setCurrentFilter(FILTER_TYPES.NONE);
    setFilterValue(0.5);
    setSelectedId(null);
    setGuides([]);
    setHistory([]);
    setHistoryIndex(-1);
    localStorage.removeItem(STORAGE_KEY);
    setActiveTab("editor");
    toast.success("Новый проект создан");
  };

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
        // Don't trigger if typing in input
        if (document.activeElement?.tagName === "INPUT") return;
        e.preventDefault();
        deleteSelectedText();
      }
      // Save: Ctrl+S
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (currentProjectId) {
          saveProject(currentProjectName);
        } else {
          setShowSaveDialog(true);
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history, selectedId, currentProjectId, currentProjectName]);

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

  // ==================== AI IMAGE GENERATION ====================
  const generateAIImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Введите промпт для генерации");
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await api.post("/generate-bg", {
        prompt: aiPrompt.trim()
      });
      
      if (response.data.success) {
        // Load image from base64
        const img = new window.Image();
        img.onload = () => {
          setBgImage(img);
          setBgImageData(response.data.image_base64);
          saveToHistory();
          toast.success("AI изображение сгенерировано!");
          setGeneratingAI(false);
        };
        img.onerror = () => {
          toast.error("Ошибка загрузки изображения");
          setGeneratingAI(false);
        };
        img.src = response.data.image_base64;
      }
    } catch (error) {
      console.error("AI generation error:", error);
      const errorMessage = error.response?.data?.detail || "Ошибка генерации изображения";
      toast.error(errorMessage);
      setGeneratingAI(false);
    }
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

  // ==================== TEXT OPERATIONS ====================
  const addTextElement = () => {
    const newText = {
      id: `text_${Date.now()}`,
      text: "Ваш текст",
      x: CANVAS_SIZE / 2 - 75,
      y: CANVAS_SIZE / 2 - 24,
      fontSize: 48,
      fontFamily: "Roboto",
      fill: "#FFFFFF",
      width: 150,
      align: "center",
    };
    setTextElements([...textElements, newText]);
    setSelectedId(newText.id);
    saveToHistory();
  };

  const updateTextElement = (id, newAttrs) => {
    setTextElements(
      textElements.map((el) => (el.id === id ? { ...el, ...newAttrs } : el))
    );
  };

  const updateSelectedText = (key, value) => {
    if (!selectedId) return;
    updateTextElement(selectedId, { [key]: value });
  };

  const deleteSelectedText = () => {
    if (!selectedId) return;
    setTextElements(textElements.filter((el) => el.id !== selectedId));
    setSelectedId(null);
    saveToHistory();
  };

  // ==================== SNAPPING HANDLERS ====================
  const handleDragMove = (e, node) => {
    if (!node) return;

    const lineGuideStops = getLineGuideStops(selectedId, textElements);
    const objectSnappingEdges = getObjectSnappingEdges(node);
    const newGuides = getGuides(lineGuideStops, objectSnappingEdges);

    setGuides(newGuides);

    const absPos = node.absolutePosition();
    newGuides.forEach((guide) => {
      if (guide.orientation === "V") {
        absPos.x = guide.lineGuide + guide.offset;
      } else if (guide.orientation === "H") {
        absPos.y = guide.lineGuide + guide.offset;
      }
    });
    node.absolutePosition(absPos);
  };

  const handleDragEnd = () => {
    setGuides([]);
    saveToHistory();
  };

  const handleTransformEnd = () => {
    saveToHistory();
  };

  // ==================== DESIGN OPERATIONS ====================
  const randomizeDesign = () => {
    if (textElements.length === 0 && !bgImage) return;

    // Random colors palette
    const colors = ["#FFFFFF", "#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA"];
    
    const randomized = textElements.map((el) => ({
      ...el,
      x: Math.random() * (CANVAS_SIZE - 150) + 25,
      y: Math.random() * (CANVAS_SIZE - 100) + 25,
      fill: colors[Math.floor(Math.random() * colors.length)],
      fontSize: Math.floor(Math.random() * 60) + 24,
      fontFamily: FONTS[Math.floor(Math.random() * FONTS.length)].family,
      rotation: Math.random() * 30 - 15,
    }));
    
    setTextElements(randomized);
    
    // Random filter
    const filterKeys = Object.keys(FILTER_TYPES);
    const randomFilter = FILTER_TYPES[filterKeys[Math.floor(Math.random() * filterKeys.length)]];
    setCurrentFilter(randomFilter);
    
    saveToHistory();
    toast.success("Случайный дизайн применён!");
  };

  const resetDesign = () => {
    setTextElements([]);
    setBgImage(null);
    setBgImageData(null);
    setCurrentFilter(FILTER_TYPES.NONE);
    setFilterValue(0.5);
    setSelectedId(null);
    setGuides([]);
    setHistory([]);
    setHistoryIndex(-1);
    setCurrentProjectId(null);
    setCurrentProjectName("");
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Дизайн сброшен");
  };

  // ==================== SAVE COVER ====================
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

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

      {/* Save Project Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Сохранить проект</DialogTitle>
            <DialogDescription>
              Введите название для вашего проекта
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={currentProjectName}
              onChange={(e) => setCurrentProjectName(e.target.value)}
              placeholder="Название проекта"
              className="bg-zinc-800"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveProject(currentProjectName);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={() => saveProject(currentProjectName)} 
              className="bg-primary"
              disabled={savingProject || !currentProjectName.trim()}
            >
              {savingProject ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Сохранить
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">RandomCover</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {currentProjectName || "Новый проект"}
                  </p>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Undo/Redo buttons */}
                <div className="flex items-center gap-1 mr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    title="Отменить (Ctrl+Z)"
                    className="h-9 w-9"
                    data-testid="undo-btn"
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
                    data-testid="redo-btn"
                  >
                    <Redo2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Save button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentProjectId) {
                      saveProject(currentProjectName);
                    } else {
                      setShowSaveDialog(true);
                    }
                  }}
                  disabled={textElements.length === 0 && !bgImage}
                  className="gap-2"
                  data-testid="save-project-btn"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {currentProjectId ? "Сохранить" : "Сохранить проект"}
                  </span>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Tabs: Editor / My Projects */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-zinc-900/50 border border-white/5">
              <TabsTrigger value="editor" className="gap-2" data-testid="editor-tab">
                <ImageIcon className="w-4 h-4" />
                Редактор
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-2" data-testid="projects-tab">
                <FolderOpen className="w-4 h-4" />
                Мои проекты
                {projects.length > 0 && (
                  <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                    {projects.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Editor Tab */}
            <TabsContent value="editor" className="mt-0">
              {/* Mobile Controls Toggle */}
              <div className="lg:hidden mb-4">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setMobileControlsOpen(!mobileControlsOpen)}
                >
                  <span className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Панель инструментов
                  </span>
                  {mobileControlsOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex flex-col lg:grid lg:grid-cols-[1fr,320px] gap-4 lg:gap-6">
                {/* Canvas Area */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="order-1"
                >
                  <div 
                    ref={containerRef}
                    className="bg-zinc-900/50 rounded-2xl border border-white/5 p-3 sm:p-4 lg:p-6"
                  >
                    <div 
                      className="mx-auto bg-zinc-800 rounded-xl overflow-hidden relative"
                      style={{ 
                        width: containerSize, 
                        height: containerSize,
                        boxShadow: "0 0 60px rgba(139, 92, 246, 0.1)"
                      }}
                      data-testid="canvas-container"
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

                    <p className="text-center text-xs text-muted-foreground mt-3 lg:mt-4">
                      Финальное разрешение: {OUTPUT_SIZE}x{OUTPUT_SIZE}px • 
                      История: {historyIndex + 1}/{history.length}
                    </p>
                    
                    {/* Mobile Quick Actions */}
                    <div className="flex lg:hidden gap-2 mt-4 justify-center flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 max-w-[140px]"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Фото
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addTextElement}
                        className="flex-1 max-w-[140px]"
                      >
                        <Type className="w-4 h-4 mr-1" />
                        Текст
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveCover}
                        disabled={saving || (!bgImage && textElements.length === 0)}
                        className="flex-1 max-w-[140px] bg-primary"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-1" />
                            Скачать
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Controls Panel - Desktop always visible, Mobile collapsible */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`order-2 space-y-3 lg:space-y-4 ${mobileControlsOpen ? 'block' : 'hidden lg:block'}`}
                >
                  {/* Mobile Tab Navigation */}
                  <div className="lg:hidden flex gap-1 bg-zinc-900/50 rounded-xl p-1 border border-white/5">
                    <button
                      onClick={() => setActiveControlTab("image")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                        activeControlTab === "image" 
                          ? "bg-primary text-white" 
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <ImageIcon className="w-4 h-4 mx-auto mb-1" />
                      Фон
                    </button>
                    <button
                      onClick={() => setActiveControlTab("text")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                        activeControlTab === "text" 
                          ? "bg-primary text-white" 
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Type className="w-4 h-4 mx-auto mb-1" />
                      Текст
                    </button>
                    <button
                      onClick={() => setActiveControlTab("actions")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                        activeControlTab === "actions" 
                          ? "bg-primary text-white" 
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Settings2 className="w-4 h-4 mx-auto mb-1" />
                      Действия
                    </button>
                  </div>

                  {/* Image Upload - Show on desktop or when image tab active on mobile */}
                  <div className={`bg-zinc-900/50 rounded-2xl border border-white/5 p-3 lg:p-4 ${
                    activeControlTab !== "image" ? "hidden lg:block" : ""
                  }`}>
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm lg:text-base">
                      <Upload className="w-4 h-4 text-primary" />
                      Фоновое изображение
                    </h3>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      data-testid="image-upload-input"
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="upload-image-btn"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {bgImage ? "Заменить фото" : "Загрузить фото"}
                    </Button>

                    {/* AI Image Generation */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <Label className="text-xs text-primary flex items-center gap-1 mb-2">
                        <Shuffle className="w-3 h-3" />
                        AI Генерация (Stable Diffusion XL)
                      </Label>
                      <Input
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Опишите изображение на английском..."
                        className="bg-zinc-800 text-sm"
                        data-testid="ai-prompt-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !generatingAI) {
                            generateAIImage();
                          }
                        }}
                      />
                      <Button
                        variant="secondary"
                        className="w-full mt-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        onClick={generateAIImage}
                        disabled={generatingAI || !aiPrompt.trim()}
                        data-testid="generate-ai-btn"
                      >
                        {generatingAI ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Генерация (~30 сек)...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Сгенерировать
                          </>
                        )}
                      </Button>
                    </div>

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
                          <SelectTrigger className="mt-1 bg-zinc-800" data-testid="filter-select">
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
                  <div className={`bg-zinc-900/50 rounded-2xl border border-white/5 p-3 lg:p-4 ${
                    activeControlTab !== "text" ? "hidden lg:block" : ""
                  }`}>
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm lg:text-base">
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
                              data-testid="text-content-input"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Шрифт</Label>
                            <Select 
                              value={selectedText.fontFamily} 
                              onValueChange={(val) => updateSelectedText("fontFamily", val)}
                            >
                              <SelectTrigger className="mt-1 bg-zinc-800" data-testid="font-select">
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

                          <div className="grid grid-cols-2 gap-2 lg:gap-3">
                            <div>
                              <Label className="text-xs">Цвет</Label>
                              <div className="flex gap-2 mt-1">
                                <Input
                                  type="color"
                                  value={selectedText.fill}
                                  onChange={(e) => updateSelectedText("fill", e.target.value)}
                                  className="w-10 h-9 p-1 bg-zinc-800"
                                  data-testid="color-input"
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
                                data-testid="font-size-slider"
                              />
                            </div>
                          </div>

                          <Button
                            onClick={deleteSelectedText}
                            variant="outline"
                            className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            data-testid="delete-text-btn"
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
                        data-testid="add-text-btn"
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
                      data-testid="random-design-btn"
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      Случайный дизайн
                    </Button>

                    <Button
                      onClick={resetDesign}
                      variant="outline"
                      className="w-full"
                      data-testid="reset-design-btn"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Сбросить
                    </Button>

                    <Button
                      onClick={saveCover}
                      className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                      disabled={saving || (!bgImage && textElements.length === 0)}
                      data-testid="save-cover-btn"
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
                      <li>• <kbd className="px-1 bg-zinc-800 rounded">Ctrl+S</kbd> — сохранить проект</li>
                      <li>• Проект автоматически сохраняется</li>
                    </ul>
                  </div>
                </motion.div>
              </div>
            </TabsContent>

            {/* Projects Tab */}
            <TabsContent value="projects" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Мои проекты</h2>
                  <Button 
                    onClick={startNewProject}
                    className="gap-2"
                    data-testid="new-project-btn"
                  >
                    <Plus className="w-4 h-4" />
                    Новый проект
                  </Button>
                </div>

                {loadingProjects ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12">
                    <FileImage className="w-16 h-16 mx-auto text-zinc-700 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Нет сохранённых проектов</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Создайте свою первую обложку в редакторе и сохраните проект
                    </p>
                    <Button onClick={() => setActiveTab("editor")} variant="outline">
                      Перейти в редактор
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => loadProject(project.id)}
                        className={`group relative bg-zinc-800/50 rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                          currentProjectId === project.id ? "ring-2 ring-primary" : ""
                        }`}
                        data-testid={`project-card-${project.id}`}
                      >
                        {/* Preview */}
                        <div className="aspect-square bg-zinc-900">
                          {project.preview_url ? (
                            <img
                              src={project.preview_url}
                              alt={project.project_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileImage className="w-12 h-12 text-zinc-700" />
                            </div>
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="p-3">
                          <h4 className="font-medium text-sm truncate">
                            {project.project_name}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(project.updated_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 bg-black/50 hover:bg-black/70"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => loadProject(project.id)}>
                                <FolderOpen className="w-4 h-4 mr-2" />
                                Открыть
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => deleteProject(project.id, e)}
                                className="text-red-400"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Current indicator */}
                        {currentProjectId === project.id && (
                          <div className="absolute top-2 left-2">
                            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                              Текущий
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Sidebar>
  );
}
