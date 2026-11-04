import React from 'react';

/**
 * Tabela de padrões Code 39
 * Cada caractere é codificado em 9 barras/espaços (3 largos [W/1], 6 estreitos [N/0]).
 * '1' = barra/espaço largo, '0' = barra/espaço estreito
 */
const CODE39_MAP: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  'A': '100001001',
  'B': '001001001',
  'C': '101001000',
  'D': '000011001',
  'E': '100011000',
  'F': '001011000',
  'G': '000001101',
  'H': '100001100',
  'I': '001001100',
  'J': '000011100',
  'K': '100000011',
  'L': '001000011',
  'M': '101000010',
  'N': '000010011',
  'O': '100010010',
  'P': '001010010',
  'Q': '000000111',
  'R': '100000110',
  'S': '001000110',
  'T': '000010110',
  'U': '110000001',
  'V': '011000001',
  'W': '111000000',
  'X': '010010001',
  'Y': '110010000',
  'Z': '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '*': '010010100',
  '$': '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
};

interface BarcodeProps {
  value: string;
  height?: number;
  narrowWidth?: number;
  wideWidth?: number;
  className?: string;
  displayValue?: boolean;
}

/**
 * Renderiza um Código de Barras Code 39 em SVG puro (100% vetorial, offline e compatível com impressoras térmicas)
 */
export const Code39Barcode: React.FC<BarcodeProps> = ({
  value,
  height = 50,
  narrowWidth = 2,
  wideWidth = 5,
  className = '',
  displayValue = true,
}) => {
  const cleanVal = (value || '').toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '');
  const encoded = `*${cleanVal}*`;

  // Constrói os retângulos de barra
  const elements: { x: number; width: number }[] = [];
  let currentX = 0;
  const interCharacterGap = narrowWidth;

  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    const pattern = CODE39_MAP[char] || CODE39_MAP['-'];

    for (let b = 0; b < pattern.length; b++) {
      const isBar = b % 2 === 0;
      const isWide = pattern[b] === '1';
      const w = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        elements.push({ x: currentX, width: w });
      }
      currentX += w;
    }

    currentX += interCharacterGap;
  }

  const totalWidth = currentX;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', maxWidth: `${Math.max(totalWidth, 180)}px` }}
      >
        {elements.map((el, idx) => (
          <rect key={idx} x={el.x} y={0} width={el.width} height={height} fill="#000000" />
        ))}
      </svg>
      {displayValue && (
        <span className="font-mono text-[10px] tracking-widest text-slate-900 mt-1 font-bold">
          {cleanVal}
        </span>
      )}
    </div>
  );
};

