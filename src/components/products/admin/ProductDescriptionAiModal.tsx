import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Check, 
  Loader2, 
  Eye, 
  Code, 
  RefreshCw, 
  Database, 
  Globe, 
  Search, 
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  generateSuggestedDescription, 
  searchProductWebIntel, 
  ProductDescriptionParams, 
  FootwearWebInsights, 
  ProductWebIntelResult 
} from '../../../services/productAiAssistService';
import { 
  getSingleProdutoMoblinkFromApi, 
  extractPrecoTabelaMoblink, 
  extractPrecoVistaMoblink, 
  extractPrecoCartaoMoblink, 
  extractSaldoLojaMoblink 
} from '../../../services/moblinkProductsService';
import { getProdutoGradesFromApi } from '../../../services/moblinkGradesService';
import { ProdutoGradesResult } from '../../../types';

export interface ProductDescriptionAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  product: any;
  currentDescription: string;
  gradeInfo?: ProdutoGradesResult | null;
  onApplyDescription: (newDescription: string) => void;
}

export const ProductDescriptionAiModal: React.FC<ProductDescriptionAiModalProps> = ({
  isOpen,
  onClose,
  productId,
  product,
  currentDescription,
  gradeInfo,
  onApplyDescription,
}) => {
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingErp, setIsLoadingErp] = useState(false);
  const [isLoadingWeb, setIsLoadingWeb] = useState(false);
  
  const [erpProduct, setErpProduct] = useState<any>(null);
  const [erpGrades, setErpGrades] = useState<ProdutoGradesResult | null>(gradeInfo || null);
  
  const [webIntel, setWebIntel] = useState<ProductWebIntelResult | null>(null);
  const [includeWebIntel, setIncludeWebIntel] = useState(true);
  const [webQuery, setWebQuery] = useState('');
  const [showWebQueryInput, setShowWebQueryInput] = useState(false);
  
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');

  const productName = erpProduct?.nome || erpProduct?.name || erpProduct?.descricao || product?.nome || product?.name || product?.descricao || 'Produto';

  // Carrega os dados mais completos do MobLink ERP e da Web ao abrir
  const loadDataAndGenerate = async (
    customWebQuery?: string,
    useWeb: boolean = includeWebIntel
  ) => {
    setIsLoadingErp(true);
    setIsGenerating(true);

    let fetchedErp: any = product;
    let fetchedGrades: ProdutoGradesResult | null = erpGrades;

    try {
      if (productId) {
        // 1. Consulta produto completo no ERP
        const directProd = await getSingleProdutoMoblinkFromApi(productId);
        if (directProd) {
          fetchedErp = { ...product, ...directProd };
          setErpProduct(fetchedErp);
        }

        // 2. Consulta grades e variações se ainda não carregadas
        if (!fetchedGrades || fetchedGrades.id_produto !== productId) {
          const directGrades = await getProdutoGradesFromApi(productId);
          if (directGrades) {
            fetchedGrades = directGrades;
            setErpGrades(directGrades);
          }
        }
      }
    } catch (erpErr) {
      console.warn('[ProductDescriptionAiModal] Fallback para dados locais do produto:', erpErr);
    } finally {
      setIsLoadingErp(false);
    }

    // 3. Busca de Inteligência Textual na Web
    let currentWebIntel = webIntel;
    const queryToUse = customWebQuery || webQuery || `${fetchedErp?.marca || product?.marca || ''} ${productName} ${fetchedErp?.referencia || product?.referencia || ''}`.trim();

    if (!webQuery) {
      setWebQuery(queryToUse);
    }

    if (useWeb && (!currentWebIntel || customWebQuery)) {
      setIsLoadingWeb(true);
      try {
        const intelResult = await searchProductWebIntel(queryToUse);
        setWebIntel(intelResult);
        currentWebIntel = intelResult;
      } catch (wErr) {
        console.warn('[ProductDescriptionAiModal] Erro ao buscar dados na web:', wErr);
      } finally {
        setIsLoadingWeb(false);
      }
    }

    try {
      // Extrair informações confirmadas do ERP
      const precoTabela = extractPrecoTabelaMoblink(fetchedErp);
      const precoVista = extractPrecoVistaMoblink(fetchedErp);
      const precoCartao = extractPrecoCartaoMoblink(fetchedErp);
      const saldoEstoque = extractSaldoLojaMoblink(fetchedErp);

      const availableColors = (fetchedGrades && fetchedGrades.cores && fetchedGrades.cores.length > 0)
        ? fetchedGrades.cores
        : (fetchedErp?.cor ? [fetchedErp.cor] : (product?.cor ? [product.cor] : []));

      const availableSizes = (fetchedGrades && fetchedGrades.tamanhos && fetchedGrades.tamanhos.length > 0)
        ? fetchedGrades.tamanhos
        : (Array.isArray(fetchedErp?.tamanhos) ? fetchedErp.tamanhos : (Array.isArray(product?.tamanhos) ? product.tamanhos : []));

      const webInsightsToApply: FootwearWebInsights = (useWeb && currentWebIntel?.insights) ? currentWebIntel.insights : {};
      const webSnippetsToApply = (useWeb && currentWebIntel?.results) ? currentWebIntel.results.map(r => r.snippet) : [];

      const params: ProductDescriptionParams = {
        name: productName,
        brand: fetchedErp?.marca || fetchedErp?.brand || product?.marca || product?.brand || '',
        fabricante: fetchedErp?.fabricante || fetchedErp?.id_fabricante || product?.fabricante || '',
        category: fetchedErp?.categoria || fetchedErp?.category || product?.category || 'Calçados',
        subcategory: fetchedErp?.subcategoria || fetchedErp?.subcategory || product?.subcategory || '',
        classificacao: fetchedErp?.classificacao || product?.classificacao || '',
        color: fetchedErp?.cor || product?.cor || '',
        colors: availableColors,
        material: fetchedErp?.material || product?.material || '',
        price: precoTabela,
        precoVista: precoVista,
        precoCartao: precoCartao,
        referenceCode: fetchedErp?.referencia || fetchedErp?.referenceCode || product?.referencia || product?.modelCode || '',
        barcode: fetchedErp?.cod_barras || fetchedErp?.barcode || product?.barcode || '',
        sizes: availableSizes,
        complDescr: fetchedErp?.compl_descr || fetchedErp?.descr_compl || product?.compl_descr || '',
        fichaTecnica: fetchedErp?.ficha_tecnica || product?.ficha_tecnica || '',
        unidade: fetchedErp?.unidade || product?.unidade || '',
        embalagem: fetchedErp?.embalagem || product?.embalagem || '',
        peso: fetchedErp?.peso_bruto || fetchedErp?.peso_liquido || product?.peso || 0,
        stock: saldoEstoque,
        gradeVariations: fetchedGrades?.variacoes || [],
        existingDescription: currentDescription,
        tone: 'comercial',
        webInsights: webInsightsToApply,
        webSnippets: webSnippetsToApply,
        webIntelSummary: webInsightsToApply.curatedSummary,
      };

      const result = await generateSuggestedDescription(params);
      setGeneratedText(result);
    } catch (err: any) {
      console.error('Erro ao sugerir descrição enriquecida:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const initialQuery = `${product?.marca || ''} ${productName} ${product?.referencia || ''}`.trim();
      setWebQuery(initialQuery);
      loadDataAndGenerate(initialQuery, true);
    } else {
      setGeneratedText('');
      setErpProduct(null);
      setWebIntel(null);
      setShowWebQueryInput(false);
    }
  }, [isOpen, productId]);

  const handleApply = () => {
    if (!generatedText.trim()) return;

    if (applyMode === 'append' && currentDescription.trim()) {
      onApplyDescription(currentDescription.trim() + '\n\n' + generatedText.trim());
    } else {
      onApplyDescription(generatedText.trim());
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentItem = erpProduct || product;
  const precoVista = extractPrecoVistaMoblink(currentItem);
  const refCode = currentItem?.referencia || currentItem?.referenceCode || '';
  const brandName = currentItem?.marca || currentItem?.fabricante || '';

  const insights = webIntel?.insights || {};
  const hasInsights = !!(
    insights.alturaSalto || 
    insights.solado || 
    insights.palmilha || 
    insights.fecho || 
    insights.bico || 
    insights.cabedal || 
    insights.ocasiao
  );

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER LIMPO E ELEGANTE */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Assistente de Copywriting IA
              </span>
              <span className="text-xs text-slate-400 font-medium">
                ID ERP: <strong className="text-slate-700 dark:text-slate-200 font-mono">{productId}</strong>
              </span>
              {refCode && (
                <span className="text-xs text-slate-400 font-medium">
                  • Ref: <strong className="text-slate-700 dark:text-slate-200 font-mono">{refCode}</strong>
                </span>
              )}
              {brandName && (
                <span className="text-xs text-slate-400 font-medium">
                  • Marca: <strong className="text-slate-700 dark:text-slate-200">{brandName}</strong>
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
              {productName}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* PAINEL UNIFICADO DE CONTEXTO & INTELIGÊNCIA */}
        <div className="px-6 py-3 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            
            {/* Status e badges confirmados */}
            <div className="flex items-center gap-2 flex-wrap">
              {precoVista > 0 && (
                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 font-mono font-bold">
                  PIX: R$ {precoVista.toFixed(2).replace('.', ',')}
                </span>
              )}

              {erpGrades?.tamanhos && erpGrades.tamanhos.length > 0 && (
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                  {erpGrades.tamanhos.length} tamanho(s) em estoque
                </span>
              )}

              {/* Status Web */}
              {isLoadingWeb ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200/80 dark:border-blue-800/60">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  Pesquisando na web...
                </span>
              ) : webIntel && webIntel.results.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200/80 dark:border-blue-800/60 font-medium">
                  <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  {webIntel.results.length} fontes consultadas
                </span>
              ) : null}
            </div>

            {/* Ações de pesquisa web */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={includeWebIntel}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setIncludeWebIntel(nextVal);
                    loadDataAndGenerate(webQuery, nextVal);
                  }}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>Integrar dados da Web</span>
              </label>

              <button
                type="button"
                onClick={() => setShowWebQueryInput(!showWebQueryInput)}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold cursor-pointer transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span>{showWebQueryInput ? 'Ocultar busca' : 'Ajustar busca'}</span>
                {showWebQueryInput ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Campo expansível de pesquisa web */}
          {showWebQueryInput && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={webQuery}
                onChange={(e) => setWebQuery(e.target.value)}
                placeholder="Ex: SANDALIA DAKOTA Y0641 DOURADA"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    loadDataAndGenerate(webQuery, true);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => loadDataAndGenerate(webQuery, true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Search className="h-3 w-3" />
                <span>Pesquisar e Atualizar</span>
              </button>
            </div>
          )}

          {/* Atributos confirmados extraídos */}
          {hasInsights && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px]">
              <span className="text-slate-400 font-medium mr-1">Atributos detectados:</span>
              {insights.cabedal && (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                  🧵 Cabedal: {insights.cabedal}
                </span>
              )}
              {insights.alturaSalto && (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                  👠 Salto: {insights.alturaSalto}
                </span>
              )}
              {insights.palmilha && (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                  ☁️ Palmilha: {insights.palmilha}
                </span>
              )}
              {insights.solado && (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                  🛡️ Solado: {insights.solado}
                </span>
              )}
              {insights.fecho && (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                  🔒 Fecho: {insights.fecho}
                </span>
              )}
              {insights.bico && (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                  Bico: {insights.bico}
                </span>
              )}
              {insights.ocasiao && (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                  🎯 Uso: {insights.ocasiao}
                </span>
              )}
            </div>
          )}
        </div>

        {/* BARRA DE CONTROLE: REDAÇÃO COMERCIAL & FERRAMENTAS */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-amber-500" />
              Redação Comercial Otimizada
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadDataAndGenerate(webQuery, includeWebIntel)}
              disabled={isGenerating}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin text-amber-500' : ''}`} />
              <span>Regenerar Texto</span>
            </button>

            {/* TOGGLE VISUAL / CÓDIGO HTML */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Visual</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('code')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'code'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                <span>Código HTML</span>
              </button>
            </div>
          </div>
        </div>

        {/* ÁREA DE VISUALIZAÇÃO E EDIÇÃO */}
        <div className="p-6 flex-1 overflow-y-auto min-h-[320px] max-h-[480px] bg-slate-50/40 dark:bg-slate-950/30">
          {isGenerating ? (
            <div className="h-full min-h-[280px] flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Gerando descrição persuasiva e estruturada...
                </p>
                <p className="text-xs text-slate-400">
                  Formatando storytelling, destaques reais de calçado e ficha técnica.
                </p>
              </div>
            </div>
          ) : viewMode === 'preview' ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm">
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: generatedText || '<p className="text-slate-400 italic">Nenhum texto gerado.</p>' }} 
              />
            </div>
          ) : (
            <textarea
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              className="w-full h-full min-h-[300px] p-4 font-mono text-xs bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
              placeholder="Código HTML da descrição..."
            />
          )}
        </div>

        {/* RODAPÉ & AÇÃO DE APLICAÇÃO */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-4 text-xs">
            <span className="font-bold text-slate-500 dark:text-slate-400">
              Aplicação:
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="applyMode"
                  value="replace"
                  checked={applyMode === 'replace'}
                  onChange={() => setApplyMode('replace')}
                  className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>Substituir descrição atual</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="applyMode"
                  value="append"
                  checked={applyMode === 'append'}
                  onChange={() => setApplyMode('append')}
                  className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>Anexar ao final</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={!generatedText.trim() || isGenerating}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>Aplicar no Produto</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
