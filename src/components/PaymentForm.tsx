import React, { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
  Info,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  createCardTokenClientSide,
  getCardPaymentMethodId,
  paymentProcessor,
  bankMigrationService
} from '../services/payment';
import { pixPaymentService } from '../services/pixPaymentService';

interface PaymentFormProps {
  grandTotal: number;
  emailCliente: string;
  nomeCliente?: string;
  cpfCliente?: string;
  externalReference?: string;
  isDark?: boolean;
  onPaymentApproved: (details: { method: string; paymentId: string | number; installments?: number }) => void;
  onPaymentFailed?: (errorMsg: string) => void;
  onActiveTabChange?: (tab: 'pix' | 'credit' | 'debit') => void;
}

type TabType = 'pix' | 'credit' | 'debit';

export const PaymentForm: React.FC<PaymentFormProps> = ({
  grandTotal,
  emailCliente,
  nomeCliente,
  cpfCliente,
  externalReference,
  isDark = true,
  onPaymentApproved,
  onPaymentFailed,
  onActiveTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('credit');

  useEffect(() => {
    if (onActiveTabChange) {
      onActiveTabChange(activeTab);
    }
  }, [activeTab, onActiveTabChange]);

  // Estado dos Campos do Cartão (PCI-DSS: Jamais enviados ao backend raw)
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState(nomeCliente || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [holderCpf, setHolderCpf] = useState(cpfCliente || '');
  const [installments, setInstallments] = useState(1);

  // Estados de Processamento e Feedback
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cardBrand, setCardBrand] = useState('visa');

  // Estado de Pagamento Pix
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [pixPaymentId, setPixPaymentId] = useState<string | number | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);

  // Formatação do Número do Cartão (0000 0000 0000 0000)
  const handleCardNumberChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    setCardNumber(formatted);

    if (raw.length >= 6) {
      const brand = await getCardPaymentMethodId(raw);
      setCardBrand(brand);
    }
  };

  // Formatação da Validade (MM/AA)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2, 4)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Formatação do CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
    } else if (raw.length > 6) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    } else if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    }
    setHolderCpf(formatted);
  };

  // Opções de Parcelamento de 1x a 12x
  const installmentOptions = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const count = i + 1;
      const value = grandTotal / count;
      return {
        count,
        value,
        label: count === 1
          ? `1x de R$ ${value.toFixed(2).replace('.', ',')} à vista`
          : `${count}x de R$ ${value.toFixed(2).replace('.', ',')} sem juros`,
      };
    });
  }, [grandTotal]);

  // Gera o Pix caso a aba selecionada seja Pix
  const handleGeneratePix = async () => {
    setIsGeneratingPix(true);
    setErrorMessage('');
    try {
      const idempotencyKey = `pix-form-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const res = await paymentProcessor.criarPagamento({
        valor: grandTotal,
        descricao: 'Compra Evidência Calçados',
        emailCliente,
        nomeCliente: cardName || nomeCliente,
        cpfCliente: holderCpf || cpfCliente,
        externalReference: externalReference || `ped_${Date.now()}`,
        idempotencyKey,
      });

      if (res.success && res.qrCode) {
        setPixQrCode(res.qrCode);
        setPixQrCodeBase64(res.qrCodeBase64 || null);
        setPixPaymentId(res.paymentId);

        bankMigrationService.recordTransaction({
          orderId: externalReference || `ped_${Date.now()}`,
          paymentId: res.paymentId,
          provider: res.provider || 'Mercado Pago',
          amount: grandTotal,
          method: 'pix',
          status: 'pending',
          idempotencyKey,
        });
      } else {
        setErrorMessage(res.message || 'Não foi possível gerar o QR Code Pix.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao conectar com o serviço de Pix.');
    } finally {
      setIsGeneratingPix(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pix' && !pixQrCode) {
      handleGeneratePix();
    }
  }, [activeTab]);

  // Polling Inteligente para Pix (Verificação a cada 4 segundos)
  useEffect(() => {
    if (activeTab !== 'pix' || !pixPaymentId) return;

    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await pixPaymentService.checkPixStatus(pixPaymentId);
        if (res.success && res.status === 'approved') {
          clearInterval(intervalId);
          setSuccessMessage('Pagamento PIX Aprovado Instantaneamente! 🎉');

          bankMigrationService.reconcileTransaction(
            externalReference || '',
            pixPaymentId,
            'approved'
          );

          setTimeout(() => {
            onPaymentApproved({ method: 'Pix', paymentId: pixPaymentId });
          }, 1500);
        }
      } catch (err) {
        // Ignora falhas pontuais de conexão no polling
      }
    };

    intervalId = setInterval(checkStatus, 4000);
    return () => clearInterval(intervalId);
  }, [activeTab, pixPaymentId]);

  // Processamento do Cartão de Crédito
  const handleSubmitCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (cardNumber.replace(/\D/g, '').length < 13) {
      setErrorMessage('Por favor, informe um número de cartão válido.');
      return;
    }

    if (!cardName.trim()) {
      setErrorMessage('Por favor, informe o nome impresso no cartão.');
      return;
    }

    const cleanExpiry = cardExpiry.replace(/\D/g, '');
    if (cleanExpiry.length !== 4) {
      setErrorMessage('Informe a validade no formato MM/AA.');
      return;
    }

    const month = parseInt(cleanExpiry.slice(0, 2), 10);
    if (month < 1 || month > 12) {
      setErrorMessage('Mês de validade inválido.');
      return;
    }

    if (cardCvv.trim().length < 3) {
      setErrorMessage('Informe o código de segurança (CVV).');
      return;
    }

    const cleanCpf = holderCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setErrorMessage('Informe o CPF do titular do cartão (11 dígitos).');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Tokenização no Browser do Cliente (PCI-DSS Compliant)
      const token = await createCardTokenClientSide({
        cardNumber,
        cardholderName: cardName,
        cardExpirationMonth: cleanExpiry.slice(0, 2),
        cardExpirationYear: cleanExpiry.slice(2, 4),
        securityCode: cardCvv,
        identificationType: 'CPF',
        identificationNumber: cleanCpf,
      });

      const idempotencyKey = `card-cred-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // 2. Envio do Token e parâmetros (Sem dados sensíveis do cartão!)
      const res = await paymentProcessor.processarCartaoCredito({
        valor: grandTotal,
        descricao: 'Compra Evidência Calçados',
        emailCliente,
        nomeCliente: cardName,
        cpfCliente: cleanCpf,
        cardToken: token,
        installments,
        paymentMethodId: cardBrand,
        externalReference: externalReference || `ped_${Date.now()}`,
        idempotencyKey,
      });

      if (res.success) {
        setSuccessMessage('🎉 Pagamento Aprovado com Sucesso!');

        bankMigrationService.recordTransaction({
          orderId: externalReference || `ped_${Date.now()}`,
          paymentId: res.paymentId,
          provider: res.provider || 'Mercado Pago',
          amount: grandTotal,
          method: 'credit_card',
          status: 'approved',
          idempotencyKey,
        });

        setTimeout(() => {
          onPaymentApproved({
            method: 'Cartão de Crédito',
            paymentId: res.paymentId,
            installments,
          });
        }, 1200);
      } else {
        const errorText = res.message || 'Transação recusada pela administradora do cartão.';
        setErrorMessage(errorText);
        if (onPaymentFailed) onPaymentFailed(errorText);
      }
    } catch (err: any) {
      const msg = err.message || 'Erro ao processar o pagamento com cartão.';
      setErrorMessage(msg);
      if (onPaymentFailed) onPaymentFailed(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Processamento do Cartão de Débito
  const handleSubmitDebitCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (cardNumber.replace(/\D/g, '').length < 13) {
      setErrorMessage('Por favor, informe um número de cartão válido.');
      return;
    }

    const cleanExpiry = cardExpiry.replace(/\D/g, '');
    if (cleanExpiry.length !== 4) {
      setErrorMessage('Informe a validade no formato MM/AA.');
      return;
    }

    if (cardCvv.trim().length < 3) {
      setErrorMessage('Informe o código CVV.');
      return;
    }

    const cleanCpf = holderCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setErrorMessage('Informe o CPF do titular.');
      return;
    }

    setIsProcessing(true);

    try {
      const token = await createCardTokenClientSide({
        cardNumber,
        cardholderName: cardName,
        cardExpirationMonth: cleanExpiry.slice(0, 2),
        cardExpirationYear: cleanExpiry.slice(2, 4),
        securityCode: cardCvv,
        identificationType: 'CPF',
        identificationNumber: cleanCpf,
      });

      const idempotencyKey = `card-deb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const res = await paymentProcessor.processarCartaoDebito({
        valor: grandTotal,
        descricao: 'Compra Evidência Calçados - Débito',
        emailCliente,
        nomeCliente: cardName,
        cpfCliente: cleanCpf,
        cardToken: token,
        paymentMethodId: cardBrand,
        externalReference: externalReference || `ped_${Date.now()}`,
        idempotencyKey,
      });

      if (res.success) {
        setSuccessMessage('🎉 Pagamento no Débito Aprovado!');

        bankMigrationService.recordTransaction({
          orderId: externalReference || `ped_${Date.now()}`,
          paymentId: res.paymentId,
          provider: res.provider || 'Mercado Pago',
          amount: grandTotal,
          method: 'debit_card',
          status: 'approved',
          idempotencyKey,
        });

        setTimeout(() => {
          onPaymentApproved({
            method: 'Cartão de Débito',
            paymentId: res.paymentId,
            installments: 1,
          });
        }, 1200);
      } else {
        const errorText = res.message || 'Débito recusado pelo banco emissor.';
        setErrorMessage(errorText);
        if (onPaymentFailed) onPaymentFailed(errorText);
      }
    } catch (err: any) {
      const msg = err.message || 'Erro ao processar o cartão no débito.';
      setErrorMessage(msg);
      if (onPaymentFailed) onPaymentFailed(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyPix = () => {
    if (pixQrCode) {
      navigator.clipboard.writeText(pixQrCode);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  return (
    <div className={`w-full rounded-2xl border p-5 ${
      isDark ? 'bg-[#1c1c1e] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
    }`}>
      {/* SELETOR DE ABAS DE PAGAMENTO */}
      <div className="grid grid-cols-3 gap-2 p-1.5 mb-5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
        <button
          type="button"
          onClick={() => setActiveTab('credit')}
          className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'credit'
              ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Crédito</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('debit')}
          className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'debit'
              ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Débito</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pix')}
          className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'pix'
              ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>Pix</span>
        </button>
      </div>

      {/* MENSAGENS DE ERRO OU SUCESSO */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* CONTEÚDO DA ABA CARTÃO DE CRÉDITO */}
      {activeTab === 'credit' && (
        <form onSubmit={handleSubmitCreditCard} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Número do Cartão
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={handleCardNumberChange}
                required
                className="w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {cardBrand}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Nome Impresso no Cartão
            </label>
            <input
              type="text"
              placeholder="COMO ESTÁ NO CARTÃO"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              required
              className="w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Validade (MM/AA)
              </label>
              <input
                type="text"
                placeholder="MM/AA"
                value={cardExpiry}
                onChange={handleExpiryChange}
                required
                maxLength={5}
                className="w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                CVV
              </label>
              <input
                type="password"
                placeholder="123"
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
                maxLength={4}
                className="w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              CPF do Titular
            </label>
            <input
              type="text"
              placeholder="000.000.000-00"
              value={holderCpf}
              onChange={handleCpfChange}
              required
              className="w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Parcelamento no Cartão
            </label>
            <select
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              {installmentOptions.map((opt) => (
                <option key={opt.count} value={opt.count} className="bg-white text-slate-900 dark:bg-[#1c1c1e] dark:text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-white" />
                <span>Processando com Criptografia SSL...</span>
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 text-white/90" />
                <span>Pagar R$ {grandTotal.toFixed(2).replace('.', ',')} no Cartão</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* CONTEÚDO DA ABA CARTÃO DE DÉBITO */}
      {activeTab === 'debit' && (
        <form onSubmit={handleSubmitDebitCard} className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <span>O pagamento em débito é debitado instantaneamente da sua conta bancária sem parcelamento.</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Número do Cartão de Débito
            </label>
            <input
              type="text"
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={handleCardNumberChange}
              required
              className="w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Nome no Cartão
            </label>
            <input
              type="text"
              placeholder="NOME COMO NO CARTÃO"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              required
              className="w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Validade (MM/AA)
              </label>
              <input
                type="text"
                placeholder="MM/AA"
                value={cardExpiry}
                onChange={handleExpiryChange}
                required
                maxLength={5}
                className="w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                CVV
              </label>
              <input
                type="password"
                placeholder="123"
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
                maxLength={4}
                className="w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              CPF do Titular
            </label>
            <input
              type="text"
              placeholder="000.000.000-00"
              value={holderCpf}
              onChange={handleCpfChange}
              required
              className="w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-white" />
                <span>Processando Débito...</span>
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 text-white/90" />
                <span>Pagar R$ {grandTotal.toFixed(2).replace('.', ',')} no Débito</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* CONTEÚDO DA ABA PIX */}
      {activeTab === 'pix' && (
        <div className="text-center py-2 space-y-4">
          {isGeneratingPix ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-xs text-slate-300 font-semibold">Gerando QR Code Pix em tempo real...</p>
            </div>
          ) : pixQrCode ? (
            <div className="flex flex-col items-center gap-4">
              {/* QR Code Imagem */}
              {pixQrCodeBase64 ? (
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-md">
                  <img
                    src={`data:image/png;base64,${pixQrCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              ) : (
                <div className="p-4 bg-white rounded-2xl text-slate-900 font-mono text-xs break-all max-w-xs border">
                  {pixQrCode.slice(0, 100)}...
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-300">Escaneie o QR Code ou Copie a Chave Pix abaixo:</p>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center justify-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                  <span>Aguardando confirmação do pagamento (Polling a cada 4s)</span>
                </p>
              </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleCopyPix}
                className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-semibold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedPix ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span>Código Pix Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span>Copiar Código Pix (Copia e Cola)</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'pix' && !isGeneratingPix && pixQrCode) {
                    onPaymentApproved({ method: 'pix', paymentId: pixPaymentId || Date.now() });
                  } else {
                    handleGeneratePix();
                  }
                }}
                className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {pixQrCode ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Já Paguei - Concluir Pedido</span>
                  </>
                ) : (
                  <>
                    <QrCode className="h-5 w-5 text-white/90" />
                    <span>Gerar Código Pix de R$ {grandTotal.toFixed(2).replace('.', ',')}</span>
                  </>
                )}
              </button>
            </div>
            </div>
          ) : null}
        </div>
      )}

      {/* SELO DE SEGURANÇA PCI-DSS & CRIPTOGRAFIA */}
      <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <span>Pagamento Seguro Criptografado (PCI-DSS 256-Bit SSL)</span>
      </div>
    </div>
  );
};
