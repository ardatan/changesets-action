import unified from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
// @ts-ignore
import mdastToString from "mdast-util-to-string";
import { getPackages, Package } from "@manypkg/get-packages";

export const BumpLevels = {
  dep: 0,
  patch: 1,
  minor: 2,
  major: 3,
} as const;

export async function getVersionsByDirectory(cwd: string) {
  let { packages } = await getPackages(cwd);
  return new Map(packages.map((x) => [x.dir, x.packageJson.version]));
}

export async function getChangedPackages(
  cwd: string,
  previousVersions: Map<string, string>
) {
  let { packages } = await getPackages(cwd);
  let changedPackages = new Set<Package>();

  for (let pkg of packages) {
    const previousVersion = previousVersions.get(pkg.dir);
    if (previousVersion !== pkg.packageJson.version) {
      changedPackages.add(pkg);
    }
  }

  return [...changedPackages];
}

export function getChangelogEntry(changelog: string, version: string) {
  let ast = unified().use(remarkParse).parse(changelog);

  let highestLevel: number = BumpLevels.dep;

  let nodes = ast.children as Array<any>;
  let headingStartInfo:
    | {
        index: number;
        depth: number;
      }
    | undefined;
  let endIndex: number | undefined;

  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node.type === "heading") {
      let stringified: string = mdastToString(node);
      let match = stringified.toLowerCase().match(/(major|minor|patch)/);
      if (match !== null) {
        let level = BumpLevels[match[0] as "major" | "minor" | "patch"];
        highestLevel = Math.max(level, highestLevel);
      }
      if (headingStartInfo === undefined && stringified === version) {
        headingStartInfo = {
          index: i,
          depth: node.depth,
        };
        continue;
      }
      if (
        endIndex === undefined &&
        headingStartInfo !== undefined &&
        headingStartInfo.depth === node.depth
      ) {
        endIndex = i;
        break;
      }
    }
  }
  if (headingStartInfo) {
    ast.children = (ast.children as any).slice(
      headingStartInfo.index + 1,
      endIndex
    );
  }
  return {
    content: unified().use(remarkStringify).stringify(ast),
    highestLevel: highestLevel,
  };
}

export function sortTheThings(
  a: { private: boolean; highestLevel: number },
  b: { private: boolean; highestLevel: number }
) {
  if (a.private === b.private) {
    return b.highestLevel - a.highestLevel;
  }
  if (a.private) {
    return 1;
  }
  return -1;
}

// Strip CSI sequences (colors, cursor moves from publish spinners, etc.)
const ANSI_REGEX = /\u001b\[[0-9;]*[A-Za-z]/g;
// Scoped or unscoped package name + version (changesets CLI v3 publish lines).
// Disallow `/` in name segments so path-like `packages/foo@1.2.3` is not matched.
const NAME_AT_VERSION_REGEX = /^(@[^/\s]+\/[^@/\s]+|[^@/\s]+)@([^\s]+)$/;

/**
 * Detect a published package from a single line of `changeset publish` stdout.
 * Supports legacy CLI v2 (`New tag:` / `Publishing "…" at "…"`) and CLI v3
 * (`Successfully published:` followed by bare `name@version` lines).
 */
export function extractPublishedPackages(
  line: string
): { name: string; version: string } | null {
  const cleaned = line.replace(ANSI_REGEX, "").trim();

  let newTagRegex = /New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/;
  let match = cleaned.match(newTagRegex);

  if (match === null) {
    let npmOutRegex = /Publishing "(.*?)" at "(.*?)"/;
    match = cleaned.match(npmOutRegex);
  }

  // @changesets/cli v3 prints:
  //   Successfully published:
  //   @scope/pkg@1.2.3
  //   pkg@1.2.3
  if (match === null) {
    match = cleaned.match(NAME_AT_VERSION_REGEX);
  }

  if (match) {
    const [, name, version] = match;
    return { name, version };
  }

  return null;
}
