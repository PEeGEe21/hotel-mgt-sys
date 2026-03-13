import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { ArrowDown, ArrowUp } from "@solar-icons/react";
import Image from "next/image";
import React from "react";
import { toast } from "sonner";
import { BoldBell, BoldChatLine, BoldCheckCircle } from "@/lib/iconJSX";

// Define toast types and their configurations
const TOAST_CONFIGS = {
  success: {
    title: "Success",
    defaultMessage: "Successful",
    iconBg: "bg-[#ADED221A] hover:bg-[#ADED221A]",
    iconShadow: "shadow-green-500/50",
    icon: BoldCheckCircle,
    iconColor: "text-[#ADED22]",
    isImageIcon: false,
  },
  error: {
    title: "Error",
    defaultMessage: "Something went wrong",
    iconBg: "bg-red-500/20 hover:bg-red-500/30",
    iconShadow: "shadow-red-500/50",
    icon: AlertCircle,
    iconColor: "text-red-400",
    isImageIcon: false,
  },
  info: {
    title: "Info",
    defaultMessage: "Info!!",
    iconBg: "bg-blue-500/20 hover:bg-blue-500/30",
    iconShadow: "shadow-blue-500/50",
    icon: AlertCircle,
    iconColor: "text-blue-400",
    isImageIcon: false,
  },
  warning: {
    title: "Warning",
    defaultMessage: "Warning!!",
    iconBg: "bg-yellow-500/20 hover:bg-yellow-500/30",
    iconShadow: "shadow-yellow-500/50",
    icon: AlertCircle,
    iconColor: "text-yellow-400",
    isImageIcon: false,
  },
  message: {
    title: "New Message",
    defaultMessage: "You've got a message",
    iconBg: "bg-[#2F2F2F] hover:bg-[#2F2F2F]",
    iconShadow: "shadow-blue-500/50",
    icon: BoldChatLine,
    iconColor: "text-[#ADED22]",
    isImageIcon: false,
  },
  default: {
    title: "Notification",
    defaultMessage: "",
    iconBg: "bg-[#ADED22] hover:bg-[#ADED22]",
    iconShadow: "shadow-gray-500/50",
    iconColor: "text-[#ADED22]", // Add color
    icon: BoldBell,
    isImageIcon: false,
  },
};

interface CustomToastProps {
  title: string;
  message: string;
  icon: React.ComponentType<any> | string;
  iconBg: string;
  iconShadow: string;
  iconColor?: string;
  isImageIcon?: boolean;
}

function CustomToast({
  title,
  message,
  icon,
  iconBg,
  iconShadow,
  iconColor = "text-white",
  isImageIcon = false,
}: CustomToastProps) {
  return (
    <div className="flex items-center gap-3 p-4 min-w-[303px] max-w-[400px]">
      {/* Icon Container */}
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
          iconBg,
          iconShadow
        )}
      >
        {isImageIcon ? (
          <div className="relative w-6 h-6">
            <Image
              src={icon as string}
              fill
              alt={title}
              className="object-contain"
              sizes="26px"
            />
          </div>
        ) : (
          React.createElement(icon as React.ComponentType<any>, {
            className: cn("w-6 h-6", iconColor),
          })
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-white leading-tight">
          {title}
        </h3>
        {message && (
          <p className="text-xs text-[#999999] mt-1 leading-tight">{message}</p>
        )}
      </div>
    </div>
  );
}

// Main toast function
export default function openToast(
  type: keyof typeof TOAST_CONFIGS,
  customMessage?: string
) {
  const config = TOAST_CONFIGS[type] || TOAST_CONFIGS.default;
  const message = customMessage || config.defaultMessage;

  return toast.custom(
    () => (
      <CustomToast
        title={config.title}
        message={message}
        icon={config.icon}
        iconBg={config.iconBg}
        iconShadow={config.iconShadow}
        iconColor={config.iconColor}
        isImageIcon={config.isImageIcon}
      />
    ),
    {
      duration: 4000,
      // You can add custom styling for the toast container here
      style: {
        background: "rgba(20, 20, 20, 0.95)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      },
    }
  );
}

// Usage examples:
// showToast('withdrawal', 'Your withdrawal is being processed');
// showToast('error', 'Failed to process transaction');
// showToast('bonus'); // Uses default message
