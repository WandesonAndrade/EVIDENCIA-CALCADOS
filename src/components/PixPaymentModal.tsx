import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Loader2, QrCode, AlertTriangle, CheckCircle2, RefreshCw, MessageSquare } from 'lucide-react';
import { pixFirestoreService } from '../services/pixFirestoreService';
import { pixPaymentService } from '../services/pixPaymentService';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  parcelDescription: string;
  parcelValue: number;
  emailCliente: string;
  nomeCliente?: string;
  cpfCliente?: string;
  externalReference?: string;
  idVenda?: string;
  idParcela?: string;
  onPaymentSuccess?: (paymentId: number | string) => void;
}

interface PixData {
  payment_id: number | string;
  qr_code: string;
  qr_code_base64: string | null;
  expires_at?: number;
  reused?: boolean;
}

type ModalState = 'idle' | 'loading' | 'awaiting' | 'approved' | 'error';

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  onClose,
  isDark,
  parcelDescription,
  parcelValue,
  emailCliente,
  nomeCliente,
  cpfCliente,
  externalReference,
  idVenda,
  idParcela,
  onPaymentSuccess,
}) => {
  const [state, setState] = useState<ModalState>('idle');
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(0);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedRef = useRef(false);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Stop countdown
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Poll payment status
  const startPolling = useCallback((paymentId: number | string) => {
    stopPolling();

    const checkStatus = async () => {
      try {
        const data = await pixPaymentService.checkPixStatus(paymentId);
        if (data.success && data.status === 'approved') {
          stopPolling();
          stopTimer();
          setState('approved');

          // Atualiza status para 'approved' na coleção pix_transacoes no Firestore
          const parcelKey = String(externalReference || parcelDescription).trim().toLowerCase();
          pixFirestoreService.updatePixStatus(pixFirestoreService.buildDocId(parcelKey), 'approved').catch(console.warn);

          if (onPaymentSuccess) {
            onPaymentSuccess(paymentId);
          }
        }
      } catch {
        // Silently ignore polling errors — keep trying
      }
    };

    // Poll every 3.5 seconds (Intelligent Polling)
    pollingRef.current = setInterval(checkStatus, 3_500);
    // Also check immediately after a short delay
    setTimeout(checkStatus, 1_500);
  }, [stopPolling, stopTimer, onPaymentSuccess, externalReference, parcelDescription]);

  // Fetch / Generate Pix
  const fetchPix = useCallback(async (forceNew = false) => {
    setState('loading');
    setPixData(null);
    setErrorMsg('');
    setCopied(false);
    stopPolling();
    stopTimer();

    try {
      const idempotencyKey = `pix-modal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const data = await pixPaymentService.generatePix({
        valor: parcelValue,
        descricao: parcelDescription,
        emailCliente,
        nomeCliente,
        cpfCliente,
        externalReference,
        forceNew,
        idempotencyKey,
      });

      if (!data.success) {
        throw new Error(data.message || 'Erro ao gerar Pix.');
      }

      const pix: PixData = {
        payment_id: data.payment_id,
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        expires_at: data.expires_at,
        reused: data.reused,
      };

      setPixData(pix);
      setState('awaiting');

      // Salva/Garante persistência na coleção pix_transacoes no Firestore
      const parcelKey = String(externalReference || (idVenda && idParcela ? `venda_${idVenda}_parcela_${idParcela}` : parcelDescription)).trim().toLowerCase();
      pixFirestoreService.savePixTransacao({
        parcelKey,
        payment_id: data.payment_id,
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64 || null,
        transaction_amount: parcelValue,
        status: 'pending',
        emailCliente,
        nomeCliente,
        cpfCliente,
        descricao: parcelDescription,
        externalReference,
        id_venda: idVenda || null,
        id_parcela: idParcela || null,
        createdAt: Date.now(),
        expires_at: data.expires_at || (Date.now() + 30 * 60000),
        expirationDateIso: new Date(data.expires_at || (Date.now() + 30 * 60000)).toISOString(),
        audited: false,
      }).catch(console.warn);

      // Start countdown if expires_at present
      if (pix.expires_at) {
        const initialSec = Math.max(0, Math.floor((pix.expires_at - Date.now()) / 1000));
        setTimeLeftSec(initialSec);

        timerRef.current = setInterval(() => {
          setTimeLeftSec((prev) => {
            if (prev <= 1) {
              stopTimer();
              stopPolling();
              setErrorMsg('O tempo de validade do QR Code expirou.');
              setState('error');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      // Start polling
      startPolling(pix.payment_id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao gerar Pix.');
      setState('error');
    }
  }, [parcelValue, parcelDescription, emailCliente, nomeCliente, cpfCliente, externalReference, idVenda, idParcela, startPolling, stopPolling, stopTimer]);

  // Generate Pix on open (apenas 1x por abertura do modal)
  useEffect(() => {
    if (isOpen && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchPix(false);
    }
    if (!isOpen) {
      hasFetchedRef.current = false;
      stopPolling();
      stopTimer();
    }
  }, [isOpen, fetchPix, stopPolling, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      stopPolling();
    };
  }, [stopPolling]);

  const handleCopy = async () => {
    if (!pixData?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = pixData.qr_code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl ${
              isDark
                ? 'bg-[#1c1c1e] border border-white/10'
                : 'bg-white border border-black/5'
            }`}
            style={{
              boxShadow: isDark
                ? '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)'
                : '0 25px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
            }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between">
              <div>
                <h2 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  {state === 'approved' ? 'Pagamento Confirmado' : 'Pagamento via Pix'}
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                  {parcelDescription}
                </p>
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/20 text-white/70'
                    : 'bg-black/5 hover:bg-black/10 text-black/50'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Value Badge */}
            <div className="px-6 pb-4">
              <div className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-black font-mono ${
                state === 'approved'
                  ? (isDark
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                  : (isDark
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-amber-50 text-amber-700 border border-amber-200')
              }`}>
                {formatCurrency(parcelValue)}
              </div>
            </div>

            {/* Divider */}
            <div className={`mx-6 h-px ${isDark ? 'bg-white/8' : 'bg-black/5'}`} />

            {/* Body */}
            <div className="px-6 py-6">
              {/* Loading State */}
              {state === 'loading' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center py-10 space-y-4"
                >
                  <Loader2 className={`h-10 w-10 animate-spin ${isDark ? 'text-[#0a84ff]' : 'text-[#007aff]'}`} />
                  <div className="text-center">
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      Gerando QR Code...
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                      Conectando ao Mercado Pago
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Error State */}
              {state === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-8 space-y-4"
                >
                  <div className={`p-3 rounded-full ${isDark ? 'bg-rose-500/15' : 'bg-rose-50'}`}>
                    <AlertTriangle className={`h-7 w-7 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      Erro ao gerar Pix
                    </p>
                    <p className={`text-xs mt-1.5 max-w-[280px] ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                      {errorMsg}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2.5 mt-2">
                    <button
                      onClick={() => fetchPix(true)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isDark
                          ? 'bg-[#0a84ff] text-white hover:bg-[#409cff]'
                          : 'bg-[#007aff] text-white hover:bg-[#0066d6]'
                      }`}
                    >
                      Gerar Novo QR Code
                    </button>
                    <button
                      onClick={onClose}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-white/10 text-white hover:bg-white/15'
                          : 'bg-black/5 text-[#1d1d1f] hover:bg-black/10'
                      }`}
                    >
                      Fechar
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Approved State */}
              {state === 'approved' && pixData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-8 space-y-5"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                    className={`p-4 rounded-full ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}
                  >
                    <CheckCircle2 className={`h-12 w-12 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </motion.div>
                  <div className="text-center space-y-1">
                    <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      Pix Recebido!
                    </p>
                    <p className={`text-xs ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                      Pagamento confirmado com sucesso.
                    </p>
                  </div>
                  <p className={`text-[10px] ${isDark ? 'text-[#48484a]' : 'text-[#aeaeb2]'}`}>
                    ID #{pixData.payment_id}
                  </p>
                  
                  <button
                    onClick={() => {
                      if (onPaymentSuccess && pixData) {
                        onPaymentSuccess(pixData.payment_id);
                      }
                    }}
                    className="w-full py-3 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Prosseguir no WhatsApp (Pix Pago)</span>
                  </button>
                </motion.div>
              )}

              {/* Awaiting Payment State */}
              {state === 'awaiting' && pixData && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white' : 'bg-white border border-black/5'}`}>
                      {pixData.qr_code_base64 ? (
                        <img
                          src={`data:image/png;base64,${pixData.qr_code_base64}`}
                          alt="QR Code Pix"
                          className="w-48 h-48 object-contain rounded-xl"
                          draggable={false}
                        />
                      ) : (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixData.qr_code)}`}
                          alt="QR Code Pix"
                          className="w-48 h-48 object-contain rounded-xl"
                          draggable={false}
                        />
                      )}
                    </div>
                  </div>

                  {/* Status Indicator & Countdown */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                      </span>
                      <p className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        Aguardando pagamento...
                      </p>
                      <RefreshCw className={`h-3 w-3 animate-spin ${isDark ? 'text-amber-400/50' : 'text-amber-600/50'}`} />
                    </div>

                    {/* Expiration timer & reuse badge */}
                    {timeLeftSec > 0 && (
                      <div className="flex items-center space-x-1.5 pt-0.5">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isDark ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/60'
                        }`}>
                          Válido por {Math.floor(timeLeftSec / 60).toString().padStart(2, '0')}:{(timeLeftSec % 60).toString().padStart(2, '0')}
                        </span>
                        {pixData.reused && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isDark ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}>
                            QR Code Ativo
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Copy & Paste Code */}
                  <div className="space-y-2">
                    <p className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                      Pix Copia e Cola
                    </p>
                    <div className={`relative rounded-xl overflow-hidden border ${
                      isDark ? 'border-white/10 bg-black/30' : 'border-black/10 bg-[#f5f5f7]'
                    }`}>
                      <div className={`px-3 py-2.5 pr-14 text-[11px] font-mono break-all leading-relaxed max-h-20 overflow-y-auto ${
                        isDark ? 'text-white/70' : 'text-[#1d1d1f]/70'
                      }`}>
                        {pixData.qr_code}
                      </div>
                      <button
                        onClick={handleCopy}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          copied
                            ? (isDark
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-300')
                            : (isDark
                                ? 'bg-white/10 text-white/80 hover:bg-white/15 border border-white/10'
                                : 'bg-white text-[#1d1d1f] hover:bg-white/80 border border-black/10 shadow-sm')
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Botão de Enviar ao WhatsApp após pagar */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        if (onPaymentSuccess && pixData) {
                          onPaymentSuccess(pixData.payment_id);
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Já Paguei / Enviar Pedido no WhatsApp</span>
                    </button>
                  </div>

                  {/* Payment ID */}
                  <p className={`text-[10px] text-center ${isDark ? 'text-[#48484a]' : 'text-[#aeaeb2]'}`}>
                    ID do Pagamento: #{pixData.payment_id}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            {state !== 'approved' && (
              <div className="px-6 pb-6 pt-2">
                <div className={`text-center text-[10px] leading-relaxed ${isDark ? 'text-[#48484a]' : 'text-[#aeaeb2]'}`}>
                  Escaneie o QR Code ou copie o código acima e cole no app do seu banco para efetuar o pagamento.
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
