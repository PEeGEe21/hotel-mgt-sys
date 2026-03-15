'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PaginationMeta = {
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
  from: number;
  to: number;
};

type Props = {
  meta: PaginationMeta;
  currentPage: number;
  handlePageChange: (page: number) => void;
};

export default function Pagination({ meta, currentPage, handlePageChange }: Props) {
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const total = meta.last_page;
    const cur = meta.current_page;

    pages.push(1);

    const start = Math.max(2, cur - 1);
    const end = Math.min(total - 1, cur + 1);

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    if (total > 1) pages.push(total);

    return pages;
  };

  if (meta.last_page <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-[#1e2536] bg-[#0f1117]/40 px-4 py-3 rounded-b-xl">
      {/* Mobile */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 text-sm rounded-lg border border-[#1e2536] text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === meta.last_page}
          className="px-4 py-2 text-sm rounded-lg border border-[#1e2536] text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Showing <span className="font-medium text-slate-400">{meta.from}</span> to{' '}
          <span className="font-medium text-slate-400">{meta.to}</span> of{' '}
          <span className="font-medium text-slate-400">{meta.total}</span> entries
        </p>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-[#1e2536] text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="flex items-center gap-0.5">
            {getPageNumbers().map((page, i) => (
              <button
                key={i}
                onClick={() => typeof page === 'number' && handlePageChange(page)}
                disabled={page === '...' || page === currentPage}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                  page === currentPage
                    ? 'bg-blue-600 text-white'
                    : page === '...'
                      ? 'cursor-default text-slate-600'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === meta.last_page}
            className="p-1.5 rounded-lg border border-[#1e2536] text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
