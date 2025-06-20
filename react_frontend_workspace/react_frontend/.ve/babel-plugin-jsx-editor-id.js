// babel-plugin-jsx-editor-enhancer.js

module.exports = function ({ types: t }) {
  return {
    visitor: {
      // Add data-editor-id to all JSX elements
      JSXOpeningElement(path, state) {
        if (!path.node.loc) {
          return; // skip nodes without location info
        }

        const file = state.file.opts.filename.replace(process.cwd(), "");
        const line = path.node.loc.start.line;

        const existingAttr = path.node.attributes.find(
          attr => attr.name && attr.name.name === "data-editor-id"
        );

        if (!existingAttr) {
          path.node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier("data-editor-id"),
              t.stringLiteral(`${file}::${line}`)
            )
          );
        }
      },

      // Inject EditorRootWrapper around root.render(<App />)
      Program(path, state) {
        const isEditMode = process.env.EDIT_MODE;

        if (!isEditMode) {
          return; // skip the wrapper transform if not in edit mode
        }

        let hasInsertedImport = false;

        path.traverse({
          CallExpression(callPath) {
            const callee = callPath.get('callee');

            if (
              callee.isMemberExpression() &&
              callee.get('object').isIdentifier({ name: 'root' }) &&
              callee.get('property').isIdentifier({ name: 'render' })
            ) {
              const args = callPath.get('arguments');
              if (args.length === 1 && args[0].isJSXElement()) {
                const appElement = args[0].node;

                if (!hasInsertedImport) {
                  const nodePath = require('path');

                  // Absolute path to the EditorRootWrapper file
                  const editorWrapperPath = nodePath.resolve(process.cwd(), '.ve', 'EditorRootWrapper.js');

                  // Path of the current file being transformed
                  const filePath = state.file.opts.filename;

                  // Compute relative path (without file extension)
                  let relativePath = nodePath.relative(nodePath.dirname(filePath), editorWrapperPath).replace(/\\/g, '/');
                  if (relativePath.endsWith('.js')) {
                    relativePath = relativePath.slice(0, -3);
                  }
                  if (!relativePath.startsWith('.')) {
                    relativePath = './' + relativePath;
                  }
                  console.log('Injecting EditorRootWrapper import:', relativePath);

                  const importDeclaration = t.importDeclaration(
                    [t.importDefaultSpecifier(t.identifier('EditorRootWrapper'))],
                    t.stringLiteral(relativePath)
                  );
                  path.node.body.unshift(importDeclaration);
                  hasInsertedImport = true;
                }

                const wrapped = t.jsxElement(
                  t.jsxOpeningElement(t.jsxIdentifier('EditorRootWrapper'), [], false),
                  t.jsxClosingElement(t.jsxIdentifier('EditorRootWrapper')),
                  [appElement],
                  false
                );

                args[0].replaceWith(wrapped);
              }
            }
          },
        });
      },
    },
  };
};
