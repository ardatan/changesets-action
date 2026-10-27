import {
  getChangelogEntry,
  BumpLevels,
  sortTheThings,
  extractPublishedPackages,
} from "./utils";

let changelog = `# @keystone-alpha/email

## 3.0.1

### Patch Changes

- [19fe6c1b](https://github.com/keystonejs/keystone-5/commit/19fe6c1b):

  Move frontmatter in docs into comments

## 3.0.0

### Major Changes

- [2164a779](https://github.com/keystonejs/keystone-5/commit/2164a779):

  - Replace jade with pug because Jade was renamed to Pug, and \`jade\` package is outdated

### Patch Changes

- [81dc0be5](https://github.com/keystonejs/keystone-5/commit/81dc0be5):

  - Update dependencies

## 2.0.0

- [patch][b69fb9b7](https://github.com/keystonejs/keystone-5/commit/b69fb9b7):

  - Update dev devependencies

- [major][f97e4ecf](https://github.com/keystonejs/keystone-5/commit/f97e4ecf):

  - Export { emailSender } as the API, rather than a default export

## 1.0.2

- [patch][7417ea3a](https://github.com/keystonejs/keystone-5/commit/7417ea3a):

  - Update patch-level dependencies

## 1.0.1

- [patch][1f0bc236](https://github.com/keystonejs/keystone-5/commit/1f0bc236):

  - Update the package.json author field to "The Keystone Development Team"

## 1.0.0

- [major] 8b6734ae:

  - This is the first release of keystone-alpha (previously voussoir).
    All packages in the \`@voussoir\` namespace are now available in the \`@keystone-alpha\` namespace, starting at version \`1.0.0\`.
    To upgrade your project you must update any \`@voussoir/<foo>\` dependencies in \`package.json\` to point to \`@keystone-alpha/<foo>: "^1.0.0"\` and update any \`require\`/\`import\` statements in your code.

# @voussoir/email

## 0.0.2

- [patch] 113e16d4:

  - Remove unused dependencies

- [patch] 625c1a6d:

  - Update mjml-dependency
`;

test("it works", () => {
  let entry = getChangelogEntry(changelog, "3.0.0");
  expect(entry.content).toMatchSnapshot();
  expect(entry.highestLevel).toBe(BumpLevels.major);
});

test("it works", () => {
  let entry = getChangelogEntry(changelog, "3.0.1");
  expect(entry.content).toMatchSnapshot();
  expect(entry.highestLevel).toBe(BumpLevels.patch);
});

test("it sorts the things right", () => {
  let things = [
    {
      name: "a",
      highestLevel: BumpLevels.major,
      private: true,
    },
    {
      name: "b",
      highestLevel: BumpLevels.patch,
      private: false,
    },
    {
      name: "c",
      highestLevel: BumpLevels.major,
      private: false,
    },
  ];
  expect(things.sort(sortTheThings)).toMatchSnapshot();
});

describe("extractPublishedPackages", () => {
  it("parses legacy New tag lines", () => {
    expect(
      extractPublishedPackages(`🦋  New tag: @scope/pkg@1.2.3`)
    ).toEqual({ name: "@scope/pkg", version: "1.2.3" });
  });

  it("parses Publishing at lines", () => {
    expect(
      extractPublishedPackages(`Publishing "my-pkg" at "0.1.0"`)
    ).toEqual({ name: "my-pkg", version: "0.1.0" });
  });

  it("parses changesets CLI v3 bare name@version lines", () => {
    expect(extractPublishedPackages(`@graphql-tools/utils@13.2.0`)).toEqual({
      name: "@graphql-tools/utils",
      version: "13.2.0",
    });
    expect(extractPublishedPackages(`graphql-tools@10.0.7`)).toEqual({
      name: "graphql-tools",
      version: "10.0.7",
    });
  });

  it("strips ANSI codes before matching", () => {
    expect(
      extractPublishedPackages(`\u001b[1G\u001b[J@graphql-tools/load@9.1.0`)
    ).toEqual({ name: "@graphql-tools/load", version: "9.1.0" });
  });

  it("does not treat path-like lines as packages", () => {
    expect(extractPublishedPackages(`packages/foo@1.2.3`)).toBeNull();
  });

  it("ignores the Successfully published header", () => {
    expect(extractPublishedPackages(`Successfully published:`)).toBeNull();
  });
});
