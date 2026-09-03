"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  indentOnInput,
  StreamLanguage,
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";

export type LatexSourceEditorHandle = {
  focusLine: (line: number) => void;
};

export const LatexSourceEditor = forwardRef<
  LatexSourceEditorHandle,
  {
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    onCompile?: () => void;
  }
>(function LatexSourceEditor({ value, onChange, readOnly = false, onCompile }, ref) {
  const editor = useRef<ReactCodeMirrorRef>(null);

  useImperativeHandle(ref, () => ({
    focusLine(line) {
      const view = editor.current?.view;
      if (!view) return;
      const target = Math.max(1, Math.min(line, view.state.doc.lines));
      const position = view.state.doc.line(target).from;
      view.dispatch({
        selection: { anchor: position },
        effects: EditorView.scrollIntoView(position, { y: "center" }),
      });
      view.focus();
    },
  }));

  return (
    <CodeMirror
      ref={editor}
      value={value}
      height="100%"
      theme="light"
      editable={!readOnly}
      basicSetup={false}
      onChange={onChange}
      extensions={[
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        foldGutter(),
        history(),
        indentOnInput(),
        bracketMatching(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        StreamLanguage.define(stex),
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onCompile?.();
              return true;
            },
          },
          ...searchKeymap,
          ...historyKeymap,
          indentWithTab,
          ...defaultKeymap,
        ]),
        EditorView.lineWrapping,
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { overflow: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
          ".cm-content": { padding: "12px 0" },
          "&.cm-focused": { outline: "none" },
        }),
      ]}
      className="h-full min-h-0 overflow-hidden rounded-lg border border-border bg-card"
    />
  );
});
