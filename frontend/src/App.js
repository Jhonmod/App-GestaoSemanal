import { useState, useEffect, useRef, useCallback } from "react";
import "@/App.css";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Presentation, Filter, GripVertical, ArrowRight, ChevronUp, ChevronDown, Edit2, Check } from "lucide-react";
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
  "Coordenação"
];

const SECTIONS = [
  { id: "last_week", title: "Temas Resolvidos (Semana Passada)", color: "emerald" },
  { id: "this_week", title: "Temas da Semana Atual", color: "sky" },
  { id: "stalled", title: "Temas Parados", color: "slate" }
];

// Função para limpar o texto da prioridade
const formatPriorityText = (text) => {
  if (!text) return "";
  return text.toLowerCase().replace(/prioridade/g, "").trim().toUpperCase();
};

function DemandCard({ demand, isDeleteMode, selectedIds, onToggleSelect, onMoveTo, onOpenPresentation, onDragStart, onDragEnd, onEdit }) {
  const priorityStyle = PRIORITY_COLORS[demand.priority] || PRIORITY_COLORS.media;
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('demandId', demand.id);
    e.dataTransfer.setData('currentCategory', demand.category);
    e.currentTarget.classList.add('dragging');
    if (onDragStart) onDragStart();
  };
  
  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    if (onDragEnd) onDragEnd();
  };

  const subgroups = Array.isArray(demand.subgroup) ? demand.subgroup : [demand.subgroup];
  
  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          draggable={!isDeleteMode}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={`bg-white p-6 rounded-xl border ${priorityStyle.border} shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${!isDeleteMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityStyle.badge}`}></div>
          {isDeleteMode && (
            <div className="absolute top-4 right-4 z-10">
              <Checkbox checked={selectedIds.includes(demand.id)} onCheckedChange={() => onToggleSelect(demand.id)} />
            </div>
          )}
          <div className="flex items-start gap-3">
            <GripVertical className="w-4 h-4 text-slate-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${priorityStyle.bg} ${priorityStyle.text}`}>
                  {formatPriorityText(demand.priority)}
                </span>
                {subgroups.map((sg, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{sg}</span>
                ))}
              </div>
              <p className="text-sm text-slate-700 font-medium mb-3">{demand.description}</p>
              <div className="text-[11px] text-slate-400">Responsável: <span className="text-slate-600 font-semibold">{demand.responsible}</span></div>
            </div>
          </div>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onEdit(demand)}><Edit2 className="w-4 h-4 mr-2" /> Editar</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger><ArrowRight className="w-4 h-4 mr-2" /> Mover para</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {SECTIONS.map(sec => (
              <ContextMenuItem key={sec.id} onClick={() => onMoveTo(demand.id, sec.id)} disabled={demand.category === sec.id}>{sec.title}</ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem onClick={() => onOpenPresentation(demand)}><Presentation className="w-4 h-4 mr-2" /> Apresentar</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function PresentationMode({ demands, categoryTitle, onClose, singleDemand }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const demandsToShow = singleDemand ? [singleDemand] : demands;
  const currentDemand = demandsToShow[currentIndex];

  if (!currentDemand) return null;

  const priorityStyle = PRIORITY_COLORS[currentDemand.priority] || PRIORITY_COLORS.media;
  const subgroups = Array.isArray(currentDemand.subgroup) ? currentDemand.subgroup : [currentDemand.subgroup];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div key={currentIndex} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-white w-full max-w-5xl aspect-video rounded-3xl shadow-2xl p-16 flex flex-col justify-between relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-2 ${priorityStyle.badge}`}></div>
        <div>
          <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">{categoryTitle}</div>
          <h2 className="text-5xl font-extrabold text-slate-900 leading-tight">{currentDemand.description}</h2>
        </div>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-lg text-slate-500">Prioridade:</span>
            <span className={`text-3xl font-black ${priorityStyle.text}`}>{formatPriorityText(currentDemand.priority)}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg text-slate-500">Responsável:</span>
            <span className="text-3xl font-bold text-slate-900">{currentDemand.responsible}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {subgroups.map((sg, i) => <span key={i} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-lg">{sg}</span>)}
          </div>
        </div>
        <div className="flex justify-between items-center mt-8">
          <span className="text-slate-300 font-mono">{currentIndex + 1} / {demandsToShow.length}</span>
          <div className="flex gap-4">
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => setCurrentIndex(c => Math.max(0, c - 1))} disabled={currentIndex === 0}><ChevronLeft /></Button>
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => setCurrentIndex(c => Math.min(demandsToShow.length - 1, c + 1))} disabled={currentIndex === demandsToShow.length - 1}><ChevronRight /></Button>
          </div>
        </div>
      </motion.div>
      <Button onClick={onClose} variant="ghost" size="icon" className="absolute top-8 right-8 text-white hover:bg-white/10 rounded-full"><X /></Button>
    </motion.div>
  );
}

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverCategory, setDragOverCategory] = useState(null);
  
  const [formData, setFormData] = useState({ description: "", priority: "media", responsible: "", subgroup: [], category: "this_week" });

  const fetchDemands = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/demands`);
      setDemands(res.data.map(d => ({ ...d, subgroup: typeof d.subgroup === 'string' ? d.subgroup.split(', ') : d.subgroup })));
    } catch (e) { toast.error("Erro ao carregar dados"); }
  }, []);

  useEffect(() => { fetchDemands(); }, [fetchDemands]);

  useEffect(() => {
    let filtered = demands.filter(d => (filterPriority === "all" || d.priority === filterPriority) && (filterSubgroup === "all" || (Array.isArray(d.subgroup) ? d.subgroup.includes(filterSubgroup) : d.subgroup === filterSubgroup)));
    setFilteredDemands(filtered);
  }, [demands, filterPriority, filterSubgroup]);

  const saveDemand = async () => {
    if (!formData.description || !formData.responsible || formData.subgroup.length === 0) return toast.error("Preencha os campos obrigatórios");
    try {
      if (editingDemandId) await axios.put(`${API}/demands/${editingDemandId}`, formData);
      else await axios.post(`${API}/demands`, formData);
      setShowCreateModal(false);
      fetchDemands();
      toast.success("Sucesso!");
    } catch (e) { toast.error("Erro ao salvar"); }
  };

  const moveDemand = async (id, cat) => {
    try {
      await axios.put(`${API}/demands/${id}`, { category: cat });
      fetchDemands();
    } catch (e) { toast.error("Erro ao mover"); }
  };

  const deleteSelected = async () => {
    try {
      await axios.post(`${API}/demands/bulk-delete`, { ids: selectedIds });
      setSelectedIds([]);
      setIsDeleteMode(false);
      fetchDemands();
      toast.success("Excluído!");
    } catch (e) { toast.error("Erro ao excluir"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Toaster position="top-right" />
      <header className="bg-[#004C97] text-white p-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="https://customer-assets.emergentagent.com/job_kanban-vendas/artifacts/dagja3ws_ChatGPT%20Image%207%20de%20fev.%20de%202026%2C%2016_51_34.png" className="h-10 brightness-0 invert" alt="logo" />
            <h1 className="text-xl font-bold">Gestão Semanal</h1>
          </div>
          <span className="font-medium opacity-80">Desenvolvimento de Vendas</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border mb-8 flex flex-wrap gap-4 items-center">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas Prioridades</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="baixa">Baixa</SelectItem></SelectContent>
          </Select>
          <Select value={filterSubgroup} onValueChange={setFilterSubgroup}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Sub-grupo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Sub-grupos</SelectItem>
              {SUBGROUPS.map(sg => <SelectItem key={sg} value={sg}>{sg}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {SECTIONS.map(sec => (
            <div 
              key={sec.id} 
              className={`p-6 rounded-2xl border-2 transition-colors ${dragOverCategory === sec.id ? 'bg-sky-50 border-sky-400 border-dashed' : 'bg-white/50 border-transparent'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCategory(sec.id); }}
              onDragLeave={() => setDragOverCategory(null)}
              onDrop={(e) => {
                const id = e.dataTransfer.getData('demandId');
                if (id) moveDemand(id, sec.id);
                setDragOverCategory(null);
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">{sec.title}</h2>
                <Button variant="ghost" size="sm" onClick={() => setPresentationMode({ category: sec.id, title: sec.title })} disabled={filteredDemands.filter(d => d.category === sec.id).length === 0}><Presentation className="w-4 h-4 mr-2"/>Apresentar</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredDemands.filter(d => d.category === sec.id).map(d => (
                    <DemandCard key={d.id} demand={d} isDeleteMode={isDeleteMode} selectedIds={selectedIds} onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} onMoveTo={moveDemand} onOpenPresentation={(d) => setPresentationMode({ singleDemand: d, title: "Foco" })} onEdit={(d) => { setEditingDemandId(d.id); setFormData({ ...d }); setShowCreateModal(true); }} onDragStart={() => setIsDragging(true)} onDragEnd={() => setIsDragging(false)} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-8 left-8 flex gap-4 z-50">
        <Button onClick={() => { setEditingDemandId(null); setFormData({ description: "", priority: "media", responsible: "", subgroup: [], category: "this_week" }); setShowCreateModal(true); }} className="bg-sky-600 hover:bg-sky-700 shadow-xl rounded-full px-8 py-6"><Plus className="mr-2"/> Novo Tema</Button>
      </div>

      <div className="fixed bottom-8 right-8 z-50">
        {!isDeleteMode ? (
          <Button variant="destructive" onClick={() => setIsDeleteMode(true)} className="rounded-full px-8 py-6 shadow-xl"><Trash2 className="mr-2"/> Excluir</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setIsDeleteMode(false); setSelectedIds([]); }} className="rounded-full px-6 py-6 bg-white">Cancelar</Button>
            <Button variant="destructive" onClick={deleteSelected} disabled={selectedIds.length === 0} className="rounded-full px-6 py-6">Confirmar ({selectedIds.length})</Button>
          </div>
        )}
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingDemandId ? "Editar Tema" : "Novo Tema"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Descrição</Label><Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="alta">Prioridade Alta</SelectItem><SelectItem value="media">Prioridade Média</SelectItem><SelectItem value="baixa">Prioridade Baixa</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub-grupos</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md">
                {SUBGROUPS.map(sg => (
                  <button key={sg} type="button" onClick={() => setFormData(prev => ({ ...prev, subgroup: prev.subgroup.includes(sg) ? prev.subgroup.filter(x => x !== sg) : [...prev.subgroup, sg] }))} className={`text-xs px-3 py-1 rounded-full border transition-colors ${formData.subgroup.includes(sg) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-500'}`}>{sg}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2"><Label>Responsável</Label><Input value={formData.responsible} onChange={e => setFormData({...formData, responsible: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button><Button onClick={saveDemand}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {presentationMode && (
          <PresentationMode 
            demands={presentationMode.singleDemand ? null : filteredDemands.filter(d => d.category === presentationMode.category)} 
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
