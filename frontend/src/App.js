import { useState, useEffect } from "react";
import "@/App.css";
import { Reorder, AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Presentation, Filter, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

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

function DemandCard({ demand, isDeleteMode, selectedIds, onToggleSelect, onDragStart, onDragEnd }) {
  const priorityStyle = PRIORITY_COLORS[demand.priority];
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`bg-white p-6 rounded-xl border ${priorityStyle.border} shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden cursor-grab active:cursor-grabbing`}
      data-testid={`demand-card-${demand.id}`}
      onMouseDown={onDragStart}
      onMouseUp={onDragEnd}
      onTouchStart={onDragStart}
      onTouchEnd={onDragEnd}
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
  );
}

function PresentationMode({ demands, categoryTitle, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!demands || demands.length === 0) return null;
  
  const currentDemand = demands[currentIndex];
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
            {currentIndex + 1} / {demands.length}
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
              onClick={() => setCurrentIndex(Math.min(demands.length - 1, currentIndex + 1))}
              disabled={currentIndex === demands.length - 1}
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

  const handleReorder = (newOrder, category) => {
    // Update local state immediately for smooth UX
    const otherDemands = filteredDemands.filter(d => d.category !== category);
    setFilteredDemands([...otherDemands, ...newOrder]);
  };

  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/50" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-[#004C97] border-b border-[#003D7A] sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="app-title">
            Gestão de demandas semanal
          </h1>
          <div className="text-lg text-white font-semibold" data-testid="team-name">Desenvolvimento de Vendas</div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6 sticky top-[89px] z-30 bg-gradient-to-br from-slate-50 to-sky-50/50">
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
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCategory(section.id);
              }}
              onDragLeave={() => setDragOverCategory(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedItem && draggedItem.category !== section.id) {
                  moveDemand(draggedItem.id, section.id);
                }
                setDraggedItem(null);
                setDragOverCategory(null);
              }}
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
                className={`min-h-32 space-y-3 transition-all duration-300 ${
                  dragOverCategory === section.id ? 'bg-sky-50 border-2 border-dashed border-sky-300 rounded-xl p-4' : ''
                }`}
              >
                {sectionDemands.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-sm">Nenhuma demanda nesta categoria</p>
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={sectionDemands}
                    onReorder={(newOrder) => handleReorder(newOrder, section.id)}
                    className="space-y-3"
                  >
                    {sectionDemands.map(demand => (
                      <Reorder.Item
                        key={demand.id}
                        value={demand}
                        drag
                        dragListener={!isDeleteMode}
                        onDragStart={() => setDraggedItem(demand)}
                        onDragEnd={() => setDraggedItem(null)}
                      >
                        <DemandCard
                          demand={demand}
                          isDeleteMode={isDeleteMode}
                          selectedIds={selectedIds}
                          onToggleSelect={toggleSelect}
                        />
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
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
            demands={getDemandsByCategory(presentationMode.category)}
            categoryTitle={presentationMode.title}
            onClose={() => setPresentationMode(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
