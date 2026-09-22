import pc from "picocolors";

export interface DiffLine {
  type: "add" | "del" | "same" | "header";
  text: string;
}

export function generateDiff(
  filePath: string,
  oldContent: string,
  newContent: string
): string {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const output: string[] = [];
  output.push(pc.bold(pc.cyan(`--- ${filePath}`)));
  output.push(pc.bold(pc.cyan(`+++ ${filePath}`)));

  // Simple and clean line-by-line diff for header injections
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (
      oldIndex < oldLines.length &&
      newIndex < newLines.length &&
      oldLines[oldIndex] === newLines[newIndex]
    ) {
      output.push(pc.dim(`  ${oldLines[oldIndex]}`));
      oldIndex++;
      newIndex++;
    } else if (newIndex < newLines.length && !oldLines.includes(newLines[newIndex])) {
      output.push(pc.green(`+ ${newLines[newIndex]}`));
      newIndex++;
    } else if (oldIndex < oldLines.length && !newLines.includes(oldLines[oldIndex])) {
      output.push(pc.red(`- ${oldLines[oldIndex]}`));
      oldIndex++;
    } else {
      // Fallback
      if (newIndex < newLines.length) {
        output.push(pc.green(`+ ${newLines[newIndex]}`));
        newIndex++;
      }
      if (oldIndex < oldLines.length) {
        output.push(pc.red(`- ${oldLines[oldIndex]}`));
        oldIndex++;
      }
    }
  }

  return output.join("\n");
}
