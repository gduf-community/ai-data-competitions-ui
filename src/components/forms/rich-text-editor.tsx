"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { promptI18n } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";
import {
  sanitizeRichTextHref,
  sanitizeRichTextHtml,
} from "@/lib/security/html-sanitize";

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function normalizeHtml(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return sanitizeRichTextHtml(trimmed);
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = "请输入内容",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastSyncedValueRef = useRef(normalizeHtml(value));
  const isComposingRef = useRef(false);

  const emitEditorValue = (nextValue: string) => {
    lastSyncedValueRef.current = nextValue;
    onChange(nextValue);
  };

  const commitEditor = (
    editor: HTMLDivElement,
    options?: { sanitizeDom?: boolean },
  ) => {
    const sanitizeDom = options?.sanitizeDom ?? false;
    const nextValue = sanitizeDom ? normalizeHtml(editor.innerHTML) : editor.innerHTML;

    if (sanitizeDom && nextValue !== editor.innerHTML) {
      editor.innerHTML = nextValue;
    }

    emitEditorValue(nextValue);
  };

  const insertHtmlAtCursor = (editor: HTMLDivElement, html: string) => {
    editor.focus();

    if (typeof document.execCommand === "function") {
      const inserted = document.execCommand("insertHTML", false, html);
      if (inserted) {
        return;
      }
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editor.insertAdjacentHTML("beforeend", html);
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const fragment = range.createContextualFragment(html);
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);

    if (!lastNode) return;

    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const insertSanitizedHtml = (rawHtml: string, rawText: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const source = rawHtml.trim()
      ? rawHtml
      : rawText
          .split(/\r?\n/)
          .map((line) => `<p>${line || "<br>"}</p>`)
          .join("");
    const sanitized = normalizeHtml(source);
    if (!sanitized) return;

    insertHtmlAtCursor(editor, sanitized);
    commitEditor(editor);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const normalized = normalizeHtml(value);
    if (editor.innerHTML !== normalized) {
      editor.innerHTML = normalized;
    }
    lastSyncedValueRef.current = normalized;
  }, [value]);

  const runCommand = (command: string, commandValue?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    if (typeof document.execCommand !== "function") {
      toast.error("当前浏览器暂不支持该编辑功能");
      return;
    }

    editor.focus();
    document.execCommand(command, false, commandValue);
    commitEditor(editor, { sanitizeDom: true });
  };

  return (
    <div className="rounded-lg border border-border/60">
      <div className="flex flex-wrap gap-2 border-b border-border/60 p-2">
        <Button type="button" size="sm" variant="outline" onClick={() => runCommand("bold")}>
          <Bold className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => runCommand("italic")}>
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => runCommand("underline")}
        >
          <Underline className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => runCommand("insertUnorderedList")}
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => runCommand("insertOrderedList")}
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const href = promptI18n("请输入链接地址（https://...）");
            if (!href) return;
            const sanitizedHref = sanitizeRichTextHref(href);
            if (!sanitizedHref) {
              toast.error("仅支持 http、https 或 mailto 链接");
              return;
            }
            runCommand("createLink", sanitizedHref);
          }}
        >
          <Link2 className="size-4" />
        </Button>
      </div>
      <div
        id={id}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onPaste={(event) => {
          const html = event.clipboardData?.getData("text/html") ?? "";
          const text = event.clipboardData?.getData("text/plain") ?? "";
          if (!html.trim() && !text.trim()) {
            window.setTimeout(() => {
              const editor = editorRef.current;
              if (!editor) return;
              commitEditor(editor, { sanitizeDom: true });
            }, 0);
            return;
          }

          event.preventDefault();
          insertSanitizedHtml(html, text);
        }}
        onDrop={(event) => {
          const html = event.dataTransfer?.getData("text/html") ?? "";
          const text = event.dataTransfer?.getData("text/plain") ?? "";
          if (!html.trim() && !text.trim()) {
            return;
          }

          event.preventDefault();
          insertSanitizedHtml(html, text);
        }}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={(event) => {
          isComposingRef.current = false;
          commitEditor(event.currentTarget as HTMLDivElement);
        }}
        onInput={(event) => {
          if (isComposingRef.current) return;
          commitEditor(event.currentTarget as HTMLDivElement);
        }}
        onBlur={(event) => {
          commitEditor(event.currentTarget as HTMLDivElement, { sanitizeDom: true });
        }}
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        className="min-h-44 overflow-x-auto break-words p-3 text-base leading-7 outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:break-all [&_img]:max-w-full [&_table]:block [&_table]:max-w-full md:text-sm"
      />
    </div>
  );
}
