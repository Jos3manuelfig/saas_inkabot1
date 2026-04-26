'use client'

import { ReactNode, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
}

export function Table<T>({ columns, data, pageSize = 5 }: TableProps<T>) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(data.length / pageSize)
  const slice = data.slice(page * pageSize, page * pageSize + pageSize)

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-[#1e1e30]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e30] bg-[#0f0f1a]">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8888aa]">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e30] bg-[#13131f]">
            {slice.map((row, i) => (
              <tr key={i} className="hover:bg-[#1a1a2e] transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-[#e8e8f0]">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-[#8888aa]">
          <span>
            Mostrando {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} de {data.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-[#1e1e30] p-1.5 hover:bg-[#1a1a2e] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="rounded-lg border border-[#1e1e30] p-1.5 hover:bg-[#1a1a2e] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
