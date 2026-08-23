import { AppSelect } from "@/components/ui/app-select";

interface AdminTablePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const AdminTablePagination = ({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: AdminTablePaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (pageNumber) => Math.abs(pageNumber - safePage) <= 2 || pageNumber === 1 || pageNumber === totalPages
  );

  return (
    <div className="admin-pagination">
      <p className="text-xs font-semibold text-gray-500">Affichage {start}-{end} sur {totalItems}</p>
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        Par page
        <AppSelect
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs font-bold text-gray-900"
        >
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </AppSelect>
      </label>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs font-semibold text-gray-500 sm:inline">Page {safePage} sur {totalPages}</span>
        <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage <= 1} className="border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-40">Précédent</button>
        {pageNumbers.map((pageNumber, index) => <span key={pageNumber} className="contents">
          {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && <span className="px-1 text-xs font-bold text-gray-400">…</span>}
          <button type="button" onClick={() => onPageChange(pageNumber)} className={`h-9 w-9 border text-xs font-bold transition-colors ${safePage === pageNumber ? "border-black bg-black text-white" : "border-gray-200 text-gray-700 hover:border-black"}`}>{pageNumber}</button>
        </span>)}
        <button type="button" onClick={() => onPageChange(safePage + 1)} disabled={safePage >= totalPages} className="border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-40">Suivant</button>
      </div>
    </div>
  );
};

export default AdminTablePagination;
