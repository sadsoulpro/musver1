import { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from "react-konva";
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
import { api } from "@/App";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import { 
  Upload, Type, Shuffle, Download, Trash2, 
  Loader2, Image as ImageIcon, RotateCcw
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

// Available filters for background - only use safe filters
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
const CANVAS_SIZE = 500; // Visual size
const OUTPUT_SIZE = 3000; // Export size
const PIXEL_RATIO = OUTPUT_SIZE / CANVAS_SIZE; // 6

// Load Google Fonts
const loadFonts = () => {
  const link = document.createElement("link");
  link.href = "https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Montserrat:wght@400;700&family=Oswald:wght@400;700&family=Roboto:wght@400;700&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);
};

// Text element component with transformer
function TextElement({ shapeProps, isSelected, onSelect, onChange, onDelete }) {
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
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);
          
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(50, node.width() * scaleX),
            fontSize: Math.max(12, shapeProps.fontSize * scaleY),
            rotation: node.rotation(),
          });
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

// Background image with filters
function BackgroundImage({ image, filterType, filterValue }) {
  const imageRef = useRef();

  useEffect(() => {
    if (imageRef.current && image) {
      const node = imageRef.current;
      
      // Clear previous filters
      node.clearCache();
      
      if (filterType && filterType !== FILTER_TYPES.NONE && Konva.Filters) {
        node.cache();
        
        // Apply filter based on type
        switch (filterType) {
          case FILTER_TYPES.GRAYSCALE:
            if (Konva.Filters.Grayscale) {
              node.filters([Konva.Filters.Grayscale]);
            }
            break;
          case FILTER_TYPES.SEPIA:
            if (Konva.Filters.Sepia) {
              node.filters([Konva.Filters.Sepia]);
            }
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
            if (Konva.Filters.Invert) {
              node.filters([Konva.Filters.Invert]);
            }
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

  // Calculate scale to cover the canvas
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

export default function RandomCover() {
  const stageRef = useRef();
  const containerRef = useRef();
  const fileInputRef = useRef();
  
  const [bgImage, setBgImage] = useState(null);
  const [textElements, setTextElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [currentFilter, setCurrentFilter] = useState(FILTER_TYPES.NONE);
  const [filterValue, setFilterValue] = useState(0.5);
  const [saving, setSaving] = useState(false);
  const [containerSize, setContainerSize] = useState(CANVAS_SIZE);
  
  // Selected text settings
  const [textContent, setTextContent] = useState("Ваш текст");
  const [textFont, setTextFont] = useState("Anton");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(48);

  // Load fonts on mount
  useEffect(() => {
    loadFonts();
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

  // Handle background image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.src = reader.result;
      img.onload = () => {
        setBgImage(img);
        toast.success("Изображение загружено");
      };
    };
    reader.readAsDataURL(file);
  };

  // Add new text element
  const addTextElement = () => {
    const newText = {
      id: `text-${Date.now()}`,
      text: textContent,
      x: CANVAS_SIZE / 2 - 100,
      y: CANVAS_SIZE / 2,
      fontSize: textSize,
      fontFamily: textFont,
      fill: textColor,
      width: 200,
      align: "center",
      rotation: 0,
    };
    setTextElements([...textElements, newText]);
    setSelectedId(newText.id);
    toast.success("Текст добавлен");
  };

  // Update text element
  const updateTextElement = (id, newAttrs) => {
    setTextElements(
      textElements.map((el) => (el.id === id ? { ...el, ...newAttrs } : el))
    );
  };

  // Delete selected text
  const deleteSelectedText = () => {
    if (selectedId) {
      setTextElements(textElements.filter((el) => el.id !== selectedId));
      setSelectedId(null);
      toast.success("Текст удален");
    }
  };

  // Update selected text properties
  useEffect(() => {
    if (selectedId) {
      const selected = textElements.find((el) => el.id === selectedId);
      if (selected) {
        setTextContent(selected.text);
        setTextFont(selected.fontFamily);
        setTextColor(selected.fill);
        setTextSize(selected.fontSize);
      }
    }
  }, [selectedId]);

  // Apply text changes to selected element
  const applyTextChanges = () => {
    if (selectedId) {
      updateTextElement(selectedId, {
        text: textContent,
        fontFamily: textFont,
        fill: textColor,
        fontSize: textSize,
      });
    }
  };

  // Random design generator
  const randomizeDesign = () => {
    // Random filter for background (skip NONE which is index 0)
    const randomFilterIndex = Math.floor(Math.random() * (FILTERS.length - 1)) + 1;
    setCurrentFilter(FILTERS[randomFilterIndex].type);
    setFilterValue(Math.random() * 0.5 + 0.3);

    // Randomize text elements
    setTextElements(
      textElements.map((el) => ({
        ...el,
        x: Math.random() * (CANVAS_SIZE - 200) + 50,
        y: Math.random() * (CANVAS_SIZE - 100) + 50,
        fontFamily: FONTS[Math.floor(Math.random() * FONTS.length)].family,
        rotation: Math.random() * 30 - 15,
        fontSize: Math.floor(Math.random() * 40) + 32,
      }))
    );

    toast.success("Случайный дизайн применен!");
  };

  // Reset design
  const resetDesign = () => {
    setCurrentFilter(FILTER_TYPES.NONE);
    setFilterValue(0.5);
    setTextElements([]);
    setBgImage(null);
    setSelectedId(null);
    toast.success("Дизайн сброшен");
  };

  // Save/Export cover
  const saveCover = async () => {
    if (!stageRef.current) return;

    setSaving(true);
    try {
      // Deselect all to hide transformers
      setSelectedId(null);
      
      // Wait for state update
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Export with high resolution
      const dataURL = stageRef.current.toDataURL({
        pixelRatio: PIXEL_RATIO,
        mimeType: "image/png",
      });

      // Send to backend
      const response = await api.post("/covers/upload", {
        image: dataURL,
        filename: `cover_${Date.now()}.png`,
      });

      toast.success("Обложка сохранена!");
      
      // Also trigger download
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

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 mb-2">
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
                {/* Canvas Container */}
                <div 
                  className="mx-auto bg-zinc-800 rounded-xl overflow-hidden"
                  style={{ 
                    width: containerSize, 
                    height: containerSize,
                    boxShadow: "0 0 60px rgba(139, 92, 246, 0.1)"
                  }}
                  onClick={(e) => {
                    // Deselect when clicking on empty area
                    if (e.target === e.currentTarget) {
                      setSelectedId(null);
                    }
                  }}
                >
                  <Stage
                    ref={stageRef}
                    width={containerSize}
                    height={containerSize}
                    scaleX={scale}
                    scaleY={scale}
                    onMouseDown={(e) => {
                      // Deselect when clicking on empty area
                      if (e.target === e.target.getStage()) {
                        setSelectedId(null);
                      }
                    }}
                  >
                    <Layer>
                      {/* Background color */}
                      <KonvaImage
                        x={0}
                        y={0}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        fill="#1a1a1a"
                      />
                      
                      {/* Background image with filter */}
                      <BackgroundImage 
                        image={bgImage} 
                        filter={currentFilter}
                        filterValue={filterValue}
                      />
                    </Layer>
                    
                    <Layer>
                      {/* Text elements */}
                      {textElements.map((el) => (
                        <TextElement
                          key={el.id}
                          shapeProps={el}
                          isSelected={el.id === selectedId}
                          onSelect={() => setSelectedId(el.id)}
                          onChange={(newAttrs) => updateTextElement(el.id, newAttrs)}
                          onDelete={() => deleteSelectedText()}
                        />
                      ))}
                    </Layer>
                  </Stage>
                </div>

                {/* Canvas Info */}
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Финальное разрешение: {OUTPUT_SIZE}x{OUTPUT_SIZE}px
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

                {/* Filter Selection */}
                {bgImage && (
                  <div className="mt-3">
                    <Label className="text-xs">Фильтр</Label>
                    <Select
                      value={FILTERS.findIndex((f) => f.filter === currentFilter).toString()}
                      onValueChange={(val) => setCurrentFilter(FILTERS[parseInt(val)].filter)}
                    >
                      <SelectTrigger className="mt-1 bg-zinc-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FILTERS.map((f, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Text Controls */}
              <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  Текст
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Содержание</Label>
                    <Input
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      className="mt-1 bg-zinc-800"
                      placeholder="Введите текст"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Шрифт</Label>
                    <Select value={textFont} onValueChange={setTextFont}>
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
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-10 h-9 p-1 bg-zinc-800"
                        />
                        <Input
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="flex-1 bg-zinc-800 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Размер: {textSize}px</Label>
                      <Slider
                        value={[textSize]}
                        onValueChange={([val]) => setTextSize(val)}
                        min={12}
                        max={120}
                        step={1}
                        className="mt-3"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={addTextElement} 
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      <Type className="w-4 h-4 mr-1" />
                      Добавить
                    </Button>
                    {selectedId && (
                      <>
                        <Button 
                          onClick={applyTextChanges}
                          variant="outline"
                          className="flex-1"
                        >
                          Применить
                        </Button>
                        <Button
                          onClick={deleteSelectedText}
                          variant="outline"
                          size="icon"
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
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
                  <li>• Загрузите фото для фона</li>
                  <li>• Добавьте текст и перетащите его</li>
                  <li>• Используйте уголки для масштабирования</li>
                  <li>• Нажмите "Случайный дизайн" для вдохновения</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
