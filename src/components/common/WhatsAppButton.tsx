import React from 'react';

interface WhatsAppButtonProps {
  phone: string;
  message: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline' | 'subtle';
  showIcon?: boolean;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  message,
  label = 'Chamar no WhatsApp',
  className = '',
  size = 'md',
  variant = 'primary',
  showIcon = true,
}) => {
  const formatPhone = (raw: string): string => {
    const cleaned = (raw || '').replace(/\D/g, '');
    if (!cleaned) return '';
    // Se o número tem 10 ou 11 dígitos (DDD + número no Brasil), adiciona o DDI 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    return cleaned;
  };

  const cleanPhone = formatPhone(phone);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cleanPhone) {
      alert('Número de telefone não disponível.');
      return;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-xl',
    md: 'px-3.5 py-2 text-xs font-semibold gap-2 rounded-xl',
    lg: 'px-5 py-2.5 text-sm font-semibold gap-2.5 rounded-2xl',
  };

  const variantClasses = {
    primary: 'bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm hover:shadow active:scale-[0.98]',
    outline: 'border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 active:scale-[0.98]',
    subtle: 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 active:scale-[0.98]',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!cleanPhone}
      title={cleanPhone ? `Conversar com ${cleanPhone}` : 'Telefone indisponível'}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {showIcon && (
        <svg
          className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.539 1.931.848 2.791.848h.001c3.181 0 5.768-2.586 5.768-5.766 0-3.18-2.587-5.766-5.769-5.766zm3.375 8.21c-.144.405-.837.774-1.17.824-.312.045-.694.072-2.12-.519-1.821-.755-3.004-2.614-3.095-2.735-.09-.12-1.02-1.356-1.02-2.586 0-1.23.645-1.838.874-2.085.228-.246.498-.309.664-.309.166 0 .332.002.476.01.15.008.351-.057.55.42.203.489.694 1.692.755 1.815.061.122.102.266.02.427-.08.163-.122.264-.243.406-.12.143-.254.32-.363.429-.12.122-.246.254-.105.496.14.242.624 1.026 1.336 1.66 1.024.912 1.889 1.194 2.158 1.328.269.133.426.111.584-.07.158-.18.675-.788.855-1.058.18-.269.361-.225.603-.135.242.09 1.536.724 1.8.855.263.131.439.195.503.304.065.109.065.632-.079 1.037z"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.892.525 3.662 1.438 5.176L2 22l4.981-1.397A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.25c-1.624 0-3.137-.478-4.414-1.303l-.317-.205-3.272.917.933-3.189-.224-.336A8.204 8.204 0 0 1 3.75 12c0-4.556 3.694-8.25 8.25-8.25s8.25 3.694 8.25 8.25-3.694 8.25-8.25 8.25z"/>
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
};
