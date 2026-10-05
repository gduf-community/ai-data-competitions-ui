"use client";

import type { ReactNode } from "react";
import {
  toast as sonnerToast,
  type ExternalToast,
} from "sonner";

import { getClientLocale, translateText } from "@/lib/i18n";

type ToastMessage = Parameters<typeof sonnerToast>[0];
type ToastDescription = ExternalToast["description"];

function translateTextNode(value: ReactNode): ReactNode {
  if (typeof value !== "string") {
    return value;
  }

  return translateText(value, getClientLocale());
}

function translateNode(value: ToastMessage): ToastMessage {
  if (typeof value === "function") {
    return () => translateTextNode(value());
  }

  return translateTextNode(value);
}

function translateDescription(value: ToastDescription): ToastDescription {
  if (typeof value === "function") {
    return () => translateTextNode(value());
  }

  return translateTextNode(value);
}

function translateToastOptions(data?: ExternalToast) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    description: translateDescription(data.description),
  } satisfies ExternalToast;
}

export const toast = Object.assign(
  (message: ToastMessage, data?: ExternalToast) =>
    sonnerToast(translateNode(message), translateToastOptions(data)),
  sonnerToast,
  {
    success(message: Parameters<typeof sonnerToast.success>[0], data?: ExternalToast) {
      return sonnerToast.success(translateNode(message), translateToastOptions(data));
    },
    error(message: Parameters<typeof sonnerToast.error>[0], data?: ExternalToast) {
      return sonnerToast.error(translateNode(message), translateToastOptions(data));
    },
    info(message: Parameters<typeof sonnerToast.info>[0], data?: ExternalToast) {
      return sonnerToast.info(translateNode(message), translateToastOptions(data));
    },
    warning(message: Parameters<typeof sonnerToast.warning>[0], data?: ExternalToast) {
      return sonnerToast.warning(translateNode(message), translateToastOptions(data));
    },
    loading(message: Parameters<typeof sonnerToast.loading>[0], data?: ExternalToast) {
      return sonnerToast.loading(translateNode(message), translateToastOptions(data));
    },
  },
) as typeof sonnerToast;
