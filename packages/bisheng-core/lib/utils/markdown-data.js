const fs = require('fs');
const path = require('path');
const R = require('ramda');

function ensureToBeArray(maybeArray) {
  return Array.isArray(maybeArray) ?
    maybeArray : [maybeArray];
}

function isDirectory(filename) {
  return fs.statSync(filename).isDirectory();
}

function findMDFile(source, isMDFile) {
  return R.pipe(
    R.filter(R.either(isDirectory, isMDFile)),
    R.chain((filename) => {
      if (isDirectory(filename)) {
        const subFiles = fs.readdirSync(filename)
                .map((subFile) => path.join(filename, subFile));
        return findMDFile(subFiles, isMDFile);
      }
      return [filename];
    })
  )(source);
}

function filesToTreeStructure(files) {
  return files.reduce((filesTree, filename) => {
    const propLens = R.lensPath(filename.split(path.sep));
    return R.set(propLens, filename, filesTree);
  }, {});
}

function stringifyObject(obj, depth) {
  const indent = '  '.repeat(depth);
  const kvStrings = R.pipe(
    R.toPairs,
    /* eslint-disable no-use-before-define */
    R.map((kv) => `${indent}  '${kv[0].replace(/\.md$/, '')}': ${stringify(kv[1], depth + 1)},`)
    /* eslint-enable no-use-before-define */
  )(obj);
  return kvStrings.join('\n');
}

function stringify(node, depth) {
  const indent = '  '.repeat(depth);
  return R.cond([
    [(n) => typeof n === 'object', (obj) =>
     `{\n${stringifyObject(obj, depth)}\n${indent}}`,
    ],
    [R.T, (filename) => `require('${path.join(process.cwd(), filename)}')`],
  ])(node);
}

exports.generate = R.useWith((source, extensions) => {
  function isMDFile(filename) {
    const ext = path.extname(filename);
    return !isDirectory(filename) && R.contains(ext, extensions);
  }

  const mds = findMDFile(source, isMDFile);
  const filesTree = filesToTreeStructure(mds);
  return filesTree;
}, [ensureToBeArray, ensureToBeArray]);

exports.stringify = (filesTree) => stringify(filesTree, 0);