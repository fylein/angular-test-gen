#! /usr/bin/env node
import { parse } from "@babel/parser";
import { traverse } from "@babel/core";
import inquirer from "inquirer";
import gradient from "gradient-string";
import chalk from "chalk";
import { readFileSync, writeFile } from "fs";
import * as ejs from "ejs";
import path from "path";
import * as prettier from "prettier";

function generateTest(filepath) {
  const code = readFileSync(filepath, "utf-8", (err, data) => {
    if (err) {
      console.log(err);
    }
    return data.toString();
  });

  let className = "";
  let fnNames = [];
  let spyList = [];
  let importList = [];
  let declareSpyList = [];

  const ast = parse(code, {
    plugins: ["typescript", "decorators", "throwExpressions"],
    sourceType: "module",
  });

  traverse(ast, {
    ClassDeclaration(path) {
      if (path.node.type === "ClassDeclaration") {
        className = path.node.id.name;
      }
    },
    ClassMethod(path) {
      if (
        path.node.type === "ClassMethod" &&
        path.node.kind !== "get" &&
        path.node.kind !== "set" &&
        path.node.kind !== "constructor"
      ) {
        if (!path.node.key.name.includes("ng")) {
          fnNames.push(path.node.key.name);
        }
      }

      if (
        path.node.type === "ClassMethod" &&
        path.node.kind === "constructor"
      ) {
        path.node.params.forEach((param) => {
          spyList.push(
            param.parameter.typeAnnotation.typeAnnotation.typeName.name
          );
        });
        path.node.params.forEach((param) => {
          declareSpyList.push({
            var: param.parameter.name,
            type: param.parameter.typeAnnotation.typeAnnotation.typeName.name,
          });
        });
      }
    },
    ImportDeclaration(path) {
      if (path.node.type === "ImportDeclaration") {
        if (path.node.specifiers.length === 1) {
          if (path.node.specifiers[0].imported.name === className) {
            importList.push({
              import: path.node.specifiers[0].imported.name,
              source: path.node.source.value,
            });
          }
          importList.push({
            import: path.node.specifiers[0].local.name,
            source: path.node.source.value.trim(),
          });
        }
      }
    },
  });

  const newImportList = importList.filter((imp) =>
    spyList.includes(imp.import)
  );

  const template = path.join("./templates/test-component.ejs");
  const data = {
    fnNames: fnNames,
    className: className,
    importList: newImportList,
    declareSpyList: declareSpyList,
  };

  ejs.renderFile(template, data, {}, (err, data) => {
    if (err) {
      console.log(err);
    }

    if (data) {
      console.log(data);
      const formatted = prettier.format(data, {
        parser: "typescript",

      });
      console.log(formatted);

      writeFile(filepath.replace(".ts", ".spec.ts"), formatted, (err) => {
        if (err) {
          console.log(err);
        }
        console.log(chalk.bgGreen("File written successfully"));
      });
    }
  });
}

function main() {
  console.log(gradient("orange", "yellow", "red")("Angular Test Generator"));
  inquirer
    .prompt([
      {
        name: "filepath",
        message: "What is the absolute path to the file?",
        type: "input",
      },
    ])
    .then((answers) => {
      generateTest(answers.filepath);
    })
    .catch((err) => {
      if (err) {
        console.log(chalk.bgRed(err.message));
      }
    });
}

main();
