// adapted from https://github.com/jonathantneal/postcss-advanced-variables
import postcss, { list } from 'postcss';
import path from 'path';
// import transformNode from './transform-node';
import manageUnresolved from './manageUnresolved';

const processor = postcss();

// transform @import at-rules
export default function transformImportAtRule(rule, opts) {
  // @import options
  const { id, alias, cwf, cwd } = getImportOpts(rule, opts);

  const cwds = [cwd].concat(opts.importPaths);

  // promise the resolved file and its contents using the file resolver
  const importPromise = cwds.reduce(
    (promise, thiscwd) =>
      promise.catch(() => opts.importResolve(id, thiscwd, opts)),
    Promise.reject()
  );

  opts.importPromise.push(
    importPromise.then(
      // promise the processed file
      ({ file, contents }) =>
        processor.process(contents, { from: file }).then(({ root }) => {
          // push a dependency message
          opts.result.messages.push({
            type: 'dependency',
            file,
            parent: cwf,
          });

          // imported nodes
          const nodes = root.nodes.slice(0);

          // replace the @import at-rule with the imported nodes
          // TODO change to an append?
          rule.replaceWith(nodes);

          // transform all nodes from the import
          // transformNode({ nodes }, opts);
          getNodesArray(nodes).forEach(child => {
            if (
              child.type === 'atrule' &&
              child.name.toLowerCase() === 'import'
            ) {
              transformImportAtRule(child, opts);
            }
          });
          // nodes.walkAtRules('import', childRule => {
          //   transformImportAtrule(childRule, opts);
          // });
        }),
      e => {
        console.log(e, e.message);
        // otherwise, if the @import could not be found
        manageUnresolved(
          rule,
          opts,
          '@import',
          `Could not resolve the @import for "${id}"`
        );
      }
    )
  );
}

// return the @import statement options/details
function getImportOpts(node, opts) {
  const [rawid, ...alias] = list.space(node.params);
  const id = trimWrappingURL(rawid);

  // current working file and directory
  const cwf =
    node.source && node.source.input && node.source.input.file ||
    opts.result.from;
  const cwd = cwf ? path.dirname(cwf) : opts.importRoot;

  return { id, alias, cwf, cwd: cwd || process.cwd() };
}

// return a string with the wrapping url() and quotes trimmed
function trimWrappingURL(string) {
  return trimWrappingQuotes(string.replace(/^url\(([\W\w]*)\)$/, '$1'));
}

// return a string with the wrapping quotes trimmed
function trimWrappingQuotes(string) {
  return string.replace(/^("|')([\W\w]*)\1$/, '$2');
}

function getNodesArray(node) {
  return Array.from(Object(node).nodes || []);
}
