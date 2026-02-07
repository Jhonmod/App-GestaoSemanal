import { useState, useEffect, useRef } from "react";
import "@/App.css";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Presentation, Filter, GripVertical, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PRIORITY_COLORS = {
  alta: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-600", badge: "bg-rose-500" },
  media: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", badge: "bg-amber-500" },
  baixa: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-600", badge: "bg-sky-600" }
};

const SUBGROUPS = [
  "Gestão de territórios",
  "BI Analytics",
  "Setor Autônomos",
  "Agendas e Incentivos",
  "Help Desk"
];

const SECTIONS = [
  { id: "last_week", title: "Temas Resolvidos (Semana Passada)", color: "emerald" },
  { id: "this_week", title: "Temas da Semana Atual", color: "sky" },
  { id: "stalled", title: "Temas Parados", color: "slate" }
];

function DemandCard({ demand, isDeleteMode, selectedIds, onToggleSelect, onMoveTo, onOpenPresentation }) {
  const priorityStyle = PRIORITY_COLORS[demand.priority];
  
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('demandId', demand.id);
    e.dataTransfer.setData('currentCategory', demand.category);
    
    // Criar clone visual do elemento
    const dragImage = e.currentTarget.cloneNode(true);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.width = e.currentTarget.offsetWidth + 'px';
    dragImage.style.transform = 'rotate(3deg)';
    dragImage.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
    dragImage.style.opacity = '0.95';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, e.currentTarget.offsetWidth / 2, 30);
    
    // Remover o clone após o drag
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
    
    // Adicionar classe ao elemento original
    e.currentTarget.classList.add('dragging');
  };
  
  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          draggable={!isDeleteMode}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={`bg-white p-6 rounded-xl border ${priorityStyle.border} shadow-sm hover:shadow-md transition-shadow duration-300 group relative overflow-hidden ${!isDeleteMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
          data-testid={`demand-card-${demand.id}`}
        >
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityStyle.badge}`}></div>
          
          {isDeleteMode && (
            <div className="absolute top-4 right-4">
              <Checkbox
                checked={selectedIds.includes(demand.id)}
                onCheckedChange={() => onToggleSelect(demand.id)}
                data-testid={`delete-checkbox-${demand.id}`}
              />
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <div className="text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${priorityStyle.bg} ${priorityStyle.text}`}>
                  {demand.priority.toUpperCase()}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                  {demand.subgroup}
                </span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">{demand.description}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium">Responsável:</span>
                <span>{demand.responsible}</span>
              </div>
              <div className="text-xs text-slate-400 mt-2">{demand.id}</div>
            </div>
          </div>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArrowRight className="w-4 h-4 mr-2" />
            Mover para
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem 
              onClick={() => onMoveTo(demand.id, 'last_week')}
              disabled={demand.category === 'last_week'}
            >
              Temas Resolvidos (Semana Passada)
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onMoveTo(demand.id, 'this_week')}
              disabled={demand.category === 'this_week'}
            >
              Temas da Semana Atual
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onMoveTo(demand.id, 'stalled')}
              disabled={demand.category === 'stalled'}
            >
              Temas Parados
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem onClick={() => onOpenPresentation(demand)}>
          <Presentation className="w-4 h-4 mr-2" />
          Modo Apresentação
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function PresentationMode({ demands, categoryTitle, onClose, singleDemand }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Se é apresentação de demanda única, usar apenas essa demanda
  const demandsToShow = singleDemand ? [singleDemand] : demands;
  
  if (!demandsToShow || demandsToShow.length === 0) return null;
  
  const currentDemand = demandsToShow[currentIndex];
  const priorityStyle = PRIORITY_COLORS[currentDemand.priority];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-8"
      data-testid="presentation-mode"
    >
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1643509324658-a75c1e05f261?crop=entropy&cs=srgb&fm=jpg&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.4 }}
        className="bg-white w-full max-w-5xl aspect-video rounded-3xl shadow-2xl p-16 flex flex-col justify-between relative overflow-hidden z-10"
      >
        <div className={`absolute top-0 left-0 right-0 h-2 ${priorityStyle.badge}`}></div>
        
        <div>
          <div className="text-sm text-slate-500 mb-4">{categoryTitle}</div>
          <h2 className="text-5xl font-bold text-slate-900 mb-8 leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {currentDemand.description}
          </h2>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-lg text-slate-600">Prioridade:</span>
            <span className={`text-2xl font-bold ${priorityStyle.text === 'text-rose-600' ? 'text-rose-600' : priorityStyle.text === 'text-amber-600' ? 'text-amber-500' : 'text-sky-700'}`}>
              {currentDemand.priority.toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-lg text-slate-600">Responsável:</span>
            <span className="text-2xl font-semibold text-slate-900">{currentDemand.responsible}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-lg text-slate-600">Sub-grupo:</span>
            <span className="text-xl text-slate-700">{currentDemand.subgroup}</span>
          </div>
        </div>
        
        <div className="absolute bottom-8 right-8 flex items-center gap-6">
          <span className="text-slate-400 text-sm">
            {currentIndex + 1} / {demandsToShow.length}
          </span>
          <div className="flex gap-3">
            <Button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              variant="outline"
              size="lg"
              className="rounded-full"
              data-testid="presentation-prev-button"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => setCurrentIndex(Math.min(demandsToShow.length - 1, currentIndex + 1))}
              disabled={currentIndex === demandsToShow.length - 1}
              variant="outline"
              size="lg"
              className="rounded-full"
              data-testid="presentation-next-button"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>
      
      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className="absolute top-8 right-8 text-white hover:bg-white/10 rounded-full z-20"
        data-testid="presentation-close-button"
      >
        <X className="w-6 h-6" />
      </Button>
    </motion.div>
  );
}

