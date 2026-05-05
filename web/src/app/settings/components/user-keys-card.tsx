"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ban, CheckCircle2, Copy, KeyRound, LoaderCircle, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAppLocale, useTranslate } from "@/i18n/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createUserKey, deleteUserKey, fetchUserKeys, updateUserKey, type UserKey } from "@/lib/api";

function formatDateTime(value?: string | null, isEnglish = false) {
  if (!value) {
    return "?";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(isEnglish ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function quotaValueToInput(value?: number | null) {
  return value == null ? "" : String(value);
}

function parseLimitInput(value: string, errorMessage: string) {
  const text = value.trim();
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(errorMessage);
  }
  return parsed;
}

function formatQuotaValue(value: number | null | undefined, t: (zh: string, en: string) => string) {
  return value == null ? t("无限", "Unlimited") : String(value);
}

export function UserKeysCard() {
  const t = useTranslate();
  const { isEnglish } = useAppLocale();
  const didLoadRef = useRef(false);
  const [items, setItems] = useState<UserKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createGenerateQuota, setCreateGenerateQuota] = useState("");
  const [createEditQuota, setCreateEditQuota] = useState("");
  const [createMaxRunningTasks, setCreateMaxRunningTasks] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [revealedKey, setRevealedKey] = useState("");
  const [deletingItem, setDeletingItem] = useState<UserKey | null>(null);
  const [editingItem, setEditingItem] = useState<UserKey | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingKey, setEditingKey] = useState("");
  const [editingGenerateQuota, setEditingGenerateQuota] = useState("");
  const [editingEditQuota, setEditingEditQuota] = useState("");
  const [editingMaxRunningTasks, setEditingMaxRunningTasks] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchUserKeys();
      setItems(data.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("加载用户密钥失败", "Failed to load user keys"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (didLoadRef.current) {
      return;
    }
    didLoadRef.current = true;
    void load();
  }, [load]);

  const resetCreateForm = () => {
    setCreateName("");
    setCreateGenerateQuota("");
    setCreateEditQuota("");
    setCreateMaxRunningTasks("");
  };

  const resetEditDialog = () => {
    setEditingItem(null);
    setEditingName("");
    setEditingKey("");
    setEditingGenerateQuota("");
    setEditingEditQuota("");
    setEditingMaxRunningTasks("");
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const data = await createUserKey(createName.trim(), {
        generate_remaining: parseLimitInput(createGenerateQuota, t("文生图额度必须是大于等于 0 的整数", "Generate quota must be an integer greater than or equal to 0")),
        edit_remaining: parseLimitInput(createEditQuota, t("图生图额度必须是大于等于 0 的整数", "Edit quota must be an integer greater than or equal to 0")),
        max_running_tasks: parseLimitInput(createMaxRunningTasks, t("最大并发任务数必须是大于等于 0 的整数", "Maximum running tasks must be an integer greater than or equal to 0")),
      });
      setItems(data.items);
      setRevealedKey(data.key);
      resetCreateForm();
      setIsDialogOpen(false);
      toast.success(t("用户密钥已创建", "User key created"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("创建用户密钥失败", "Failed to create user key"));
    } finally {
      setIsCreating(false);
    }
  };

  const setItemPending = (id: string, isPending: boolean) => {
    setPendingIds((current) => {
      const next = new Set(current);
      if (isPending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleToggle = async (item: UserKey) => {
    setItemPending(item.id, true);
    try {
      const data = await updateUserKey(item.id, { enabled: !item.enabled });
      setItems(data.items);
      toast.success(item.enabled ? t("用户密钥已禁用", "User key disabled") : t("用户密钥已启用", "User key enabled"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("更新用户密钥失败", "Failed to update user key"));
    } finally {
      setItemPending(item.id, false);
    }
  };

  const openEditDialog = (item: UserKey) => {
    setEditingItem(item);
    setEditingName(item.name);
    setEditingKey("");
    setEditingGenerateQuota(quotaValueToInput(item.generate_remaining));
    setEditingEditQuota(quotaValueToInput(item.edit_remaining));
    setEditingMaxRunningTasks(quotaValueToInput(item.max_running_tasks));
  };

  const handleSaveEdit = async () => {
    if (!editingItem) {
      return;
    }
    setIsSavingEdit(true);
    try {
      const data = await updateUserKey(editingItem.id, {
        name: editingName.trim(),
        key: editingKey.trim() || undefined,
        generate_remaining: parseLimitInput(editingGenerateQuota, t("文生图额度必须是大于等于 0 的整数", "Generate quota must be an integer greater than or equal to 0")),
        edit_remaining: parseLimitInput(editingEditQuota, t("图生图额度必须是大于等于 0 的整数", "Edit quota must be an integer greater than or equal to 0")),
        max_running_tasks: parseLimitInput(editingMaxRunningTasks, t("最大并发任务数必须是大于等于 0 的整数", "Maximum running tasks must be an integer greater than or equal to 0")),
      });
      setItems(data.items);
      resetEditDialog();
      toast.success(editingKey.trim() ? t("用户密钥已更新", "User key updated") : t("用户密钥额度已更新", "User key limits updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("更新用户密钥失败", "Failed to update user key"));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) {
      return;
    }
    const item = deletingItem;
    setItemPending(item.id, true);
    try {
      const data = await deleteUserKey(item.id);
      setItems(data.items);
      setDeletingItem(null);
      toast.success(t("用户密钥已删除", "User key deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("删除用户密钥失败", "Failed to delete user key"));
    } finally {
      setItemPending(item.id, false);
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("已复制到剪贴板", "Copied to clipboard"));
    } catch {
      toast.error(t("复制失败，请手动复制", "Copy failed, please copy it manually"));
    }
  };

  return (
    <>
      <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-stone-100">
                <KeyRound className="size-5 text-stone-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{t("用户密钥管理", "User keys")}</h2>
                <p className="text-sm text-stone-500">{t("为普通用户创建专用密钥；普通用户只能进入画图页，不能查看设置和号池。", "Create dedicated keys for regular users. Regular users can only access the image page and cannot open settings or accounts.")}</p>
              </div>
            </div>
            <Button className="h-9 rounded-xl bg-stone-950 px-4 text-white hover:bg-stone-800" onClick={() => setIsDialogOpen(true)}>
              <Plus className="size-4" />
              {t("创建用户密钥", "Create user key")}
            </Button>
          </div>

          {revealedKey ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
              <div className="font-medium">{t("新密钥仅展示一次，请立即保存：", "This new key is shown only once. Save it now:")}</div>
              <div className="mt-3 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-white/80 p-3 md:flex-row md:items-center md:justify-between">
                <code className="break-all font-mono text-[13px]">{revealedKey}</code>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl border-emerald-200 bg-white px-4 text-emerald-700"
                  onClick={() => void handleCopy(revealedKey)}
                >
                  <Copy className="size-4" />
                  {t("复制", "Copy")}
                </Button>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoaderCircle className="size-5 animate-spin text-stone-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl bg-stone-50 px-6 py-10 text-center text-sm text-stone-500">
              {t("暂无普通用户密钥。点击右上角按钮后即可创建并分发给其他人。", "No user keys yet. Click the button in the top-right corner to create one and share it.")}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const isPending = pendingIds.has(item.id);
                return (
                  <div key={item.id} className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white px-4 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-medium text-stone-800">{item.name}</div>
                          <Badge variant={item.enabled ? "success" : "secondary"} className="rounded-md">
                            {item.enabled ? t("已启用", "Enabled") : t("已禁用", "Disabled")}
                          </Badge>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                          <div className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                            <div className="text-stone-400">{t("最大并发任务数", "Max running tasks")}</div>
                            <div className="mt-1 text-sm font-semibold text-stone-800">{formatQuotaValue(item.max_running_tasks, t)}</div>
                          </div>
                          <div className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                            <div className="text-stone-400">{t("文生图剩余额度", "Generate quota left")}</div>
                            <div className="mt-1 text-sm font-semibold text-stone-800">{formatQuotaValue(item.generate_remaining, t)}</div>
                          </div>
                          <div className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                            <div className="text-stone-400">{t("图生图剩余额度", "Edit quota left")}</div>
                            <div className="mt-1 text-sm font-semibold text-stone-800">{formatQuotaValue(item.edit_remaining, t)}</div>
                          </div>
                          <div className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                            <div className="text-stone-400">{t("文生图已使用", "Generate used")}</div>
                            <div className="mt-1 text-sm font-semibold text-stone-800">{item.generate_used}</div>
                          </div>
                          <div className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                            <div className="text-stone-400">{t("图生图已使用", "Edit used")}</div>
                            <div className="mt-1 text-sm font-semibold text-stone-800">{item.edit_used}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                          <span>{t("创建时间", "Created")} {formatDateTime(item.created_at, isEnglish)}</span>
                          <span>{t("最近使用", "Last used")} {formatDateTime(item.last_used_at, isEnglish)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-xl border-stone-200 bg-white px-4 text-stone-700"
                          onClick={() => openEditDialog(item)}
                          disabled={isPending}
                        >
                          <Settings2 className="size-4" />
                          {t("编辑密钥与额度", "Edit key & limits")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-xl border-stone-200 bg-white px-4 text-stone-700"
                          onClick={() => void handleToggle(item)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : item.enabled ? (
                            <Ban className="size-4" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                          {item.enabled ? t("禁用", "Disable") : t("启用", "Enable")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-xl border-rose-200 bg-white px-4 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => setDeletingItem(item)}
                          disabled={isPending}
                        >
                          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          {t("删除", "Delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>{t("创建用户密钥", "Create user key")}</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {t("可选填写一个备注名称，并为文生图/图生图设置独立额度；额度留空表示不限量。创建后会生成一条只能查看一次的原始密钥。", "You can optionally add a note and set separate generate/edit quotas. Leave a quota blank for unlimited use. After creation, the raw key will only be shown once.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{t("名称（可选）", "Name (optional)")}</label>
              <Input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder={t("例如：设计同学 A、运营临时账号", "For example: Designer A, temp ops account")}
                className="h-11 rounded-xl border-stone-200 bg-white"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t("文生图额度", "Generate quota")}</label>
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={createGenerateQuota}
                  onChange={(event) => setCreateGenerateQuota(event.target.value)}
                  placeholder={t("留空表示不限量", "Leave blank for unlimited")}
                  className="h-11 rounded-xl border-stone-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t("图生图额度", "Edit quota")}</label>
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={createEditQuota}
                  onChange={(event) => setCreateEditQuota(event.target.value)}
                  placeholder={t("留空表示不限量", "Leave blank for unlimited")}
                  className="h-11 rounded-xl border-stone-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t("最大并发任务数", "Max running tasks")}</label>
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={createMaxRunningTasks}
                  onChange={(event) => setCreateMaxRunningTasks(event.target.value)}
                  placeholder={t("留空表示不限量", "Leave blank for unlimited")}
                  className="h-11 rounded-xl border-stone-200 bg-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-xl bg-stone-100 px-5 text-stone-700 hover:bg-stone-200"
              onClick={() => {
                setIsDialogOpen(false);
                resetCreateForm();
              }}
              disabled={isCreating}
            >
              {t("取消", "Cancel")}
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800"
              onClick={() => void handleCreate()}
              disabled={isCreating}
            >
              {isCreating ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {t("创建", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => (!open ? resetEditDialog() : null)}>
        <DialogContent className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>{t("编辑用户密钥", "Edit user key")}</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {t("可以修改备注名称、替换专用密钥，并单独调整文生图/图生图剩余额度；额度留空表示不限量。", "You can update the note, replace the dedicated key, and adjust generate/edit remaining quota separately. Leave a quota blank for unlimited use.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{t("名称", "Name")}</label>
              <Input
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                placeholder={t("例如：设计同学 A、运营临时账号", "For example: Designer A, temp ops account")}
                className="h-11 rounded-xl border-stone-200 bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{t("新的专用密钥（可选）", "New dedicated key (optional)")}</label>
              <Input
                value={editingKey}
                onChange={(event) => setEditingKey(event.target.value)}
                placeholder="sk-your-custom-user-key"
                className="h-11 rounded-xl border-stone-200 bg-white font-mono"
              />
              <p className="text-xs leading-5 text-stone-500">
                {t("保存后旧密钥会立即失效，新密钥生效。系统仍只保存哈希，不会回显当前密钥。", "After saving, the old key becomes invalid immediately and the new key takes effect. The system still stores only the hash and never reveals the current key.")}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t("文生图剩余额度", "Generate quota left")}</label>
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={editingGenerateQuota}
                  onChange={(event) => setEditingGenerateQuota(event.target.value)}
                  placeholder={t("留空表示不限量", "Leave blank for unlimited")}
                  className="h-11 rounded-xl border-stone-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t("图生图剩余额度", "Edit quota left")}</label>
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={editingEditQuota}
                  onChange={(event) => setEditingEditQuota(event.target.value)}
                  placeholder={t("留空表示不限量", "Leave blank for unlimited")}
                  className="h-11 rounded-xl border-stone-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t("最大并发任务数", "Max running tasks")}</label>
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={editingMaxRunningTasks}
                  onChange={(event) => setEditingMaxRunningTasks(event.target.value)}
                  placeholder={t("留空表示不限量", "Leave blank for unlimited")}
                  className="h-11 rounded-xl border-stone-200 bg-white"
                />
              </div>
            </div>
            {editingItem ? (
              <div className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600 sm:grid-cols-2">
                <div>{t("文生图已使用", "Generate used")}: <span className="font-semibold text-stone-800">{editingItem.generate_used}</span></div>
                <div>{t("图生图已使用", "Edit used")}: <span className="font-semibold text-stone-800">{editingItem.edit_used}</span></div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-xl bg-stone-100 px-5 text-stone-700 hover:bg-stone-200"
              onClick={() => resetEditDialog()}
              disabled={isSavingEdit}
            >
              {t("取消", "Cancel")}
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800"
              onClick={() => void handleSaveEdit()}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? <LoaderCircle className="size-4 animate-spin" /> : <Settings2 className="size-4" />}
              {t("保存", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingItem)} onOpenChange={(open) => (!open ? setDeletingItem(null) : null)}>
        <DialogContent className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>{t("删除用户密钥", "Delete user key")}</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {t(`确认删除用户密钥「${deletingItem?.name}」吗？删除后该密钥将无法继续调用接口。`, `Delete the user key "${deletingItem?.name}"? It will no longer be able to call the API.`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-xl bg-stone-100 px-5 text-stone-700 hover:bg-stone-200"
              onClick={() => setDeletingItem(null)}
              disabled={deletingItem ? pendingIds.has(deletingItem.id) : false}
            >
              {t("取消", "Cancel")}
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-rose-600 px-5 text-white hover:bg-rose-700"
              onClick={() => void handleDelete()}
              disabled={deletingItem ? pendingIds.has(deletingItem.id) : false}
            >
              {deletingItem && pendingIds.has(deletingItem.id) ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {t("删除", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
