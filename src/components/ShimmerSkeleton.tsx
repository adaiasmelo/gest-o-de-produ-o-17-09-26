import React from 'react';

interface SkeletonBoxProps {
  className?: string;
  rounded?: string;
}

/**
 * Caixa genérica com efeito Shimmer pulsante de alta fidelidade
 */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  className = 'h-4 w-full',
  rounded = 'rounded-xl',
}) => {
  return (
    <div
      className={`relative overflow-hidden bg-slate-200/70 dark:bg-slate-800/60 ${rounded} ${className} before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent`}
    />
  );
};

interface SkeletonKpiCardProps {
  count?: number;
}

/**
 * Placeholder para os Cards de KPI de Produção / Horas Extras
 */
export const SkeletonKpiCard: React.FC<SkeletonKpiCardProps> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-3 w-28" />
            <SkeletonBox className="h-9 w-9" rounded="rounded-xl" />
          </div>
          <div className="space-y-2">
            <SkeletonBox className="h-8 w-36" />
            <SkeletonBox className="h-3 w-20" />
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <SkeletonBox className="h-2.5 w-24" />
            <SkeletonBox className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

/**
 * Placeholder para Tabelas de Lançamento e Registros Diários
 */
export const SkeletonTable: React.FC<SkeletonTableProps> = ({ rows = 6, cols = 5 }) => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs animate-pulse">
      {/* Cabeçalho da Tabela */}
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBox key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Linhas da Tabela */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="p-4 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <SkeletonBox
                key={colIdx}
                className={`h-3.5 flex-1 ${colIdx === 0 ? 'w-24' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