function App() {
  const [demands, setDemands] = useState([]);
  const [filteredDemands, setFilteredDemands] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [presentationMode, setPresentationMode] = useState(null);
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterSubgroup, setFilterSubgroup] = useState("all");
  
  const [formData, setFormData] = useState({
    description: "",
    priority: "media",
    responsible: "",
    subgroup: SUBGROUPS[0],
    category: "this_week"
  });

  useEffect(() => {
    fetchDemands();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [demands, filterPriority, filterSubgroup]);

  const fetchDemands = async () => {
    try {
      const response = await axios.get(`${API}/demands`);
      setDemands(response.data);
    } catch (error) {
      console.error("Error fetching demands:", error);
      toast.error("Erro ao carregar demandas");
    }
  };

  const applyFilters = () => {
    let filtered = [...demands];
    
    if (filterPriority !== "all") {
      filtered = filtered.filter(d => d.priority === filterPriority);
    }
    
    if (filterSubgroup !== "all") {
      filtered = filtered.filter(d => d.subgroup === filterSubgroup);
    }
    
    setFilteredDemands(filtered);
  };

  const createDemand = async () => {
    if (!formData.description || !formData.responsible) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    try {
      await axios.post(`${API}/demands`, formData);
      toast.success("Demanda criada com sucesso!");
      setShowCreateModal(false);
      setFormData({
        description: "",
        priority: "media",
        responsible: "",
        subgroup: SUBGROUPS[0],
        category: "this_week"
      });
      fetchDemands();
    } catch (error) {
      console.error("Error creating demand:", error);
      toast.error("Erro ao criar demanda");
    }
  };

  const moveDemand = async (demandId, newCategory) => {
    try {
      await axios.put(`${API}/demands/${demandId}`, { category: newCategory });
      fetchDemands();
    } catch (error) {
      console.error("Error moving demand:", error);
      toast.error("Erro ao mover demanda");
    }
  };
  
  const handleContextMoveTo = async (demandId, newCategory) => {
    await moveDemand(demandId, newCategory);
    toast.success("Demanda movida com sucesso!");
  };
  
  const handleOpenSinglePresentation = (demand) => {
    const sectionTitle = SECTIONS.find(s => s.id === demand.category)?.title || "Demanda";
    setPresentationMode({ 
      category: demand.category, 
      title: sectionTitle,
      singleDemand: demand 
    });
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecione pelo menos uma demanda");
      return;
    }
    
    try {
      await axios.post(`${API}/demands/bulk-delete`, { ids: selectedIds });
      toast.success(`${selectedIds.length} demanda(s) excluída(s) com sucesso!`);
      setSelectedIds([]);
      setIsDeleteMode(false);
      fetchDemands();
    } catch (error) {
      console.error("Error deleting demands:", error);
      toast.error("Erro ao excluir demandas");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getDemandsByCategory = (category) => {
    return filteredDemands.filter(d => d.category === category);
  };

  const [dragOverCategory, setDragOverCategory] = useState(null);
  const autoScrollIntervalRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Auto-scroll super suave
  const handleDragOverWithScroll = (e, sectionId) => {
    e.preventDefault();
    setDragOverCategory(sectionId);
    
    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
    }
    
    const scrollZone = 180;
    const maxScrollSpeed = 20;
    const mouseY = e.clientY;
    const windowHeight = window.innerHeight;
    
    // Clear existing interval
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    
    let scrollSpeed = 0;
    
    // Calcular velocidade baseada na proximidade da borda
    if (mouseY < scrollZone) {
      const proximity = 1 - (mouseY / scrollZone);
      scrollSpeed = -Math.ceil(proximity * maxScrollSpeed);
    } else if (mouseY > windowHeight - scrollZone) {
      const proximity = 1 - ((windowHeight - mouseY) / scrollZone);
      scrollSpeed = Math.ceil(proximity * maxScrollSpeed);
    }
    
    // Aplicar scroll se necessário
    if (scrollSpeed !== 0) {
      let currentSpeed = scrollSpeed;
      autoScrollIntervalRef.current = setInterval(() => {
        // Easing para scroll mais suave
        window.scrollBy({ top: currentSpeed * 0.5, behavior: 'auto' });
      }, 8); // Intervalo menor para mais suavidade
    }
  };
  
  const clearAutoScroll = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    isDraggingRef.current = false;
  };
  
  const handleDragLeave = () => {
    setDragOverCategory(null);
    clearAutoScroll();
  };
  
  const handleDrop = async (e, sectionId) => {
    e.preventDefault();
    
    // Limpar scroll imediatamente
    clearAutoScroll();
    
    const demandId = e.dataTransfer.getData('demandId');
    const currentCategory = e.dataTransfer.getData('currentCategory');
    
    if (demandId && currentCategory !== sectionId) {
      await moveDemand(demandId, sectionId);
      toast.success('Demanda movida com sucesso!');
    }
    
    setDragOverCategory(null);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      clearAutoScroll();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/50" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-[#004C97] border-b border-[#003D7A] sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_kanban-vendas/artifacts/dagja3ws_ChatGPT%20Image%207%20de%20fev.%20de%202026%2C%2016_51_34.png" 
              alt="Martins Logo" 
              className="h-12 w-auto brightness-0 invert"
            />
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="app-title">
              Gestão de demandas semanal
            </h1>
          </div>
          <div className="text-lg text-white font-semibold" data-testid="team-name">Desenvolvimento de Vendas</div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6 bg-gradient-to-br from-slate-50 to-sky-50/50">
        <div className="bg-[#004C97] rounded-xl border border-[#003D7A] p-4 shadow-lg">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-white">
              <Filter className="w-4 h-4" />
              <span className="font-medium text-sm">Filtros:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm text-white font-medium">Prioridade:</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40 bg-white" data-testid="filter-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm text-white font-medium">Sub-grupo:</Label>
              <Select value={filterSubgroup} onValueChange={setFilterSubgroup}>
                <SelectTrigger className="w-56 bg-white" data-testid="filter-subgroup">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {SUBGROUPS.map(sg => (
                    <SelectItem key={sg} value={sg}>{sg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {(filterPriority !== "all" || filterSubgroup !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterPriority("all");
                  setFilterSubgroup("all");
                }}
                className="text-white hover:bg-white/20"
                data-testid="clear-filters-button"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {SECTIONS.map(section => {
          const sectionDemands = getDemandsByCategory(section.id);
          
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 shadow-sm"
              data-testid={`section-${section.id}`}
              onDragOver={(e) => handleDragOverWithScroll(e, section.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, section.id)}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {section.title}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPresentationMode({ category: section.id, title: section.title })}
                  disabled={sectionDemands.length === 0}
                  className="gap-2"
                  data-testid={`presentation-button-${section.id}`}
                >
                  <Presentation className="w-4 h-4" />
                  Modo apresentação
                </Button>
              </div>
              
              <div 
                className={`min-h-48 space-y-3 rounded-xl p-6 transition-all duration-300 ${
                  dragOverCategory === section.id ? 'bg-sky-100 border-2 border-dashed border-sky-400 scale-[1.02]' : 'bg-transparent'
                }`}
              >
                {sectionDemands.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <p className="text-sm">Nenhuma demanda nesta categoria</p>
                    {dragOverCategory === section.id && (
                      <p className="text-sm text-sky-600 mt-2 font-semibold">↓ Solte aqui para mover ↓</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {sectionDemands.map(demand => (
                        <DemandCard
                          key={demand.id}
                          demand={demand}
                          isDeleteMode={isDeleteMode}
                          selectedIds={selectedIds}
                          onToggleSelect={toggleSelect}
                          onMoveTo={handleContextMoveTo}
                          onOpenPresentation={handleOpenSinglePresentation}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 left-8 z-[60]">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-sky-500 hover:bg-sky-600 text-white rounded-full px-6 py-6 shadow-lg shadow-sky-500/30 flex items-center gap-2 font-semibold transition-transform hover:scale-105 active:scale-95"
          data-testid="create-demand-button"
        >
          <Plus className="w-5 h-5" />
          Criar Tema
        </Button>
      </div>

      <div className="fixed bottom-8 right-8 z-[60]">
        {!isDeleteMode ? (
          <Button
            onClick={() => setIsDeleteMode(true)}
            variant="destructive"
            className="rounded-full px-6 py-6 shadow-lg flex items-center gap-2 font-semibold transition-transform hover:scale-105 active:scale-95"
            data-testid="delete-mode-button"
          >
            <Trash2 className="w-5 h-5" />
            Excluir Tema
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setIsDeleteMode(false);
                setSelectedIds([]);
              }}
              variant="outline"
              className="rounded-full px-6 py-6 shadow-lg"
              data-testid="cancel-delete-button"
            >
              Cancelar
            </Button>
            <Button
              onClick={deleteSelected}
              variant="destructive"
              className="rounded-full px-6 py-6 shadow-lg flex items-center gap-2"
              disabled={selectedIds.length === 0}
              data-testid="confirm-delete-button"
            >
              <Trash2 className="w-5 h-5" />
              Excluir ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Create Demand Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md" data-testid="create-demand-modal">
          <DialogHeader>
            <DialogTitle>Criar Nova Demanda</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Tema *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o tema da demanda..."
                data-testid="input-description"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade *</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger data-testid="input-priority" className="z-[100]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="alta">Alta Prioridade</SelectItem>
                  <SelectItem value="media">Prioridade Média</SelectItem>
                  <SelectItem value="baixa">Baixa Prioridade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subgroup">Sub-grupo *</Label>
              <Select value={formData.subgroup} onValueChange={(value) => setFormData({ ...formData, subgroup: value })}>
                <SelectTrigger data-testid="input-subgroup" className="z-[100]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {SUBGROUPS.map(sg => (
                    <SelectItem key={sg} value={sg}>{sg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável *</Label>
              <Input
                id="responsible"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                placeholder="Nome do responsável"
                data-testid="input-responsible"
              />
            </div>
            
            <div className="text-sm text-slate-500 bg-sky-50 p-3 rounded-lg border border-sky-200">
              <strong>Categoria:</strong> Semana Atual (você pode mover depois arrastando)
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={createDemand} data-testid="submit-demand-button">
              Criar Demanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Presentation Mode */}
      <AnimatePresence>
        {presentationMode && (
          <PresentationMode
            demands={presentationMode.singleDemand ? null : getDemandsByCategory(presentationMode.category)}
            categoryTitle={presentationMode.title}
            onClose={() => setPresentationMode(null)}
            singleDemand={presentationMode.singleDemand}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
