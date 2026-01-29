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
          toast: "group toast bg-white dark:bg-[#1f1a14] border-[#efe4d6] dark:border-[#3d3529] shadow-lg",
          title: "text-[#1f1a14] dark:text-[#faf6f0] font-medium",
          description: "text-[#655543] dark:text-[#a89a85]",
          success: "!bg-[#f3fbef] !border-[#d8e7d1] !text-[#2f6a36]",
          error: "!bg-[#fff3f0] !border-[#f6d5ce] !text-[#d24430]",
          warning: "!bg-[#fff8f0] !border-[#efe4d6] !text-[#88735A]",
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
