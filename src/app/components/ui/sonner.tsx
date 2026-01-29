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
          toast: "group toast bg-white dark:bg-zaki-primary border-zaki dark:border-zaki-dark shadow-lg",
          title: "text-zaki-primary dark:text-zaki-primary font-medium",
          description: "text-zaki-secondary dark:text-zaki-dark-muted",
          success: "!bg-zaki-success !border-zaki-strong !text-zaki-success",
          error: "!bg-zaki-error !border-zaki-strong !text-zaki-brand",
          warning: "!bg-zaki-base !border-zaki !text-zaki-muted",
          info: "!bg-zaki-info !border-zaki-info !text-zaki-info",
        },
      }}
      position="bottom-right"
      richColors
      {...props}
    />
  );
};

export { Toaster };
