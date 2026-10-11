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
  const lastSyncedValueRef = useRef<string | null>(null);
  const isComposingRef = useRef(false);
  const dirtyRef = useRef(false);
  const selectionRef = useRef<Range | null>(null);

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.startContainer) && editor.contains(range.endContainer)) selectionRef.current = range.cloneRange();
  };

  const restoreSelection = (editor: HTMLDivElement) => {
    const range = selectionRef.current;
    editor.focus();
    if (range && editor.contains(range.startContainer) && editor.contains(range.endContainer)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const emitEditorValue = (nextValue: string) => {
    lastSyncedValueRef.current = nextValue;
    onChange(nextValue);
  };

  const commitEditor = (editor: HTMLDivElement) => {
    if (editor.innerHTML !== lastSyncedValueRef.current) dirtyRef.current = true;
    saveSelection();
    emitEditorValue(editor.innerHTML);
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
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return;
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
          .map((line) => `<p>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || "<br>"}</p>`)
          .join("");
    const sanitized = normalizeHtml(source);
    if (!sanitized) return;

    insertHtmlAtCursor(editor, sanitized);
    commitEditor(editor);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isComposingRef.current || value === lastSyncedValueRef.current) return;

    if (dirtyRef.current) {
      toast.error("编辑内容已保留。外部更新请重新打开并核对。");
      return;
    }

    const normalized = normalizeHtml(value);
    if (editor.innerHTML !== normalized) {
      editor.innerHTML = normalized;
    }
    lastSyncedValueRef.current = value;
  }, [value]);

  const runCommand = (command: string, commandValue?: string) => {
    const editor = editorRef.current;
    if (!editor || isComposingRef.current) return;

    if (typeof document.execCommand !== "function") {
      toast.error("当前浏览器暂不支持该编辑功能");
      return;
    }

    restoreSelection(editor);
    document.execCommand(command, false, commandValue);
    commitEditor(editor);
  };

  return (
    <div className="rounded-lg border border-border/60">
      <div role="toolbar" aria-label="正文格式" className="flex flex-wrap gap-2 border-b border-border/60 p-2" onMouseDown={event => { saveSelection(); event.preventDefault(); }}>
        <Button aria-label="粗体" type="button" size="sm" variant="outline" onClick={() => runCommand("bold")}>
          <Bold className="size-4" />
        </Button>
        <Button aria-label="斜体" type="button" size="sm" variant="outline" onClick={() => runCommand("italic")}>
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => runCommand("underline")}
          aria-label="下划线"
        >
          <Underline className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => runCommand("insertUnorderedList")}
          aria-label="无序列表"
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => runCommand("insertOrderedList")}
          aria-label="有序列表"
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="插入链接"
          onClick={() => {
            if (isComposingRef.current) return;
            saveSelection();
            const href = promptI18n("请输入链接地址（https://...）");
            if (!href) { if (editorRef.current) restoreSelection(editorRef.current); return; }
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
          event.preventDefault();
          if (isComposingRef.current) return;
          insertSanitizedHtml(html, text);
        }}
        onDrop={(event) => {
          const html = event.dataTransfer?.getData("text/html") ?? "";
          const text = event.dataTransfer?.getData("text/plain") ?? "";
          event.preventDefault();
          if (isComposingRef.current) return;
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
          if (isComposingRef.current || (event.nativeEvent as InputEvent).isComposing) return;
          commitEditor(event.currentTarget as HTMLDivElement);
        }}
        onBlur={(event) => {
          if (!isComposingRef.current) commitEditor(event.currentTarget as HTMLDivElement);
        }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        className="min-h-44 overflow-x-auto break-words p-3 text-base leading-7 outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:break-all [&_img]:max-w-full [&_table]:block [&_table]:max-w-full md:text-sm"
      />
    </div>
  );
}
