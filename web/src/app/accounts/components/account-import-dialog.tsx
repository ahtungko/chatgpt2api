"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileJson,
  FileText,
  Files,
  KeyRound,
  LoaderCircle,
  ServerCog,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { translate, useTranslate } from "@/i18n/locale";
import { createAccounts, type Account, type AccountImportPayload } from "@/lib/api";
import { cn } from "@/lib/utils";

type ImportMethod = "menu" | "token" | "session" | "cpa";

type AccountImportDialogProps = {
  disabled?: boolean;
  onImported: (items: Account[]) => void;
};

type PendingCpaImport = {
  tokens: string[];
  accounts: AccountImportPayload[];
  parsedFileCount: number;
  errorCount: number;
};

const sessionUrl = "https://chatgpt.com/api/auth/session";

function splitTokens(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSessionAccessToken(value: unknown) {
  const token = (value as { accessToken?: unknown })?.accessToken;
  return typeof token === "string" ? token.trim() : "";
}

function getCpaAccount(value: unknown): AccountImportPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const tokenValue = raw.access_token ?? raw.accessToken;
  const token = typeof tokenValue === "string" ? tokenValue.trim() : "";
  if (!token) {
    return null;
  }

  const payload: AccountImportPayload = {
    ...raw,
    access_token: token,
  };
  delete payload.accessToken;
  if (payload.type === "codex") {
    payload.export_type = "codex";
    delete payload.type;
  }
  return payload;
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error(translate(`读取文件失败: ${file.name}`, `Failed to read file: ${file.name}`)));
    reader.readAsText(file);
  });
}

function MethodCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: typeof KeyRound;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-stone-200 bg-white p-0 text-left transition hover:border-stone-300 hover:bg-stone-50"
    >
      <Card className="rounded-2xl border-0 bg-transparent shadow-none">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="rounded-xl bg-stone-100 p-3 text-stone-700">
            <Icon className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-stone-900">{title}</div>
            <div className="text-sm leading-6 text-stone-500">{description}</div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

