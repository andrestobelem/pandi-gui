import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(import.meta.dirname, "../..");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test("Developer can generate a readable HTML document from Markdown", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pandi-markdown-"));
  temporaryDirectories.push(directory);
  const markdownPath = join(directory, "guide.md");

  await writeFile(
    markdownPath,
    [
      "# Extension guide",
      "",
      "A **readable** artifact with [documentation](https://example.com/docs).",
      "",
      "## Installation",
      "",
      "```ts",
      "const answer = 42;",
      "```",
    ].join("\n"),
    "utf8",
  );

  await execFileAsync("npm", ["run", "docs:html", "--", markdownPath], {
    cwd: workspaceRoot,
  });

  const html = await readFile(join(directory, "guide.html"), "utf8");

  expect(html).toContain("<!doctype html>");
  expect(html).toContain("<title>Extension guide</title>");
  expect(html).toContain('<a href="#installation">Installation</a>');
  expect(html).toContain('<h2 id="installation">Installation</h2>');
  expect(html).toContain(
    'A <strong>readable</strong> artifact with <a href="https://example.com/docs">documentation</a>.',
  );
  expect(html).toContain('<code class="language-ts">const answer = 42;');
  expect(html).toContain("<style>");
});

test("generated HTML does not execute active content from Markdown", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pandi-markdown-"));
  temporaryDirectories.push(directory);
  const markdownPath = join(directory, "unsafe.md");
  await writeFile(
    markdownPath,
    [
      '<script>alert("unsafe")</script>',
      "",
      "[unsafe link](javascript:alert(1))",
      "",
      "![unsafe image](javascript:alert(2))",
    ].join("\n"),
    "utf8",
  );

  await execFileAsync("npm", ["run", "docs:html", "--", markdownPath], {
    cwd: workspaceRoot,
  });

  const html = await readFile(join(directory, "unsafe.html"), "utf8");
  expect(html).not.toContain('<script>alert("unsafe")</script>');
  expect(html).toContain(
    "&lt;script&gt;alert(&quot;unsafe&quot;)&lt;/script&gt;",
  );
  expect(html).not.toContain('href="javascript:');
  expect(html).not.toContain('src="javascript:');
});

test("Developer receives a useful error for a non-Markdown input", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pandi-markdown-"));
  temporaryDirectories.push(directory);
  const textPath = join(directory, "notes.txt");
  await writeFile(textPath, "Plain text", "utf8");

  await expect(
    execFileAsync("npm", ["run", "docs:html", "--", textPath], {
      cwd: workspaceRoot,
    }),
  ).rejects.toMatchObject({
    stderr: expect.stringContaining(
      "La entrada debe tener extensión .md o .markdown",
    ),
  });
});
