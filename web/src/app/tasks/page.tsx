"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, ImageIcon, LoaderCircle, RefreshCw, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslate } from "@/i18n/locale";
import { fetchRunningImageTasks, type AdminImageTask } from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";

const POLL_INTERVAL_MS = 2000;

function parseTaskTime(value?: string) {
  if (!value) {
    return 0;
  }
  const timestamp = Date.parse(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatElapsed(value: string | undefined, t: (zh: string, en: string) => string) {
  const timestamp = parseTaskTime(value);
  if (!timestamp) {
    return "-";
  }
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return t(`${seconds} 秒`, `${seconds}s`);
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return t(`${minutes} 分 ${seconds % 60} 秒`, `${minutes}m ${seconds % 60}s`);
  }
  const hours = Math.floor(minutes / 60);
  return t(`${hours} 小时 ${minutes % 60} 分`, `${hours}h ${minutes % 60}m`);
}

function getStatusLabel(task: AdminImageTask, t: (zh: string, en: string) => string) {
  if (task.status === "queued") {
    return t("排队中", "Queued");
  }
  if (task.status === "running") {
    return t("运行中", "Running");
  }
  if (task.status === "success") {
    return t("成功", "Success");
  }
  return t("失败", "Error");
}

function getModeLabel(task: AdminImageTask, t: (zh: string, en: string) => string) {
  return task.mode === "edit" ? t("图生图", "Edit") : t("文生图", "Generate");
}

function getOwnerLabel(task: AdminImageTask, t: (zh: string, en: string) => string) {
  const name = task.owner_name || task.owner_id || t("未知", "Unknown");
  const role = task.owner_role === "admin" ? t("管理员", "Admin") : t("用户", "User");
  return `${name} · ${role}`;
}

function RunningTasksContent() {
  const t = useTranslate();
  const [items, setItems] = useState<AdminImageTask[]>([]);
  const [stats, setStats] = useState({ total: 0, queued: 0, running: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => parseTaskTime(b.created_at) - parseTaskTime(a.created_at)),
    [items],
  );

  const loadTasks = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const data = await fetchRunningImageTasks();
      setItems(data.items);
      setStats(data.stats);
      setLastUpdatedAt(new Date().toLocaleTimeString());
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : t("加载任务失败", "Failed to load tasks"));
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadTasks();
    const timer = window.setInterval(() => {
      void loadTasks(true);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [loadTasks]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold tracking-[0.18em] text-stone-500 uppercase">Tasks</div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("当前任务", "Current tasks")}</h1>
          <p className="text-sm text-stone-500">
            {t("查看所有用户当前排队或运行中的图片任务。", "View all queued or running image tasks across users.")}
          </p>
        </div>
        <Button onClick={() => void loadTasks()} disabled={isLoading} className="h-10 rounded-xl bg-stone-950 px-4 text-white hover:bg-stone-800">
          {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {t("刷新", "Refresh")}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-stone-500">{t("总任务", "Total tasks")}</p>
              <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
            </div>
            <ImageIcon className="size-5 text-stone-400" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-stone-500">{t("运行中", "Running")}</p>
              <p className="mt-1 text-2xl font-semibold text-sky-700">{stats.running}</p>
            </div>
            <LoaderCircle className="size-5 text-sky-500" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-stone-500">{t("排队中", "Queued")}</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">{stats.queued}</p>
            </div>
            <Clock3 className="size-5 text-amber-500" />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-2 border-b border-stone-100 px-5 py-4 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
            <span>{t(`共 ${stats.total} 个当前任务`, `${stats.total} current tasks`)}</span>
            <span className="text-xs text-stone-400">
              {t("每 2 秒自动刷新", "Auto-refresh every 2s")}{lastUpdatedAt ? ` · ${lastUpdatedAt}` : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("状态", "Status")}</TableHead>
                  <TableHead>{t("类型", "Type")}</TableHead>
                  <TableHead>{t("模型", "Model")}</TableHead>
                  <TableHead>{t("尺寸", "Size")}</TableHead>
                  <TableHead>{t("所有者", "Owner")}</TableHead>
                  <TableHead>{t("提示词", "Prompt")}</TableHead>
                  <TableHead>{t("已运行", "Age")}</TableHead>
                  <TableHead>{t("更新时间", "Updated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((task) => (
                  <TableRow key={`${task.owner_id || "unknown"}-${task.id}`} className="text-stone-600">
                    <TableCell>
                      <Badge variant={task.status === "running" ? "info" : "warning"} className="rounded-md">
                        {task.status === "running" ? <LoaderCircle className="mr-1 size-3 animate-spin" /> : null}
                        {getStatusLabel(task, t)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getModeLabel(task, t)}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-stone-500">{task.model || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{task.size || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <UserRound className="size-4 text-stone-400" />
                        <span>{getOwnerLabel(task, t)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[360px] truncate text-stone-500" title={task.prompt_preview || undefined}>
                      {task.prompt_preview || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatElapsed(task.created_at, t)}</TableCell>
                    <TableCell className="whitespace-nowrap text-stone-500">{task.updated_at || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!isLoading && sortedItems.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-stone-500">
              {t("当前没有排队或运行中的任务。", "No queued or running tasks right now.")}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export default function RunningTasksPage() {
  const { isCheckingAuth, session } = useAuthGuard(["admin"]);

  if (isCheckingAuth || !session || session.role !== "admin") {
    return <div className="flex min-h-[40vh] items-center justify-center"><LoaderCircle className="size-5 animate-spin text-stone-400" /></div>;
  }

  return <RunningTasksContent />;
}
