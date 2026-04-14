import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export default function Paginator({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const getPages = () => {
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(1, page - delta);
      i <= Math.min(pages, page + delta);
      i++
    ) {
      range.push(i);
    }
    if (range[0] > 1) {
      range.unshift("...");
      range.unshift(1);
    }
    if (range[range.length - 1] < pages) {
      range.push("...");
      range.push(pages);
    }
    return range;
  };

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-zinc-600">
        {from}–{to} de {total.toLocaleString()} resultados
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="h-7 w-7 text-zinc-500 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </Button>

        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="text-zinc-600 text-xs px-1">
              ···
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`h-7 w-7 rounded-md text-xs transition-colors ${
                p === page
                  ? "bg-white text-zinc-950 font-medium"
                  : "text-zinc-500 hover:text-white hover:bg-white/5"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
          className="h-7 w-7 text-zinc-500 hover:text-white disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
