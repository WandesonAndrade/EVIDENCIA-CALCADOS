import React, { useState, useEffect } from "react";
import { boxService, IShippingBox } from "../services/boxService";
import { Package, Plus, Trash2, Edit3, CheckCircle2, Star, Box, Ruler, Weight, RefreshCw } from "lucide-react";

export const AdminBoxManager: React.FC = () => {
  const [boxes, setBoxes] = useState<IShippingBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<IShippingBox | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [height, setHeight] = useState<number | "">(12);
  const [width, setWidth] = useState<number | "">(20);
  const [length, setLength] = useState<number | "">(30);
  const [weight, setWeight] = useState<number | "">(0.8);
  const [isDefault, setIsDefault] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadBoxes = async () => {
    setLoading(true);
    try {
      const data = await boxService.getShippingBoxes();
      setBoxes(data);
    } catch (err) {
      console.error("Erro ao carregar caixas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoxes();
  }, []);

  const handleOpenModal = (boxToEdit?: IShippingBox) => {
    setErrorMsg("");
    if (boxToEdit) {
      setEditingBox(boxToEdit);
      setName(boxToEdit.name);
      setHeight(boxToEdit.height);
      setWidth(boxToEdit.width);
      setLength(boxToEdit.length);
      setWeight(boxToEdit.weight);
      setIsDefault(Boolean(boxToEdit.isDefault));
    } else {
      setEditingBox(null);
      setName("");
      setHeight(12);
      setWidth(20);
      setLength(30);
      setWeight(0.8);
      setIsDefault(boxes.length === 0);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Por favor, informe o nome da caixa.");
      return;
    }
    if (!height || Number(height) <= 0 || !width || Number(width) <= 0 || !length || Number(length) <= 0) {
      setErrorMsg("As dimensões (Altura, Largura, Comprimento) devem ser números maiores que 0.");
      return;
    }
    if (!weight || Number(weight) <= 0) {
      setErrorMsg("O peso deve ser maior que 0 kg.");
      return;
    }

    setSaving(true);
    try {
      await boxService.saveShippingBox({
        id: editingBox ? editingBox.id : undefined,
        name: name.trim(),
        height: Number(height),
        width: Number(width),
        length: Number(length),
        weight: Number(weight),
        isDefault,
      });

      setIsModalOpen(false);
      await loadBoxes();
    } catch (err: any) {
      setErrorMsg("Erro ao salvar caixa: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (boxId: string) => {
    try {
      await boxService.setDefaultBox(boxId);
      await loadBoxes();
    } catch (err) {
      console.error("Erro ao definir caixa padrão:", err);
    }
  };

  const handleDelete = async (boxId: string, boxName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a caixa "${boxName}"?`)) return;
    try {
      await boxService.deleteShippingBox(boxId);
      await loadBoxes();
    } catch (err) {
      console.error("Erro ao excluir caixa:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0071E3] font-semibold text-sm mb-1">
            <Package className="w-5 h-5" />
            <span>Configurações de Logística & Frete</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Embalagens & Caixas de Calçados
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Cadastre os tamanhos de caixas utilizados no envio. Estas dimensões e pesos são enviados à API do **Melhor Envio** para cotações exatas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadBoxes}
            disabled={loading}
            className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition flex items-center gap-2 text-sm"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-3 rounded-2xl bg-[#0071E3] hover:bg-[#005bb5] text-white font-semibold shadow-md hover:shadow-lg transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Embalagem</span>
          </button>
        </div>
      </div>

      {/* Boxes Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 font-medium border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#0071E3]" />
          <span>Carregando caixas de frete...</span>
        </div>
      ) : boxes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3">
          <Box className="w-12 h-12 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-800">Nenhuma caixa cadastrada</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Clique no botão acima para adicionar a primeira embalagem padrão para as cotações de frete.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-2 px-4 py-2 rounded-xl bg-[#0071E3] text-white font-medium text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Caixa</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {boxes.map((box) => (
            <div
              key={box.id}
              className={`relative bg-white rounded-3xl p-6 border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
                box.isDefault ? "border-emerald-500/50 ring-2 ring-emerald-500/20" : "border-slate-100"
              }`}
            >
              {/* Header Badge */}
              <div className="flex justify-between items-start gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2.5 rounded-2xl ${box.isDefault ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-700"}`}>
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{box.name}</h3>
                    {box.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Padrão da Loja
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Box Specs Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100/80">
                <div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs font-medium mb-1">
                    <Ruler className="w-3.5 h-3.5" /> Dimensões (cm)
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-800">
                    {box.length} × {box.width} × {box.height} cm
                  </div>
                  <div className="text-[11px] text-slate-400">(Comp × Larg × Alt)</div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs font-medium mb-1">
                    <Weight className="w-3.5 h-3.5" /> Peso Embalado
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-800">
                    {box.weight} kg
                  </div>
                  <div className="text-[11px] text-slate-400">({box.weight * 1000} gramas)</div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {!box.isDefault ? (
                  <button
                    onClick={() => handleSetDefault(box.id)}
                    className="text-xs font-semibold text-slate-600 hover:text-emerald-600 transition flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-emerald-50"
                    title="Definir como caixa padrão da loja"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Tornar Padrão</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 py-1.5 px-2.5">
                    <Star className="w-3.5 h-3.5 fill-emerald-600" />
                    <span>Ativa como Padrão</span>
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(box)}
                    className="p-2 rounded-xl text-slate-500 hover:text-[#0071E3] hover:bg-blue-50 transition"
                    title="Editar embalagem"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(box.id, box.name)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Excluir embalagem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-[#0071E3] rounded-2xl">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {editingBox ? "Editar Embalagem" : "Nova Embalagem de Frete"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Insira o nome e as especificações da caixa de sapatos.
                  </p>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 text-rose-700 text-xs font-semibold p-3.5 rounded-2xl border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Nome / Identificação da Caixa
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Caixa Tênis Padrão (30x20x12)"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-sm text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Comprimento (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={length}
                    onChange={(e) => setLength(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-sm font-mono font-bold text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Largura (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={width}
                    onChange={(e) => setWidth(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-sm font-mono font-bold text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-sm font-mono font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Peso Bruto Total (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-sm font-mono font-bold text-slate-800 pr-12"
                    required
                  />
                  <span className="absolute right-4 top-3 text-xs font-semibold text-slate-400">
                    kg
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Inclua o peso da caixa de papelão somado ao peso aproximado do calçado (Ex: 0.8 kg = 800g).
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition border border-slate-200/80">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0071E3] focus:ring-[#0071E3]"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Definir esta caixa como a embalagem padrão da loja
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-2xl bg-[#0071E3] hover:bg-[#005bb5] text-white font-semibold text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingBox ? "Salvar Alterações" : "Cadastrar Embalagem"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
