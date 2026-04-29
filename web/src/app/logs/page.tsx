"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { DateRangeFilter } from "@/components/date-range-filter";
import { ImageLightbox } from "@/components/image-lightbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslate } from "@/i18n/locale";
import { fetchSystemLogs, type SystemLog } from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";

const LogType = {
  Call: "call",
  Account: "account",
} as const;

type LogTypeValue = (typeof LogType)[keyof typeof LogType];

function getDetailText(item: SystemLog, key: string) {
  const value = item.detail?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "-";
}

function formatDuration(item: SystemLog) {
  const value = item.detail?.duration_ms;
  return typeof value === "number" ? `${(value / 1000).toFixed(2)} s` : "-";
}

function getUrls(item: SystemLog | null) {
  const urls = item?.detail?.urls;
  return Array.isArray(urls) ? urls.filter((url): url is string => typeof url === "string") : [];
}

function getStatus(item: SystemLog, t: (zh: string, en: string) => string) {
  const status = item.detail?.status;
  if (status === "success") return t("成功", "Success");
  if (status === "failed") return t("失败", "Failed");
  return "-";
}

function LogsContent() {
  const t = useTranslate();
  const [items, setItems] = useState<SystemLog[]>([]);
  const [type, setType] = useState<LogTypeValue>(LogType.Call);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [detailLog, setDetailLog] = useState<SystemLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const detailUrls = getUrls(detailLog);
  const detailImages = detailUrls.map((url, index) => ({ id: `${index}`, src: url }));
  const isCallLog = type === LogType.Call;
  const typeLabels: Record<LogTypeValue, string> = {
    [LogType.Call]: t("调用日志", "Call logs"),
    [LogType.Account]: t("账号管理日志", "Account logs"),
  };
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const currentRows = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchSystemLogs({ type, start_date: startDate, end_date: endDate });
      setItems(data.items);
      setPage(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("加载日志失败", "Failed to load logs"));
    } finally {
      setIsLoading(false);
    }
  }, [endDate, startDate, t, type]);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const openDetail = (item: SystemLog) => {
    setDetailLog(item);
    setDetailOpen(true);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLogs();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadLogs]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold tracking-[0.18em] text-stone-500 uppercase">Logs</div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("日志管理", "Logs")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={type} onValueChange={(value) => setType(value as LogTypeValue)}>
            <SelectTrigger className="h-10 w-[150px] rounded-xl border-stone-200 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={LogType.Call}>{t("调用日志", "Call logs")}</SelectItem>
              <SelectItem value={LogType.Account}>{t("账号管理日志", "Account logs")}</SelectItem>
            </SelectContent>
          </Select>
          <DateRangeFilter startDate={startDate} endDate={endDate} onChange={(start, end) => { setStartDate(start); setEndDate(end); }} />
          <Button variant="outline" onClick={clearFilters} className="h-10 rounded-xl border-stone-200 bg-white px-4 text-stone-700">
            {t("清除筛选条件", "Clear filters")}
          </Button>
          <Button onClick={() => void loadLogs()} disabled={isLoading} className="h-10 rounded-xl bg-stone-950 px-4 text-white hover:bg-stone-800">
            {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
            {t("查询", "Search")}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 text-sm text-stone-600">
            <span>{t(`共 ${items.length} 条`, `${items.length} entries`)}</span>
            <Button variant="ghost" className="h-8 rounded-lg px-3 text-stone-500" onClick={() => void loadLogs()} disabled={isLoading}>
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              {t("刷新", "Refresh")}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("时间", "Time")}</TableHead>
                  <TableHead>{t("类型", "Type")}</TableHead>
                  {isCallLog ? <TableHead>{t("令牌名称", "Key name")}</TableHead> : null}
                  {isCallLog ? <TableHead>{t("调用耗时", "Duration")}</TableHead> : null}
                  {isCallLog ? <TableHead>{t("状态", "Status")}</TableHead> : null}
                  <TableHead>{t("简述", "Summary")}</TableHead>
                  <TableHead className="w-28">{t("详情", "Details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((item, index) => (
                  <TableRow key={`${item.time}-${index}`} className="text-stone-600">
                    <TableCell className="whitespace-nowrap">{item.time}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-md">
                        {item.type in typeLabels ? typeLabels[item.type as LogTypeValue] : item.type}
                      </Badge>
                    </TableCell>
                    {isCallLog ? <TableCell>{getDetailText(item, "key_name")}</TableCell> : null}
                    {isCallLog ? <TableCell>{formatDuration(item)}</TableCell> : null}
                    {isCallLog ? (
                      <TableCell>
                        <Badge variant={item.detail?.status === "failed" ? "danger" : "success"} className="rounded-md">
                          {getStatus(item, t)}
                        </Badge>
                      </TableCell>
                    ) : null}
                    <TableCell className="max-w-[420px] truncate text-stone-500">{item.summary || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" className="h-8 rounded-lg px-3 text-stone-600" onClick={() => openDetail(item)}>
                        {t("查看详情", "View details")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-stone-100 px-4 py-3 text-sm text-stone-500">
            <span>{t(`第 ${safePage} / ${pageCount} 页，共 ${items.length} 条`, `Page ${safePage} / ${pageCount}, ${items.length} entries`)}</span>
            <Button variant="outline" size="icon" className="size-9 rounded-lg border-stone-200 bg-white" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-9 rounded-lg border-stone-200 bg-white" disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {!isLoading && items.length === 0 ? <div className="px-6 py-14 text-center text-sm text-stone-500">{t("没有找到日志", "No logs found")}</div> : null}
        </CardContent>
      </Card>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[min(92vw,920px)] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>{t("日志详情", "Log details")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("查看当前日志条目的详细字段和关联图片。", "View the detailed fields and related images for the current log entry.")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 md:grid-cols-2">
            {Object.entries(detailLog?.detail || {})
              .filter(([key, value]) => key !== "urls" && typeof value !== "object")
              .map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <span className="text-stone-400">{key}</span>
                  <span className="text-right font-medium text-stone-700">{String(value)}</span>
                </div>
              ))}
          </div>
          {detailUrls.length ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {detailUrls.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  className="aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
                  onClick={() => {
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          <pre className="max-h-[72vh] overflow-auto rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs leading-6 text-stone-700">
            {JSON.stringify(detailLog?.detail || {}, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
      <ImageLightbox
        images={detailImages}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onIndexChange={setLightboxIndex}
      />
    </section>
  );
}

export default function LogsPage() {
  const { isCheckingAuth, session } = useAuthGuard(["admin"]);
  if (isCheckingAuth || !session || session.role !== "admin") {
    return <div className="flex min-h-[40vh] items-center justify-center"><LoaderCircle className="size-5 animate-spin text-stone-400" /></div>;
  }
  return <LogsContent />;
}
