import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

const DEFAULT_LIMIT = 20;

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }

        if (key !== "page") {
          next.delete("page");
        }

        return next;
      });
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (page: number) => {
      setParam("page", String(page));
    },
    [setParam],
  );

  return {
    searchParams,
    page: positiveInt(searchParams.get("page"), 1),
    limit: positiveInt(searchParams.get("limit"), DEFAULT_LIMIT),
    setParam,
    setPage,
  };
}
