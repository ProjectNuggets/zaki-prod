"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  // Check if dark mode is active via CSS class on html element
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  return (
    <Sonner
      theme={isDark ? "dark" : "light"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast bg-white dark:bg-zaki-primary border-zaki dark:border-[#3d3529] shadow-lg",
          title: "text-zaki-primary dark:text-[#faf6f0] font-medium",
          description: "text-zaki-secondary dark:text-[#a89a85]",
          success: "!bg-zaki-success !border-zaki-strong !text-zaki-success",
          error: "!bg-zaki-error !border-zaki-strong !text-zaki-brand",
          warning: "!bg-zaki-base !border-zaki !text-zaki-muted",
          info: "!bg-[#f0f8ff] !border-[#d6e7f5] !text-[#2563eb]",
        },
      }}
      position="bottom-right"
      richColors
      {...props}
    />
  );
};

export { Toaster };
