// Node resolve hook: extensionless relative imports -> .ts (for validate script).
import { existsSync } from "node:fs";

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    const isRel = specifier.startsWith("./") || specifier.startsWith("../");
    if (isRel && !/\.[a-z]+$/i.test(specifier)) {
      for (const ext of [".ts", ".tsx"]) {
        try {
          const url = new URL(specifier + ext, context.parentURL);
          if (existsSync(url)) return { url: url.href, shortCircuit: true };
        } catch {
          /* ignore */
        }
      }
    }
    throw err;
  }
}
