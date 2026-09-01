import React, { useState, useEffect, useRef } from "react";
import { IShippingOption, IShippingBoxDimensions } from "../../services/shipping/shippingProvider.interface";
import { Truck, Calculator, Clock, Check, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

interface ShippingCalculatorProps {
  initialPostalCode?: string;
  boxDimensions?: IShippingBoxDimensions;
  selectedOptionId?: string | number;
  onSelectOption?: (option: IShippingOption) => void;
  compact?: boolean;
  hideInput?: boolean;
  hideHeader?: boolean;
}

export const ShippingCalculator: React.FC<ShippingCalculatorProps> = ({
  initialPostalCode = "",
  boxDimensions,
  selectedOptionId,
  onSelectOption,
  compact = false,
  hideInput = false,
  hideHeader = false,
}) => {
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [options, setOptions] = useState<IShippingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onSelectOptionRef = useRef(onSelectOption);
  onSelectOptionRef.current = onSelectOption;

  const selectedOptionIdRef = useRef(selectedOptionId);
  selectedOptionIdRef.current = selectedOptionId;

  const calculate = async (targetCep?: string) => {
    const cepToUse = (targetCep || postalCode).replace(/\D/g, "");
    if (cepToUse.length !== 8) {
      setErrorMsg("Por favor, digite um CEP válido com 8 números.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const response = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toPostalCode: cepToUse,
          box: boxDimensions,
        }),
      });

      const responseText = await response.text();
      let data: any = null;

      try {
        if (responseText) {
          data = JSON.parse(responseText);
        }
      } catch {
        // Ignora erro de JSON e trata o texto bruto
      }

      if (!response.ok) {
        const errorDetail = data?.error || (responseText && !responseText.includes("<html") ? responseText : "Erro no servidor de frete.");
        throw new Error(errorDetail);
      }

      if (data && data.success && Array.isArray(data.options)) {
        setOptions(data.options);
        if (data.options.length === 0) {
          setErrorMsg("Nenhuma modalidade de envio disponível para este CEP.");
        } else if (onSelectOptionRef.current) {
          // Seleciona automaticamente a opção mais barata se nenhuma estiver selecionada ou atualiza a selecionada
          const cheapest = data.options.find((o: IShippingOption) => o.isCheapest) || data.options[0];
          if (cheapest) onSelectOptionRef.current(cheapest);
        }
      } else {
        throw new Error("Resposta inválida do serviço de frete.");
      }
    } catch (err: any) {
      console.warn("📌 [ShippingCalculator] Erro na cotação:", err);
      setErrorMsg(err.message || "Não foi possível calcular o frete no momento.");
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  // Dispara cotação ao montar (importante quando remontado via key= no pai)
  // e também quando initialPostalCode muda sem remontar
  useEffect(() => {
    if (initialPostalCode && initialPostalCode.replace(/\D/g, "").length === 8) {
      setPostalCode(initialPostalCode);
      calculate(initialPostalCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPostalCode]);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    if (val.length > 5) {
      val = `${val.slice(0, 5)}-${val.slice(5)}`;
    }
    setPostalCode(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculate();
  };

  return (
    <div className={`bg-slate-50 border border-slate-200/80 rounded-3xl ${compact ? "p-4" : "p-5 sm:p-6"} space-y-4`}>
      {/* Title */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Truck className="w-4 h-4 text-[#0071E3]" />
            <span>Calcular Frete e Prazos</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Melhor Envio</span>
        </div>
      )}

      {/* Input Form */}
      {!hideInput && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={postalCode}
              onChange={handleCepChange}
              placeholder="00000-000"
              maxLength={9}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0071E3] font-mono text-sm font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#005bb5] text-white font-semibold text-xs rounded-2xl transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 shrink-0"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Calculator className="w-3.5 h-3.5" />
                <span>Calcular</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Options List */}
      {options.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200/60">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Opções de Entrega Disponíveis:
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {options.map((opt) => {
              const isSelected = String(opt.id) === String(selectedOptionId);

              return (
                <div
                  key={opt.id}
                  onClick={() => onSelectOption && onSelectOption(opt)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-white border-[#0071E3] ring-2 ring-[#0071E3]/20 shadow-sm"
                      : "bg-white hover:bg-slate-100/80 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Select Radio / Check Icon */}
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                        isSelected
                          ? "bg-[#0071E3] border-[#0071E3] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{opt.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">({opt.company.name})</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Entrega em até {opt.deliveryTime} dias úteis</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Badges */}
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {opt.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>

                    <div className="flex items-center justify-end gap-1 mt-1">
                      {opt.isCheapest && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-2.5 h-2.5" /> Mais Barato
                        </span>
                      )}
                      {opt.isFastest && !opt.isCheapest && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          ⚡ Mais Rápido
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
