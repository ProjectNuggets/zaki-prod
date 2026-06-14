import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  email: string;
  onDisplayNameChange: (name: string) => void;
  themePreference: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onSave: () => void | Promise<void>;
  onAccountDeleted: () => void;
  saving?: boolean;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const navigate = useNavigate();
  const routedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      routedRef.current = false;
      return;
    }
    if (routedRef.current) return;
    routedRef.current = true;
    navigate("/settings");
    onClose();
  }, [isOpen, navigate, onClose]);

  return null;
}