export function AccountImportDialog({ disabled, onImported }: AccountImportDialogProps) {
  const t = useTranslate();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<ImportMethod>("menu");
  const [tokenInput, setTokenInput] = useState("");
  const [sessionInput, setSessionInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingCpaImport, setPendingCpaImport] = useState<PendingCpaImport | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const txtInputRef = useRef<HTMLInputElement | null>(null);
  const cpaInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setMethod("menu");
    setTokenInput("");
    setSessionInput("");
    setPendingCpaImport(null);
    setConfirmOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const submitTokens = async (tokens: string[], successText?: string, accountPayloads: AccountImportPayload[] = []) => {
    const normalizedTokens = tokens.map((item) => item.trim()).filter(Boolean);

    if (normalizedTokens.length === 0) {
      toast.error(t("请先提供至少一个可用 Token", "Provide at least one valid token first"));
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await createAccounts(normalizedTokens, accountPayloads);
      onImported(data.items);
      setOpen(false);
      resetState();

      if ((data.errors?.length ?? 0) > 0) {
        const firstError = data.errors?.[0]?.error;
        toast.error(
          t(
            `${successText ?? "导入完成"}，新增 ${data.added ?? 0} 个，已刷新 ${data.refreshed ?? 0} 个，失败 ${data.errors?.length ?? 0} 个${firstError ? `，首个错误：${firstError}` : ""}`,
            `${successText ?? "Import complete"}: added ${data.added ?? 0}, refreshed ${data.refreshed ?? 0}, failed ${data.errors?.length ?? 0}${firstError ? `, first error: ${firstError}` : ""}`,
          ),
        );
      } else {
        toast.success(
          t(
            `${successText ?? "导入完成"}，新增 ${data.added ?? 0} 个，跳过 ${data.skipped ?? 0} 个重复项，已自动刷新账号信息`,
            `${successText ?? "Import complete"}: added ${data.added ?? 0}, skipped ${data.skipped ?? 0} duplicates, and refreshed account info`,
          ),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("导入账户失败", "Failed to import accounts");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportTokenText = async () => {
    await submitTokens(splitTokens(tokenInput), t("Access Token 导入完成", "Access token import complete"));
  };

  const handleTxtSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const content = await readFileAsText(file);
      const tokens = splitTokens(content);

      if (tokens.length === 0) {
        toast.error(t("TXT 文件里没有读取到有效 Token", "No valid tokens were found in the TXT file"));
        return;
      }

      setTokenInput((prev) => {
        const next = [...splitTokens(prev), ...tokens];
        return next.join("\n");
      });
      toast.success(t(`已从 ${file.name} 读取 ${tokens.length} 个 Token`, `Read ${tokens.length} tokens from ${file.name}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("读取 TXT 文件失败", "Failed to read the TXT file");
      toast.error(message);
    }
  };

  const handleImportSessionJson = async () => {
    if (!sessionInput.trim()) {
      toast.error(t("请先粘贴完整 Session JSON", "Paste the full session JSON first"));
      return;
    }

    try {
      const payload = JSON.parse(sessionInput) as unknown;
      const token = getSessionAccessToken(payload);

      if (!token) {
        toast.error(t("未从 Session JSON 中提取到 accessToken", "No accessToken was found in the session JSON"));
        return;
      }

      await submitTokens([token], t("Session JSON 导入完成", "Session JSON import complete"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("Session JSON 解析失败", "Failed to parse session JSON");
      toast.error(message);
    }
  };

  const handleCpaSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const raw = await readFileAsText(file);
          const parsed = JSON.parse(raw) as unknown;
          const account = getCpaAccount(parsed);
          return {
            account,
          };
        }),
      );

      const accounts = results.map((item) => item.account).filter((item): item is AccountImportPayload => Boolean(item));
      const tokens = accounts.map((item) => item.access_token);
      const parsedFileCount = accounts.length;
      const errorCount = results.length - parsedFileCount;

      if (parsedFileCount === 0) {
        toast.error(t("这些 CPA JSON 文件里没有读取到可用 access_token", "No usable access_token values were found in the CPA JSON files"));
        return;
      }

      setPendingCpaImport({
        tokens,
        accounts,
        parsedFileCount,
        errorCount,
      });
      setConfirmOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("读取 CPA JSON 文件失败", "Failed to read CPA JSON files");
      toast.error(message);
    }
  };

  const renderMethodBody = () => {
    if (method === "token") {
      const tokenCount = splitTokens(tokenInput).length;

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMethod("menu")}
              className="inline-flex items-center gap-1 text-sm text-stone-500 transition hover:text-stone-800"
            >
              <ArrowLeft className="size-4" />
              {t("返回导入方式", "Back to import methods")}
            </button>
            <span className="text-xs text-stone-400">{t(`当前识别 ${tokenCount} 个 Token`, `${tokenCount} tokens detected`)}</span>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">{t("Access Token 列表", "Access token list")}</label>
            <Textarea
              placeholder={t("每行一个 Access Token...", "One access token per line...")}
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              className="min-h-56 resize-none rounded-xl border-stone-200"
            />
          </div>
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-stone-800">{t("从 TXT 文件导入", "Import from a TXT file")}</div>
                <div className="text-sm leading-6 text-stone-500">{t("支持 `.txt`，文件内容也是一行一个 Token。", "Supports `.txt` files with one token per line.")}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-stone-200 bg-white"
                onClick={() => txtInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <FileText className="size-4" />
                {t("选择 TXT", "Choose TXT")}
              </Button>
            </div>
          </div>
          <input
            ref={txtInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(event) => void handleTxtSelected(event)}
          />
        </div>
      );
    }

    if (method === "session") {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMethod("menu")}
            className="inline-flex items-center gap-1 text-sm text-stone-500 transition hover:text-stone-800"
          >
            <ArrowLeft className="size-4" />
            {t("返回导入方式", "Back to import methods")}
          </button>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
            {t("打开", "Open")}
            {" "}
            <a
              href={sessionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-stone-900 underline underline-offset-4"
            >
              {sessionUrl}
              <ExternalLink className="size-3.5" />
            </a>
            {t("，复制页面返回的完整 JSON，系统会自动提取其中的 `accessToken` 导入。", ", copy the full JSON response and the system will extract the `accessToken` automatically.")}
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <div className="font-medium">{t("风险提示", "Risk warning")}</div>
            <div>
              {t("不要使用自己的大号，尽量使用不常用的小号进行导入，避免出现封号风险。本项目不承担任何封号风险责任。", "Do not use your main account. Use less important accounts when importing to reduce ban risk. This project does not assume responsibility for account bans.")}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Session JSON</label>
            <Textarea
              placeholder={t('粘贴完整 JSON，例如包含 "accessToken" 的对象...', 'Paste the full JSON, for example an object that contains "accessToken"...')}
              value={sessionInput}
              onChange={(event) => setSessionInput(event.target.value)}
              className="min-h-56 resize-none rounded-xl border-stone-200 font-mono text-xs"
            />
          </div>
        </div>
      );
    }

    if (method === "cpa") {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMethod("menu")}
            className="inline-flex items-center gap-1 text-sm text-stone-500 transition hover:text-stone-800"
          >
            <ArrowLeft className="size-4" />
            {t("返回导入方式", "Back to import methods")}
          </button>
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-5">
            <div className="space-y-2">
              <div className="text-sm font-medium text-stone-800">{t("多选本地 CPA JSON 文件", "Select multiple local CPA JSON files")}</div>
              <div className="text-sm leading-6 text-stone-500">
                {t("每个文件应为一个 JSON 对象。系统会从对象中自动提取 `access_token` 或 `accessToken`，", "Each file should contain one JSON object. The system extracts `access_token` or `accessToken` automatically.")}
              </div>
            </div>
            <Button
              type="button"
              className="mt-4 rounded-xl bg-stone-950 text-white hover:bg-stone-800"
              onClick={() => cpaInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <Files className="size-4" />
              {t("选择多个 JSON 文件", "Choose multiple JSON files")}
            </Button>
          </div>
          <input
            ref={cpaInputRef}
            type="file"
            accept=".json,application/json"
            multiple
            className="hidden"
            onChange={(event) => void handleCpaSelected(event)}
          />
          {pendingCpaImport ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-600">
              {t(`最近一次读取到 ${pendingCpaImport.parsedFileCount} 个 Token`, `Last read found ${pendingCpaImport.parsedFileCount} tokens`)}
              {pendingCpaImport.errorCount > 0 ? t(`，另有 ${pendingCpaImport.errorCount} 个文件未提取成功`, `, and ${pendingCpaImport.errorCount} files failed to parse`) : ""}。
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <MethodCard
          title={t("导入 Access Token", "Import access tokens")}
          description={t("支持直接粘贴，一行一个；也支持从 TXT 文件读取，一行一个。", "You can paste tokens directly or import them from a TXT file, one per line.")}
          icon={KeyRound}
          onClick={() => setMethod("token")}
        />
        <MethodCard
          title={t("导入 Session JSON", "Import session JSON")}
          description={t("从 chatgpt.com 的 session 接口复制完整 JSON，自动提取 accessToken。", "Copy the full JSON from the chatgpt.com session endpoint and extract the accessToken automatically.")}
          icon={FileJson}
          onClick={() => setMethod("session")}
        />
        <MethodCard
          title={t("导入 CPA JSON 文件", "Import CPA JSON files")}
          description={t("支持一次多选多个本地 JSON 文件，逐个读取对象里的 access_token 后导入。", "Select multiple local JSON files at once and import the access_token from each object.")}
          icon={Files}
          onClick={() => setMethod("cpa")}
        />
        <MethodCard
          title={t("从远程 CPA 服务器导入", "Import from a remote CPA server")}
          description={t("前往设置页面配置远程 CPA 服务器后再执行导入。", "Configure a remote CPA server in Settings before starting this import.")}
          icon={Files}
          onClick={() => {
            setOpen(false);
            resetState();
            router.push("/settings");
          }}
        />
        <MethodCard
          title={t("从 Sub2API 服务器导入", "Import from a Sub2API server")}
          description={t("前往设置页面配置 Sub2API 服务器，再选择其中的 OpenAI 账号导入。", "Configure a Sub2API server in Settings, then choose the OpenAI accounts to import.")}
          icon={ServerCog}
          onClick={() => {
            setOpen(false);
            resetState();
            router.push("/settings");
          }}
        />
      </div>
    );
  };

  const footerDisabled = disabled || isSubmitting;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <Button
          className="h-10 rounded-xl bg-stone-950 px-4 text-white hover:bg-stone-800"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <Upload className="size-4" />
          {t("导入", "Import")}
        </Button>
        <DialogContent showCloseButton={false} className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>
              {method === "menu"
                ? t("导入账户", "Import accounts")
                : method === "token"
                  ? t("导入 Access Token", "Import access tokens")
                  : method === "session"
                    ? t("导入 Session JSON", "Import session JSON")
                    : t("导入 CPA JSON", "Import CPA JSON")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {method === "menu"
                ? t("选择一种导入方式。导入成功后会自动拉取邮箱、类型和额度。", "Choose an import method. After a successful import, email, type, and quota are refreshed automatically.")
                : method === "token"
                  ? t("支持手动粘贴或从 TXT 文件导入，一行一个 Token。", "Paste tokens manually or import them from a TXT file, one per line.")
                  : method === "session"
                    ? t("粘贴完整 Session JSON，系统会自动提取 accessToken。", "Paste the full session JSON and the system will extract accessToken automatically.")
                    : t("支持一次读取多个本地 JSON 文件，并在提交前做数量确认。", "Read multiple local JSON files at once and confirm the count before submitting.")}
            </DialogDescription>
          </DialogHeader>

          {renderMethodBody()}

          <DialogFooter className="pt-2">
            <Button
              variant="secondary"
              className="h-10 rounded-xl bg-stone-100 px-5 text-stone-700 hover:bg-stone-200"
              onClick={() => setOpen(false)}
              disabled={footerDisabled}
            >
              {t("取消", "Cancel")}
            </Button>
            {method === "token" ? (
              <Button
                className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800"
                onClick={() => void handleImportTokenText()}
                disabled={footerDisabled}
              >
                {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {t("导入 Token", "Import tokens")}
              </Button>
            ) : null}
            {method === "session" ? (
              <Button
                className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800"
                onClick={() => void handleImportSessionJson()}
                disabled={footerDisabled}
              >
                {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {t("导入 JSON", "Import JSON")}
              </Button>
            ) : null}
            {method === "cpa" ? (
              <Button
                className={cn(
                  "h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800",
                  !pendingCpaImport ? "hidden" : "",
                )}
                onClick={() => setConfirmOpen(true)}
                disabled={footerDisabled || !pendingCpaImport}
              >
                {t("查看导入确认", "Review import")}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="rounded-2xl p-6">
            <DialogHeader className="gap-2">
            <DialogTitle>{t("确认导入 CPA Token", "Confirm CPA token import")}</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {pendingCpaImport
                ? t(`确认识别到 ${pendingCpaImport.parsedFileCount} 个 Token，是否确认导入？`, `Detected ${pendingCpaImport.parsedFileCount} tokens. Continue importing?`)
                : t("尚未读取到可导入的 Token。", "No importable tokens have been read yet.")}
              {pendingCpaImport?.errorCount
                ? t(`，另有 ${pendingCpaImport.errorCount} 个文件未提取成功。`, ` ${pendingCpaImport.errorCount} files also failed to parse.`)
                : "。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="secondary"
              className="h-10 rounded-xl bg-stone-100 px-5 text-stone-700 hover:bg-stone-200"
              onClick={() => setConfirmOpen(false)}
              disabled={isSubmitting}
            >
              {t("返回", "Back")}
            </Button>
            <Button
              className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800"
              onClick={() =>
                void submitTokens(
                  pendingCpaImport?.tokens ?? [],
                  t("CPA JSON 导入完成", "CPA JSON import complete"),
                  pendingCpaImport?.accounts ?? [],
                )
              }
              disabled={isSubmitting || !pendingCpaImport}
            >
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {t("确认导入", "Confirm import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
