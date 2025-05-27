const React = require("react");
const { LexicalComposer } = require("@lexical/react/LexicalComposer");
const { RichTextPlugin } = require("@lexical/react/LexicalRichTextPlugin");
const { ContentEditable } = require("@lexical/react/LexicalContentEditable");
const { HistoryPlugin } = require("@lexical/react/LexicalHistoryPlugin");
const { OnChangePlugin } = require("@lexical/react/LexicalOnChangePlugin");
const { $generateHtmlFromNodes, $generateNodesFromDOM } = require("@lexical/html");
const { useLexicalComposerContext } = require("@lexical/react/LexicalComposerContext");

function HtmlLoaderPlugin({ initialHtml }) {
  const [editor] = useLexicalComposerContext();
  React.useEffect(() => {
    if (initialHtml) {
      editor.update(() => {
        const parser = new window.DOMParser();
        const dom = parser.parseFromString(initialHtml, "text/html");
        const nodes = $generateNodesFromDOM(editor, dom.body);
        editor.setEditorState(editor.parseEditorState(() => {
          const root = editor._editorState._nodeMap.get('root');
          if (root) {
            root.clear();
            root.append(...nodes);
          }
        }));
      });
    }
  }, [editor, initialHtml]);
  return null;
}

module.exports = function LexicalEditor({ initialHtml, onSave }) {
  const editorStateRef = React.useRef(null);

  const initialConfig = {
    namespace: "MyEditor",
    theme: {},
    onError(error) {
      throw error;
    },
  };

  return React.createElement(
    LexicalComposer,
    { initialConfig },
    React.createElement(HtmlLoaderPlugin, { initialHtml }),
    React.createElement(RichTextPlugin, {
      contentEditable: React.createElement(ContentEditable, {
        style: { minHeight: 300, background: "#fff", color: "#000" }
      }),
      placeholder: React.createElement("div", null, "Type here...")
    }),
    React.createElement(HistoryPlugin, null),
    React.createElement(OnChangePlugin, {
      onChange: (editorState, editor) => {
        editorStateRef.current = { editorState, editor };
      }
    }),
    React.createElement("button", {
      style: { marginTop: 16 },
      onClick: async () => {
        if (editorStateRef.current) {
          const { editor } = editorStateRef.current;
          const html = await editor.getEditorState().read(() =>
            $generateHtmlFromNodes(editor)
          );
          onSave(html);
        }
      }
    }, "Save")
  );
};