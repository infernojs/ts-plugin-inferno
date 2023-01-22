import { sync as globSync } from "glob";
import { resolve, basename } from "path";
import { copy } from "fs-extra";

console.log("Updating test snapshots...")

globSync("tests/temp/*.jsx").map(filePath => {
  const referencePath = resolve("tests/references/" + basename(filePath));

  console.log(referencePath)

  copy(filePath, referencePath, err => {
    if (err) return console.error(err);

    console.log(`${basename(filePath)} successfully overwritten`);
  });
});

globSync("tests/tempES6/*.jsx").map(filePath => {
  const referencePath = resolve("tests/referencesES6/" + basename(filePath));

  console.log(referencePath)

  copy(filePath, referencePath, err => {
    if (err) return console.error(err);

    console.log(`${basename(filePath)} successfully overwritten`);
  });
});
