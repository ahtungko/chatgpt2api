"use client";

import { AlertTriangle, LoaderCircle, Plus, Play, RotateCcw, Save, Square, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslate } from "@/i18n/locale";

import { useSettingsStore } from "../../settings/store";

export function RegisterCard() {
  const t = useTranslate();
  const config = useSettingsStore((state) => state.registerConfig);
  const isLoading = useSettingsStore((state) => state.isLoadingRegister);
  const isSaving = useSettingsStore((state) => state.isSavingRegister);
  const setProxy = useSettingsStore((state) => state.setRegisterProxy);
  const setTotal = useSettingsStore((state) => state.setRegisterTotal);
  const setThreads = useSettingsStore((state) => state.setRegisterThreads);
  const setMode = useSettingsStore((state) => state.setRegisterMode);
  const setTargetQuota = useSettingsStore((state) => state.setRegisterTargetQuota);
  const setTargetAvailable = useSettingsStore((state) => state.setRegisterTargetAvailable);
  const setCheckInterval = useSettingsStore((state) => state.setRegisterCheckInterval);
  const setMailField = useSettingsStore((state) => state.setRegisterMailField);
  const addProvider = useSettingsStore((state) => state.addRegisterProvider);
  const updateProvider = useSettingsStore((state) => state.updateRegisterProvider);
  const deleteProvider = useSettingsStore((state) => state.deleteRegisterProvider);
  const save = useSettingsStore((state) => state.saveRegister);
  const toggle = useSettingsStore((state) => state.toggleRegister);
  const reset = useSettingsStore((state) => state.resetRegister);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-stone-200 bg-white/80 p-10">
        <LoaderCircle className="size-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!config) return null;

  const stats = config.stats || { success: 0, fail: 0, done: 0, running: 0, threads: config.threads };
  const providers = config.mail.providers || [];
  const logs = config.logs || [];
  const updateProviderType = (index: number, type: string) => {
    updateProvider(index, {
      type,
      enable: true,
      ...(type === "cloudflare_temp_email" ? { api_base: "", admin_password: "", domain: [] } : {}),
      ...(type === "tempmail_lol" ? { api_key: "", domain: [] } : {}),
      ...(type === "moemail" ? { api_base: "", api_key: "", domain: [] } : {}),
      ...(type === "inbucket" ? { api_base: "", domain: [], random_subdomain: true } : {}),
      ...(type === "duckmail" ? { api_key: "", default_domain: "duckmail.sbs" } : {}),
      ...(type === "gptmail" ? { api_key: "", default_domain: "" } : {}),
      ...(type === "yyds_mail" ? { api_base: "https://maliapi.215.im/v1", api_key: "", domain: [], subdomain: "", wildcard: false } : {}),
    });
  };

  return (
    <div className="grid h-[calc(100vh-132px)] min-h-[640px] items-stretch gap-0 overflow-hidden rounded-xl border border-stone-200 bg-white/70 xl:grid-cols-2">
      <section className="space-y-4 overflow-y-auto border-b border-stone-200 p-4 xl:border-r xl:border-b-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-stone-100">
                <UserPlus className="size-5 text-stone-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{t("注册配置", "Register settings")}</h2>
              </div>
            </div>
            <Button className="h-9 rounded-xl bg-stone-950 px-4 text-white hover:bg-stone-800" onClick={() => void save()} disabled={isSaving || config.enabled}>
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              {t("保存配置", "Save settings")}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm text-stone-700">{t("注册模式", "Register mode")}</label>
              <Select value={config.mode || "total"} onValueChange={(value) => setMode(value as "total" | "quota" | "available")} disabled={config.enabled}>
                <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">{t("注册总数", "Total registrations")}</SelectItem>
                  <SelectItem value="quota">{t("号池剩余额度", "Remaining pool quota")}</SelectItem>
                  <SelectItem value="available">{t("可用账号数量", "Available account count")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">{t("注册总数", "Total registrations")}</label>
              <Input value={String(config.total)} onChange={(event) => setTotal(event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled || config.mode !== "total"} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">{t("线程数", "Threads")}</label>
              <Input value={String(config.threads)} onChange={(event) => setThreads(event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">{t("注册代理", "Register proxy")}</label>
              <Input value={config.proxy} onChange={(event) => setProxy(event.target.value)} placeholder="http://127.0.0.1:7890" className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">{t("目标剩余额度", "Target remaining quota")}</label>
              <Input value={String(config.target_quota || "")} onChange={(event) => setTargetQuota(event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled || config.mode !== "quota"} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">{t("目标可用账号", "Target available accounts")}</label>
              <Input value={String(config.target_available || "")} onChange={(event) => setTargetAvailable(event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled || config.mode !== "available"} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">{t("检查间隔（秒）", "Check interval (seconds)")}</label>
              <Input value={String(config.check_interval || "")} onChange={(event) => setCheckInterval(event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled || config.mode === "total"} />
            </div>
          </div>

          <div className="space-y-3 border-t border-stone-200 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-800">{t("邮箱配置", "Mail providers")}</h3>
                <p className="mt-1 text-xs text-stone-500">{t("可配置多个 provider，按启用顺序轮换。", "You can configure multiple providers and rotate through them in enabled order.")}</p>
              </div>
              <Button type="button" variant="outline" className="h-9 rounded-xl border-stone-200 bg-white px-3 text-stone-700" onClick={addProvider} disabled={config.enabled}>
                <Plus className="size-4" />
                {t("添加", "Add")}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm text-stone-700">{t("请求超时", "Request timeout")}</label>
                <Input value={String(config.mail.request_timeout || "")} onChange={(event) => setMailField("request_timeout", event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-stone-700">{t("等待验证码超时", "Verification wait timeout")}</label>
                <Input value={String(config.mail.wait_timeout || "")} onChange={(event) => setMailField("wait_timeout", event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-stone-700">{t("轮询间隔", "Polling interval")}</label>
                <Input value={String(config.mail.wait_interval || "")} onChange={(event) => setMailField("wait_interval", event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
              </div>
            </div>

            <div className="space-y-3">
              {providers.map((provider, index) => {
                const type = String(provider.type || "tempmail_lol");
                const domains = Array.isArray(provider.domain) ? provider.domain.map(String).join("\n") : "";
                return (
                  <div key={index} className="space-y-3 border-t border-stone-200 pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-3 text-sm text-stone-700">
                        <Checkbox checked={Boolean(provider.enable)} onCheckedChange={(checked) => updateProvider(index, { enable: Boolean(checked) })} disabled={config.enabled} />
                        {t("启用", "Enable")}
                      </label>
                      <button type="button" className="rounded-lg p-2 text-stone-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50" onClick={() => deleteProvider(index)} disabled={config.enabled || providers.length <= 1} title={t("删除 provider", "Delete provider")}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-stone-700">{t("类型", "Type")}</label>
                        <Select value={type} onValueChange={(value) => updateProviderType(index, value)} disabled={config.enabled}>
                          <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cloudflare_temp_email">cloudflare_temp_email</SelectItem>
                            <SelectItem value="tempmail_lol">tempmail_lol</SelectItem>
                            <SelectItem value="moemail">moemail</SelectItem>
                            <SelectItem value="inbucket">inbucket_mail</SelectItem>
                            <SelectItem value="duckmail">duckmail</SelectItem>
                            <SelectItem value="gptmail">{t("gptmail(未测试)", "gptmail (untested)")}</SelectItem>
                            <SelectItem value="yyds_mail">yyds_mail</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {type === "cloudflare_temp_email" || type === "moemail" || type === "inbucket" || type === "yyds_mail" ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm text-stone-700">API Base</label>
                            <Input value={String(provider.api_base || "")} onChange={(event) => updateProvider(index, { api_base: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                          </div>
                          {type === "cloudflare_temp_email" ? (
                            <div className="space-y-2">
                              <label className="text-sm text-stone-700">Admin Password</label>
                              <Input value={String(provider.admin_password || "")} onChange={(event) => updateProvider(index, { admin_password: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                            </div>
                          ) : null}
                        </>
                      ) : null}
                      {type === "inbucket" ? (
                        <label className="flex items-center gap-3 pt-8 text-sm text-stone-700">
                          <Checkbox checked={Boolean(provider.random_subdomain ?? true)} onCheckedChange={(checked) => updateProvider(index, { random_subdomain: Boolean(checked) })} disabled={config.enabled} />
                          启用随机子域名
                        </label>
                      ) : null}
                      {type === "tempmail_lol" || type === "moemail" || type === "duckmail" || type === "gptmail" || type === "yyds_mail" ? (
                        <div className="space-y-2">
                          <label className="text-sm text-stone-700">API Key</label>
                          <Input value={String(provider.api_key || "")} onChange={(event) => updateProvider(index, { api_key: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                        </div>
                      ) : null}
                      {type === "duckmail" || type === "gptmail" ? (
                        <div className="space-y-2">
                          <label className="text-sm text-stone-700">Default Domain</label>
                          <Input value={String(provider.default_domain || "")} onChange={(event) => updateProvider(index, { default_domain: event.target.value })} placeholder={type === "duckmail" ? "duckmail.sbs" : ""} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                        </div>
                      ) : null}
                      {type === "yyds_mail" ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm text-stone-700">Subdomain</label>
                            <Input value={String(provider.subdomain || "")} onChange={(event) => updateProvider(index, { subdomain: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                          </div>
                          <label className="flex items-center gap-3 pt-8 text-sm text-stone-700">
                            <Checkbox checked={Boolean(provider.wildcard)} onCheckedChange={(checked) => updateProvider(index, { wildcard: Boolean(checked) })} disabled={config.enabled} />
                            Wildcard
                          </label>
                        </>
                      ) : null}
                    </div>

                    {type === "tempmail_lol" || type === "cloudflare_temp_email" || type === "moemail" || type === "inbucket" || type === "yyds_mail" ? (
                      <div className="space-y-2">
                        <label className="text-sm text-stone-700">{type === "inbucket" ? t("基础域名列表", "Base domains") : "Domain"}</label>
                        <Textarea
                          value={domains}
                          onChange={(event) =>
                            updateProvider(index, {
                              domain: event.target.value
                                .split(/[\n,]/)
                                .map((item) => item.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder={
                            type === "inbucket"
                              ? t("每行一个基础域名，系统会自动生成随机子域名", "One base domain per line. Random subdomains will be generated automatically.")
                              : type === "moemail"
                              ? t("每行一个域名", "One domain per line")
                              : t(
                                  "每行一个域名，留空则使用服务默认域名",
                                  "One domain per line. Leave blank to use the provider default.",
                                )
                          }
                          className="min-h-20 rounded-xl border-stone-200 bg-white font-mono text-xs"
                          disabled={config.enabled}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

      </section>

      <section className="flex min-h-0 flex-col p-4">
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{t("运行结果", "Run status")}</h2>
                <p className="mt-1 text-sm text-stone-500">{t("SSE 实时推送当前状态。", "Current status is pushed in real time over SSE.")}</p>
              </div>
              <Badge variant={config.enabled ? "success" : "secondary"} className="rounded-md">
                {config.enabled ? t("运行中", "Running") : t("已停止", "Stopped")}
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                [t("成功 / 成功率", "Success / rate"), `${stats.success} / ${stats.success_rate || 0}%`],
                [t("失败", "Failed"), stats.fail],
                [t("完成", "Completed"), stats.done],
                [t("运行 / 线程", "Running / threads"), `${stats.running} / ${stats.threads}`],
                [t("运行时间", "Elapsed"), `${stats.elapsed_seconds || 0}s`],
                [t("平均注册单个", "Average per register"), `${stats.avg_seconds || 0}s`],
                [t("当前额度", "Current quota"), stats.current_quota || 0],
                [t("正常账号", "Available accounts"), stats.current_available || 0],
              ].map(([label, value]) => (
                <div key={label} className="border border-stone-200 bg-white/70 px-3 py-2">
                  <div className="text-xs text-stone-400">{label}</div>
                  <div className="mt-1 text-base font-semibold text-stone-800">{value}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button className="h-10 rounded-xl bg-stone-950 px-3 text-white hover:bg-stone-800" onClick={() => void toggle()} disabled={isSaving}>
                {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : config.enabled ? <Square className="size-4" /> : <Play className="size-4" />}
                {config.enabled ? t("停止", "Stop") : t("启动", "Start")}
              </Button>
              <Button variant="outline" className="h-10 rounded-xl border-stone-200 bg-white px-3 text-stone-700" onClick={() => void reset()} disabled={isSaving || config.enabled}>
                <RotateCcw className="size-4" />
                {t("重置", "Reset")}
              </Button>
              <Button variant="outline" className="h-10 rounded-xl border-stone-200 bg-white px-3 text-stone-700" onClick={() => void save()} disabled={isSaving || config.enabled}>
                <Save className="size-4" />
                {t("保存", "Save")}
              </Button>
            </div>
            <div className="flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="size-4 shrink-0" />
              {t("启动之前注意先保存配置。", "Remember to save the configuration before starting.")}
            </div>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden border-t border-stone-200 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{t("实时日志", "Live logs")}</h3>
                <p className="mt-1 text-xs text-stone-500">{t("只保留内存中的最近 300 条。", "Only the latest 300 in-memory entries are kept.")}</p>
                <p className="mt-1 text-xs text-amber-700">{t("遇到 HTTP 状态码 400 等错误，基本是邮箱滥用被封，需要更换新的域名邮箱。", "If HTTP 400 or similar errors appear, the email domain is likely blocked for abuse. Switch to a new domain mailbox.")}</p>
              </div>
              <Badge variant="secondary" className="rounded-md">
                {logs.length}
              </Badge>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto border border-stone-200 bg-white/70 p-3 font-mono text-xs leading-6">
              {logs.length === 0 ? (
                <div className="text-stone-500">{t("暂无日志", "No logs yet")}</div>
              ) : (
                logs.slice().reverse().map((item, index) => (
                  <div key={`${item.time}-${index}`} className={item.level === "red" ? "text-rose-600" : item.level === "green" ? "text-emerald-700" : item.level === "yellow" ? "text-amber-700" : "text-stone-700"}>
                    <span className="text-stone-400">{new Date(item.time).toLocaleTimeString()}</span>
                    <span className="pl-2">{item.text}</span>
                  </div>
                ))
              )}
            </div>
        </div>
      </section>
    </div>
  );
}
