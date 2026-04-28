"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
// import { Github } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { LocaleSwitchButton } from "@/components/locale-switch-button";
import webConfig from "@/constants/common-env";
import { useAppLocale } from "@/i18n/locale";
import { clearStoredAuthSession, getStoredAuthSession, type StoredAuthSession } from "@/store/auth";
import { cn } from "@/lib/utils";

const adminNavItems = ["/image", "/accounts", "/register", "/image-manager", "/logs", "/settings"] as const;
const userNavItems = ["/image"] as const;

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isEnglish } = useAppLocale();
  const [session, setSession] = useState<StoredAuthSession | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (pathname === "/login") {
        if (!active) {
          return;
        }
        setSession(null);
        return;
      }

      const storedSession = await getStoredAuthSession();
      if (!active) {
        return;
      }
      setSession(storedSession);
    };

    void load();
    return () => {
      active = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    await clearStoredAuthSession();
    router.replace("/login");
  };

  if (pathname === "/login" || session === undefined || !session) {
    return null;
  }

  const navLabelMap: Record<(typeof adminNavItems)[number], string> = {
    "/image": isEnglish ? "Images" : "画图",
    "/accounts": isEnglish ? "Accounts" : "号池管理",
    "/register": isEnglish ? "Register" : "注册机",
    "/image-manager": isEnglish ? "Image Manager" : "图片管理",
    "/logs": isEnglish ? "Logs" : "日志管理",
    "/settings": isEnglish ? "Settings" : "设置",
  };

  const navItems = session.role === "admin" ? adminNavItems : userNavItems;
  const roleLabel = session.role === "admin" ? (isEnglish ? "Admin" : "管理员") : isEnglish ? "User" : "普通用户";
  const logoutLabel = isEnglish ? "Log out" : "退出";

  return (
    <header className="border-b border-stone-100/50">
      <div className="flex h-12 items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/image"
            className="py-1 text-[14px] font-bold tracking-tight text-stone-950 transition hover:text-stone-700 sm:text-[15px]"
          >
            chatgpt2api
          </Link>
          {/* <a
            href="https://github.com/basketikun/chatgpt2api"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 py-1 text-sm text-stone-400 transition hover:text-stone-700"
            aria-label="GitHub repository"
          >
            <Github className="size-4" /> 
            <span className="hidden md:inline">GitHub</span>
          </a>*/}
        </div>

        <div className="flex flex-1 justify-center gap-3 sm:gap-8">
          {navItems.map((item) => {
            const active = pathname === item;
            return (
              <Link
                key={item}
                href={item}
                className={cn(
                  "relative py-1 text-[13px] font-medium transition sm:text-[15px]",
                  active ? "font-semibold text-stone-950" : "text-stone-500 hover:text-stone-900",
                )}
              >
                {navLabelMap[item]}
                {active ? <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-stone-950" /> : null}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <LocaleSwitchButton className="h-8 rounded-lg border-stone-200 bg-white/85 px-3 text-stone-700" />
          <span className="hidden rounded-md bg-stone-100 px-2 py-1 text-[10px] font-medium text-stone-500 sm:inline-block sm:text-[11px]">
            {roleLabel}
          </span>
          <span className="hidden rounded-md bg-stone-100 px-2 py-1 text-[10px] font-medium text-stone-500 sm:inline-block sm:text-[11px]">
            v{webConfig.appVersion}
          </span>
          <button
            type="button"
            className="py-1 text-xs text-stone-400 transition hover:text-stone-700 sm:text-sm"
            onClick={() => void handleLogout()}
          >
            {logoutLabel}
          </button>
        </div>
      </div>
    </header>
  );
}
