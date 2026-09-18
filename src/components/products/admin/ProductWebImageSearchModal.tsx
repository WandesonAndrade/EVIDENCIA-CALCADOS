import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Globe, 
  X, 
  Check, 
  Loader2, 
  ZoomIn, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Link2,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { searchCandidateImages, uploadPhotoFromUrl, CandidateImage } from '../../../services/productAiAssistService';
import { uploadImageToSupabase } from '../../../services/supabaseStorageService';

export interface ProductWebImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  initialQuery?: string;
  onSelectImage: (publicUrl: string) => Promise<void> | void;
}

type TabMode = 'search' | 'url' | 'upload';

export const ProductWebImageSearchModal: React.FC<ProductWebImageSearchModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  initialQuery = '',
  onSelectImage,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('search');
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<CandidateImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savingImageUrl, setSavingImageUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<CandidateImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados da aba "Colar Link"
  const [pastedUrl, setPastedUrl] = useState('');
  const [isPastingSaving, setIsPastingSaving] = useState(false);

  // Estados da aba "Upload de Arquivo"
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Executa busca inicial ao abrir se houver query
  useEffect(() => {
    if (isOpen) {
      const q = initialQuery || productName;
      setQuery(q);
      setError(null);
      setSuccessMsg(null);
      setPastedUrl('');
      setActiveTab('search');
      if (q.trim()) {
        handleSearch(q.trim());
      }
    } else {
      setResults([]);
      setPreviewImage(null);
      setSavingImageUrl(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialQuery, productName]);

  const handleSearch = async (searchStr?: string) => {
    const q = (searchStr !== undefined ? searchStr : query).trim();
    if (!q) return;

    setIsSearching(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const images = await searchCandidateImages(q);
      setResults(images);
      if (images.length === 0) {
        // Não coloca erro agressivo, apenas orienta
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar imagens na web.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleApproveAndSave = async (candidate: CandidateImage) => {
    setSavingImageUrl(candidate.image);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Faz upload com conversão WebP para Supabase Storage
      const { publicUrl, stats } = await uploadPhotoFromUrl(candidate.image, productId);

      // 2. Dispara callback para vincular a foto no Firestore e no estado do produto
      await onSelectImage(publicUrl);

      const statsInfo = stats ? ` (${(stats.optimizedSize / 1024).toFixed(0)}KB, WebP)` : '';
      setSuccessMsg(`Foto salva no Supabase Storage com sucesso!${statsInfo}`);

      // Fecha o modal após 1.2 segundos
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Falha ao processar e salvar a imagem.');
      setSavingImageUrl(null);
    }
  };

  // Salvar a partir de URL colada
  const handleSavePastedUrl = async () => {
    const clean = pastedUrl.trim();
    if (!clean) {
      setError('Por favor, informe a URL da imagem.');
      return;
    }

    setIsPastingSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { publicUrl, stats } = await uploadPhotoFromUrl(clean, productId);
      await onSelectImage(publicUrl);

      const statsInfo = stats ? ` (${(stats.optimizedSize / 1024).toFixed(0)}KB, WebP)` : '';
      setSuccessMsg(`Foto importada e salva no Supabase Storage com sucesso!${statsInfo}`);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Falha ao baixar imagem da URL informada.');
    } finally {
      setIsPastingSaving(false);
    }
  };

  // Upload direto de arquivo (File)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
      return;
    }

    setIsUploadingFile(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const cleanProdId = String(productId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = Date.now();
      const randomHash = Math.random().toString(36).substring(2, 8);
      const customFileName = `upload_foto_${timestamp}_${randomHash}`;

      const publicUrl = await uploadImageToSupabase(file, {
        folder: `produtos/${cleanProdId}/`,
        customFileName,
        generateThumbnail: true,
      });

      await onSelectImage(publicUrl);
      setSuccessMsg('Foto enviada e otimizada em WebP no Supabase Storage!');

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar arquivo.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query || productName)}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-black font-mono">
                ID: {productId}
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Globe className="h-3 w-3 text-blue-500" />
                Assistente de Fotos do Produto
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
              {productName}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Busca na Web</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Colar Link de Foto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Enviar do Computador</span>
          </button>
        </div>

        {/* FEEDBACK NOTICES */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: BUSCA NA WEB */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* SEARCH BAR */}
            <div className="p-4 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: Tênis Olympikus Corre 3, Sandália Vizzano Salto..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSearching || !query.trim()}
                    className="px-5 py-2.5 bg-[#0071E3] hover:bg-blue-600 disabled:opacity-50 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Buscando Fotos...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        <span>Buscar na Web</span>
                      </>
                    )}
                  </button>

                  <a
                    href={googleImagesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
                    title="Abre a pesquisa exata no Google Imagens em nova aba"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                    <span>Google Imagens</span>
                  </a>
                </div>
              </form>

              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <p>
                  💡 Dica: Se o resultado não for exato, você pode buscar por modelo reduzido ou abrir direto no <strong>Google Imagens</strong> e colar o link na aba ao lado.
                </p>
              </div>
            </div>

            {/* CANDIDATE IMAGES GRID */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {isSearching ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Pesquisando fotos de calçados na web...
                  </p>
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {results.map((item, idx) => {
                    const isThisSaving = savingImageUrl === item.image;
                    return (
                      <div
                        key={idx}
                        className="group relative bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-all hover:shadow-lg hover:border-blue-500/50"
                      >
                        {/* THUMBNAIL CONTAINER */}
                        <div className="aspect-square relative overflow-hidden bg-white dark:bg-slate-950 flex items-center justify-center">
                          <img
                            src={item.thumbnail || item.image}
                            alt={item.title || 'Foto do produto'}
                            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />

                          {/* BADGES */}
                          {item.width && item.height && (
                            <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-slate-900/80 text-white text-[9px] font-mono font-bold backdrop-blur-xs">
                              {item.width}x{item.height}
                            </span>
                          )}

                          {/* ZOOM PREVIEW BUTTON */}
                          <button
                            type="button"
                            onClick={() => setPreviewImage(item)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-900 cursor-pointer"
                            title="Ampliar visualização"
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* CARD INFO & APPROVE BUTTON */}
                        <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 line-clamp-2" title={item.title}>
                            {item.title || 'Foto encontrada'}
                          </p>

                          <button
                            type="button"
                            disabled={Boolean(savingImageUrl)}
                            onClick={() => handleApproveAndSave(item)}
                            className={"w-full py-2 px-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs " + (
                              isThisSaving
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 active:scale-95'
                            )}
                          >
                            {isThisSaving ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Salvando no Supabase...</span>
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>✓ Escolher e Salvar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto border border-blue-500/20">
                    <Search className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      Encontre a foto ideal em segundos
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Você pode pesquisar diretamente no Google Imagens com o nome do produto ou colar o link de qualquer foto da internet.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <a
                      href={googleImagesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Abrir no Google Imagens</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setActiveTab('url')}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                    >
                      Colar Link da Foto
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: COLAR LINK DE FOTO */}
        {activeTab === 'url' && (
          <div className="p-6 space-y-6 flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
            <div className="space-y-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-500" />
                Importar Foto por URL da Internet
              </h4>
              <p className="text-xs text-slate-500">
                Copie o endereço de qualquer imagem da internet (Google Imagens, Mercado Livre, site do fabricante, etc.) e cole abaixo. O sistema fará o download, conversão em WebP 80% e upload seguro para o Supabase Storage.
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="url"
                  value={pastedUrl}
                  onChange={(e) => setPastedUrl(e.target.value)}
                  placeholder="https://exemplo.com/fotos/calcado.jpg"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {pastedUrl && (
                  <button
                    type="button"
                    onClick={() => setPastedUrl('')}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {pastedUrl && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={pastedUrl}
                      alt="Pré-visualização"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      Pré-visualização da URL
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{pastedUrl}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isPastingSaving || !pastedUrl.trim()}
                  onClick={handleSavePastedUrl}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  {isPastingSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processando e Salvando no Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>✓ Importar e Salvar no Produto</span>
                    </>
                  )}
                </button>

                <a
                  href={googleImagesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                  <span>Abrir Google Imagens</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ENVIAR ARQUIVO DO COMPUTADOR */}
        {activeTab === 'upload' && (
          <div className="p-6 space-y-6 flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
            <div className="space-y-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-500" />
                Upload de Foto do Dispositivo
              </h4>
              <p className="text-xs text-slate-500">
                Selecione ou arraste uma foto do seu computador ou celular. A foto será automaticamente otimizada para WebP 80% e salva no Supabase Storage.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-3xl p-10 text-center space-y-3 cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30"
            >
              {isUploadingFile ? (
                <div className="space-y-2">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Otimizando em WebP e enviando ao Supabase Storage...
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Clique para escolher o arquivo ou arraste a imagem aqui
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Suporta JPG, PNG e WebP (até 8MB). Conversão e miniatura automáticas.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {activeTab === 'search' && results.length > 0 ? `${results.length} foto(s) candidata(s) encontrada(s)` : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* FULL PREVIEW MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 space-y-4 overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-white">
              <h4 className="text-xs font-bold truncate max-w-md">{previewImage.title}</h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] flex items-center justify-center bg-black/40 rounded-xl overflow-hidden">
              <img
                src={previewImage.image}
                alt={previewImage.title}
                className="max-h-[60vh] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {previewImage.source && (
                <a
                  href={previewImage.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Ver página de origem</span>
                </a>
              )}

              <button
                type="button"
                disabled={Boolean(savingImageUrl)}
                onClick={() => {
                  const target = previewImage;
                  setPreviewImage(null);
                  handleApproveAndSave(target);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md ml-auto"
              >
                <Check className="h-4 w-4" />
                <span>✓ Salvar Esta Foto no Produto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
