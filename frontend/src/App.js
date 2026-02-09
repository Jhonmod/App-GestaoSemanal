import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "@/App.css";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Presentation, Filter, GripVertical, ArrowRight, Edit2, Check, Calendar, Users, Tags } from "lucide-react";
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

const API = "https://app-gestaosemanal-1.onrender.com/api";

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
  "Help Desk",
  "Coordenação",
  "Treinamentos"
];

const RESPONSIBLES_LIST = [
  "Alisson", "Jhonatas", "Maria Clara", "Isabela", "Bianca", "Eduardo",
  "Vinicius Fontes", "Vinicius Rodovalho", "Jacyara", "Leandro",
  "Marcelo", "Nathalia", "Felipe"
];

const SECTIONS = [
  { id: "last_week", title: "Temas Resolvidos (Semana Passada)", color: "emerald" },
  { id: "this_week", title: "Temas da Semana Atual", color: "sky" },
  { id: "stalled", title: "Temas Parados", color: "slate" }
];

/* ===========================
   DEMAND CARD (SEM ALTERAÇÃO)
=========================== */
function DemandCard({ demand, isDeleteMode, selectedIds, onToggleSelect, onMoveTo, onOpenPresentation, onDragStart, onDragEnd, onEdit }) {
  const priorityStyle = PRIORITY_COLORS[demand.priority];

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('demandId', demand.id);
    e.dataTransfer.setData('currentCategory', demand.category);
    const dragImage = e.currentTarget.cloneNode(true);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.width = e.currentTarget.offsetWidth + 'px';
    dragImage.style.transform = 'rotate(3deg)';
    dragImage.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
    dragImage.style.opacity = '0.95';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, e.currentTarget.offsetWidth / 2, 30);
    setTimeout(() => {
      if (document.body.contains(dragImage)) document.body.removeChild(dragImage);
    }, 0);
    e.currentTarget.classList.add('dragging');
    if (onDragStart) onDragStart();
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    if (onDragEnd) onDragEnd();
  };

  const subgroups = Array.isArray(demand.subgroup) ? demand.subgroup : [demand.subgroup];
  const responsibles = Array.isArray(demand.responsible) ? demand.responsible : [demand.responsible];

  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            draggable={!isDeleteMode}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`bg-white p-6 rounded-xl border ${priorityStyle.border} shadow-sm hover:shadow-md transition-shadow duration-300 group relative overflow-hidden ${!isDeleteMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityStyle.badge}`}></div>

            {isDeleteMode && (
              <div className="absolute top-4 right-4">
                <Checkbox
                  checked={selectedIds.includes(demand.id)}
                  onCheckedChange={() => onToggleSelect(demand.id)}
                />
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${priorityStyle.bg} ${priorityStyle.text}`}>
                    PRIORIDADE {demand.priority.toUpperCase()}
                  </span>
                  {subgroups.map((sg, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                      {sg}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">{demand.description}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium">Responsáveis:</span>
                  <span>{responsibles.join(", ")}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => onEdit(demand)}>
          <Edit2 className="w-4 h-4 mr-2" />
          Editar Tema
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArrowRight className="w-4 h-4 mr-2" />
            Mover para
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {SECTIONS.map(sec => (
              <ContextMenuItem
                key={sec.id}
                onClick={() => onMoveTo(demand.id, sec.id)}
                disabled={demand.category === sec.id}
              >
                {sec.title}
              </ContextMenuItem>
            ))}
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

/* ===========================
   PRESENTATION MODE (ALTERADO)
=========================== */
function PresentationMode({ demands, categoryTitle, onClose, singleDemand, onUpdateObservation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [tempObs, setTempObs] = useState("");

  const demandsToShow = useMemo(() => {
    return singleDemand ? [singleDemand] : demands;
  }, [singleDemand, demands]);

  useEffect(() => {
    if (demandsToShow[currentIndex]) {
      setTempObs(demandsToShow[currentIndex].observation || "");
    }
  }, [currentIndex, demandsToShow]);

  if (!demandsToShow || demandsToShow.length === 0) return null;

  const currentDemand = demandsToShow[currentIndex];
  const priorityStyle = PRIORITY_COLORS[currentDemand.priority];
  const subgroups = Array.isArray(currentDemand.subgroup) ? currentDemand.subgroup : [currentDemand.subgroup];
  const responsibles = Array.isArray(currentDemand.responsible) ? currentDemand.responsible : [currentDemand.responsible];

  const handleSaveObs = async () => {
    await onUpdateObservation(currentDemand.id, tempObs);
    setIsEditingObs(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-900/98 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
    >
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white w-full max-w-6xl min-h-[85vh] md:aspect-video rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] p-8 md:p-16 flex flex-col relative overflow-hidden z-10"
      >
        <div className={`absolute top-0 left-0 right-0 h-3 ${priorityStyle.badge} opacity-90`}></div>

        {/* HEADER COM CONTADOR NO TOPO */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-widest">
                {categoryTitle}
              </span>
              <span className={`px-4 py-1.5 rounded-full ${priorityStyle.bg} ${priorityStyle.text} text-xs font-bold uppercase tracking-widest border ${priorityStyle.border}`}>
                Prioridade {currentDemand.priority}
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight max-w-4xl">
              {currentDemand.description}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-full border border-slate-100">
              <span className="text-xs font-bold text-slate-500">
                {currentIndex + 1}/{demandsToShow.length}
              </span>
              <Button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setCurrentIndex(Math.min(demandsToShow.length - 1, currentIndex + 1))}
                disabled={currentIndex === demandsToShow.length - 1}
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full h-12 w-12"
            >
              <X className="w-8 h-8" />
            </Button>
          </div>
        </div>

        {/* RESTANTE DO COMPONENTE CONTINUA IGUAL */}
        <div className="flex-1 mb-10">
          <div className="relative group bg-slate-50/80 rounded-[2rem] p-8 border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Observação Detalhada</span>
            </div>

            {!isEditingObs && (
              <button
                onClick={() => setIsEditingObs(true)}
                className="absolute top-10 right-6 p-3 text-slate-300 hover:text-sky-600 hover:bg-sky-50 rounded-xl"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}

            {isEditingObs ? (
              <div className="space-y-4">
                <textarea
                  className="w-full p-6 bg-white border-2 border-sky-100 rounded-2xl text-xl text-slate-700 outline-none min-h-[150px]"
                  value={tempObs}
                  onChange={(e) => setTempObs(e.target.value)}
                />
                <div className="flex gap-3 justify-end">
                  <Button onClick={handleSaveObs} className="bg-sky-600 hover:bg-sky-700 px-8 py-6 rounded-2xl text-lg">
                    <Check className="w-5 h-5 mr-2" /> Salvar Alterações
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditingObs(false)} className="px-8 py-6 rounded-2xl text-lg">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-2xl md:text-3xl text-slate-600 font-medium leading-relaxed italic">
                {currentDemand.observation ? `${currentDemand.observation}` : "Nenhuma observação adicional registrada para este tema."}
              </p>
            )}
          </div>
        </div>

        {/* GRID INFERIOR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Responsáveis</span>
              <p className="text-lg font-bold text-slate-800">{responsibles.join(", ")}</p>
            </div>
          </div>

          <div className="p-6 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Previsão de Entrega</span>
              <p className="text-lg font-bold text-slate-800">
                {currentDemand.deliveryDate || "A definir"}
              </p>
            </div>
          </div>

          <div className="p-6 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Tags className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Áreas Envolvidas</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {subgroups.map((sg, i) => (
                  <span key={i} className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                    {sg}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ===========================
   APP PRINCIPAL (INALTERADO)
=========================== */

function App() {
  const [demands, setDemands] = useState([]);
  const [filteredDemands, setFilteredDemands] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDemandId, setEditingDemandId] = useState(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [presentationMode, setPresentationMode] = useState(null);
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterSubgroup, setFilterSubgroup] = useState("all");
  const [filterResponsible, setFilterResponsible] = useState("all");

  const [formData, setFormData] = useState({
    description: "",
    priority: "media",
    responsible: [],
    subgroup: [],
    observation: "",
    deliveryDate: "",
    category: "this_week"
  });

const fetchDemands = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/demands`);
      
      const treatedData = response.data.map(d => ({
        ...d,
        subgroup: typeof d.subgroup === 'string' ? d.subgroup.split(', ') : (d.subgroup || []),
        responsible: typeof d.responsible === 'string' ? d.responsible.split(', ') : (d.responsible || [])
      }));
      
      setDemands(treatedData);
    } catch (error) {
      console.error("Error fetching demands:", error);
      toast.error("Erro ao carregar demandas");
    }
  }, []);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  const applyFilters = useCallback(() => {
    let filtered = [...demands];

    if (filterPriority !== "all") {
      filtered = filtered.filter(d => d.priority === filterPriority);
    }

    if (filterSubgroup !== "all") {
      filtered = filtered.filter(d => {
        const subgroups = Array.isArray(d.subgroup) ? d.subgroup : [d.subgroup];
        return subgroups.includes(filterSubgroup);
      });
    }

    if (filterResponsible !== "all") {
      filtered = filtered.filter(d => {
        const responsibles = Array.isArray(d.responsible) ? d.responsible : [d.responsible];
        return responsibles.includes(filterResponsible);
      });
    }

    setFilteredDemands(filtered);
  }, [demands, filterPriority, filterSubgroup, filterResponsible]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleOpenCreate = () => {
    setEditingDemandId(null);
    setFormData({
      description: "",
      priority: "media",
      responsible: [],
      subgroup: [],
      observation: "",
      deliveryDate: "",
      category: "this_week"
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (demand) => {
    setEditingDemandId(demand.id);
    setFormData({
      description: demand.description,
      priority: demand.priority,
      responsible: Array.isArray(demand.responsible) ? demand.responsible : [demand.responsible],
      subgroup: Array.isArray(demand.subgroup) ? demand.subgroup : [demand.subgroup],
      observation: demand.observation || "",
      deliveryDate: demand.deliveryDate || "",
      category: demand.category
    });
    setShowCreateModal(true);
  };

  const formatDataInput = (value) => {
    const v = value.replace(/\D/g, "").slice(0, 8);
    if (v.length >= 5) return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
    if (v.length >= 3) return `${v.slice(0, 2)}/${v.slice(2)}`;
    return v;
  };

  const saveDemand = async () => {
    if (!formData.description || formData.responsible.length === 0 || formData.subgroup.length === 0 || !formData.deliveryDate) {
      toast.error("Preencha todos os campos obrigatórios (incluindo responsáveis, sub-grupos e data de entrega)");
      return;
    }
    
    try {
      if (editingDemandId) {
        await axios.put(`${API}/demands/${editingDemandId}`, formData);
        toast.success("Demanda atualizada com sucesso!");
      } else {
        await axios.post(`${API}/demands`, formData);
        toast.success("Demanda criada com sucesso!");
      }
      setShowCreateModal(false);
      fetchDemands();
    } catch (error) {
      console.error("Error saving demand:", error);
      toast.error("Erro ao salvar demanda");
    }
  };

  const updateObservationInline = async (demandId, newObs) => {
    try {
      await axios.put(`${API}/demands/${demandId}`, { observation: newObs });
      setDemands(prev => prev.map(d => d.id === demandId ? { ...d, observation: newObs } : d));
      toast.success("Observação atualizada!");
    } catch (error) {
      toast.error("Erro ao atualizar observação");
    }
  };

  const moveDemand = async (demandId, newCategory) => {
    const originalDemands = [...demands];
    setDemands(prev => 
      prev.map(d => d.id === demandId ? { ...d, category: newCategory } : d)
    );

    try {
      await axios.put(`${API}/demands/${demandId}`, { category: newCategory });
    } catch (error) {
      console.error("Error moving demand:", error);
      toast.error("Erro ao salvar alteração no servidor");
      setDemands(originalDemands);
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

  const toggleSubgroupSelection = (sg) => {
    setFormData(prev => {
      const current = prev.subgroup;
      if (current.includes(sg)) {
        return { ...prev, subgroup: current.filter(item => item !== sg) };
      } else {
        return { ...prev, subgroup: [...current, sg] };
      }
    });
  };

  const toggleResponsibleSelection = (resp) => {
    setFormData(prev => {
      const current = prev.responsible;
      if (current.includes(resp)) {
        return { ...prev, responsible: current.filter(item => item !== resp) };
      } else {
        return { ...prev, responsible: [...current, resp] };
      }
    });
  };

  const getDemandsByCategory = (category) => {
    return filteredDemands.filter(d => d.category === category);
  };

  const [dragOverCategory, setDragOverCategory] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollIntervalRef = useRef(null);

  const handleScrollZoneEnter = (direction) => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }
    
    const scrollSpeed = direction === 'up' ? -15 : 15;
    scrollIntervalRef.current = setInterval(() => {
      window.scrollBy({ top: scrollSpeed, behavior: 'auto' });
    }, 16);
  };
  
  const handleScrollZoneLeave = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => {
    setIsDragging(false);
    handleScrollZoneLeave();
  };

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
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Gestão de demandas semanal
            </h1>
          </div>
          <div className="text-lg text-white font-semibold">Desenvolvimento de Vendas</div>
        </div>
      </header>

      {/* Presentation Mode Modal */}
      <AnimatePresence>
        {presentationMode && (
          <PresentationMode
            demands={getDemandsByCategory(presentationMode.category)}
            categoryTitle={presentationMode.title}
            singleDemand={presentationMode.singleDemand}
            onClose={() => setPresentationMode(null)}
            onUpdateObservation={updateObservationInline}
          />
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-[#004C97] rounded-xl border border-[#003D7A] p-4 shadow-lg">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 text-white">
              <Filter className="w-4 h-4" />
              <span className="font-medium text-sm">Filtros:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm text-white font-medium">Prioridade:</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-32 bg-white">
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
                <SelectTrigger className="w-48 bg-white">
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

            <div className="flex items-center gap-2">
              <Label className="text-sm text-white font-medium">Responsável:</Label>
              <Select value={filterResponsible} onValueChange={setFilterResponsible}>
                <SelectTrigger className="w-48 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {RESPONSIBLES_LIST.map(res => (
                    <SelectItem key={res} value={res}>{res}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {(filterPriority !== "all" || filterSubgroup !== "all" || filterResponsible !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterPriority("all");
                  setFilterSubgroup("all");
                  setFilterResponsible("all");
                }}
                className="text-white hover:bg-white/20"
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
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCategory(section.id);
              }}
              onDragLeave={() => setDragOverCategory(null)}
              onDrop={async (e) => {
                e.preventDefault();
                const demandId = e.dataTransfer.getData('demandId');
                const currentCategory = e.dataTransfer.getData('currentCategory');
                
                if (demandId && currentCategory !== section.id) {
                  await moveDemand(demandId, section.id);
                  toast.success('Demanda movida com sucesso!');
                }
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
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onEdit={handleOpenEdit}
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
          onClick={handleOpenCreate}
          className="bg-sky-500 hover:bg-sky-600 text-white rounded-full px-6 py-6 shadow-lg shadow-sky-500/30 flex items-center gap-2 font-semibold transition-transform hover:scale-105 active:scale-95"
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
            >
              Cancelar
            </Button>
            <Button
              onClick={deleteSelected}
              variant="destructive"
              className="rounded-full px-6 py-6 shadow-lg flex items-center gap-2"
              disabled={selectedIds.length === 0}
            >
              <Trash2 className="w-5 h-5" />
              Excluir ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Demand Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDemandId ? "Editar Demanda" : "Criar Nova Demanda"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Tema *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o tema da demanda..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observation">Observação</Label>
              <textarea
                id="observation"
                className="w-full p-2 border rounded-md text-sm min-h-[80px] focus:ring-2 focus:ring-sky-500 outline-none"
                value={formData.observation}
                onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                placeholder="Detalhes adicionais sobre o tema..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Data de Entrega *</Label>
                <Input
                  id="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: formatDataInput(e.target.value) })}
                  placeholder="DD/MM/AAAA"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sub-grupos *</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-slate-50">
                {SUBGROUPS.map(sg => (
                  <div key={sg} className="flex items-center gap-2">
                    <Checkbox 
                      id={`sg-${sg}`}
                      checked={formData.subgroup.includes(sg)}
                      onCheckedChange={() => toggleSubgroupSelection(sg)}
                    />
                    <label htmlFor={`sg-${sg}`} className="text-xs text-slate-600 cursor-pointer">{sg}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Responsáveis *</Label>
              <div className="grid grid-cols-3 gap-2 p-3 border rounded-md bg-slate-50">
                {RESPONSIBLES_LIST.map(res => (
                  <div key={res} className="flex items-center gap-2">
                    <Checkbox 
                      id={`res-${res}`}
                      checked={formData.responsible.includes(res)}
                      onCheckedChange={() => toggleResponsibleSelection(res)}
                    />
                    <label htmlFor={`res-${res}`} className="text-[10px] text-slate-600 cursor-pointer">{res}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria Inicial</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map(sec => (
                    <SelectItem key={sec.id} value={sec.id}>{sec.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button onClick={saveDemand} className="bg-sky-600 hover:bg-sky-700">
              {editingDemandId ? "Salvar Alterações" : "Criar Tema"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
