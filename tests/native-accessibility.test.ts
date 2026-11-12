import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

// Browser accessibility accepts values that Android's native setter rejects.
// Check against the installed RN Android implementation, not its broader TS type.
function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sources(path) : path.endsWith('.tsx') ? [path] : [];
  });
}

it('all literal accessibilityRole props are accepted by the installed Android native setter', () => {
  const kotlin = readFileSync('node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/uimanager/ReactAccessibilityDelegate.kt', 'utf8');
  const body = kotlin.match(/enum class AccessibilityRole\s*\{([\s\S]*?);/);
  expect(body, 'RN Android accessibility enum must be located before checking UI compatibility').not.toBeNull();
  const accepted = new Set(body![1].split(',').map(value => value.trim().toLowerCase()));
  // Guard against accidentally matching the separate ARIA Role enum.
  expect(accepted.has('button')).toBe(true);
  expect(accepted.has('status')).toBe(false);
  const failures: string[] = [];
  for (const path of ['App.tsx', ...sources('src')]) {
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node) {
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'accessibilityRole' && node.initializer) {
        const value = ts.isStringLiteral(node.initializer) ? node.initializer.text
          : ts.isJsxExpression(node.initializer) && node.initializer.expression && ts.isStringLiteral(node.initializer.expression)
            ? node.initializer.expression.text : null;
        if (value && !accepted.has(value.toLowerCase())) {
          const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          failures.push(`${path}:${line} accessibilityRole=${value}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(failures, 'Unsupported props can throw on Android even when web tests pass').toEqual([]);
});
