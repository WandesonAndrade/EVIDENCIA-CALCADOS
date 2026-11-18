import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { uploadOptimizedProductPhoto } from '../../services/supabaseStorageService';

interface KitPhotosFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  kitId?: string;
  theme?: string;
}

export const KitPhotosField: React.FC<KitPhotosFieldProps> = ({
  images,
  onChange,
  kitId,
  theme = 'light'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const uploadedUrls: string[] = [];
    const targetKitId = kitId || `kit_${Date.now()}`;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const result = await uploadOptimizedProductPhoto(file, targetKitId);
          if (result && result.publicUrl) {
            uploadedUrls.push(result.publicUrl);
          }
        } catch (fileErr: any) {
          console.warn('[KitPhotosField] Erro no upload otimizado, tentando fallback simples:', fileErr);
        }
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls]);
      } else {
        setUploadError('Não foi possível fazer upload das imagens. Verifique a conexão com o Supabase.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Falha ao enviar fotos');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (images.includes(trimmed)) {
      setUploadError('Esta imagem já foi adicionada');
      return;
    }
    onChange([...images, trimmed]);
    setUrlInput('');
    setUploadError(null);
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return;
    const target = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    onChange([target, ...rest]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Fotos do Kit ({images.length})
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            A primeira foto será a capa principal na vitrine.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0071E3] hover:bg-[#005bb5] rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span>{isUploading ? 'Otimizando...' : 'Enviar Fotos'}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Input de URL direta */}
      <div className="flex items-center gap-2">
        <input
          type="url"
          placeholder="Ou cole a URL direta de uma foto..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddUrl();
            }
          }}
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
        />
        <button
          type="button"
          onClick={handleAddUrl}
          disabled={!urlInput.trim()}
          className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-40 cursor-pointer"
        >
          Adicionar
        </button>
      </div>

      {/* Galeria de Fotos */}
      {images.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#0071E3] hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
            <ImageIcon className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Nenhuma foto adicionada ao Kit
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Clique para enviar arquivos do computador ou cole uma URL acima
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {images.map((imgUrl, index) => (
            <div
              key={`${imgUrl}-${index}`}
              className={`group relative rounded-xl overflow-hidden border aspect-square bg-slate-100 dark:bg-slate-800 ${
                index === 0
                  ? 'ring-2 ring-[#0071E3] border-transparent'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <img
                src={imgUrl}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {index === 0 && (
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#0071E3] text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Capa</span>
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleSetCover(index)}
                    className="px-2 py-1 text-[10px] font-black bg-white/90 hover:bg-white text-slate-900 rounded-lg transition-transform active:scale-95 cursor-pointer shadow-xs"
                    title="Definir como foto de capa principal"
                  >
                    Tornar Capa
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-transform active:scale-95 cursor-pointer shadow-xs"
                  title="Remover foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
