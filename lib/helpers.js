'use strict';

var util = require('util'),
    fs = require('fs'),
    path = require('path'),
    yaml = require('js-yaml'),
    merge = require('merge'),
    minimatch = require('minimatch');

/**
 * Easy access to the 'merge' library's cloning functionality
 * @param   {object} obj Object to clone
 * @returns {object}     Clone of obj
 */
var clone = function (obj) {
  return merge(true, obj);
};

var helpers = {};

helpers.log = function log (input) {
  console.log(util.inspect(input, false, null));
};

helpers.propertySearch = function (haystack, needle, property) {
  var length = haystack.length,
      i;

  for (i = 0; i < length; i++) {
    if (haystack[i][property] === needle) {
      return i;
    }
  }
  return -1;
};

helpers.isEqual = function (a, b) {
  var startLine = a.start.line === b.start.line ? true : false,
      endLine = a.end.line === b.end.line ? true : false,
      type = a.type === b.type ? true : false,
      length = a.content.length === b.content.length ? true : false;

  if (startLine && endLine && type && length) {
    return true;
  }
  else {
    return false;
  }
};

helpers.isUnique = function (results, item) {
  var search = this.propertySearch(results, item.line, 'line');

  if (search === -1) {
    return true;
  }
  else if (results[search].column === item.column && results[search].message === item.message) {
    return false;
  }
  else {
    return true;
  }
};

helpers.addUnique = function (results, item) {
  if (this.isUnique(results, item)) {
    results.push(item);
  }
  return results;
};

helpers.sortDetects = function (a, b) {
  if (a.line < b.line) {
    return -1;
  }
  if (a.line > b.line) {
    return 1;
  }
  if (a.line === b.line) {
    if (a.column < b.column) {
      return -1;
    }
    if (a.column > b.column) {
      return 1;
    }
    return 0;
  }
  return 0;
};

helpers.isNumber = function (val) {
  if (isNaN(parseInt(val, 10))) {
    return false;
  }
  return true;
};

helpers.isUpperCase = function (str) {
  var pieces = str.split(''),
      i,
      result = 0;

  for (i = 0; i < pieces.length; i++) {
    if (!helpers.isNumber(pieces[i])) {
      if (pieces[i] === pieces[i].toUpperCase() && pieces[i] !== pieces[i].toLowerCase()) {
        result++;
      }
      else {
        return false;
      }
    }
  }
  if (result) {
    return true;
  }
  return false;
};

helpers.isLowerCase = function (str) {
  var pieces = str.split(''),
      i,
      result = 0;

  for (i = 0; i < pieces.length; i++) {
    if (!helpers.isNumber(pieces[i])) {
      if (pieces[i] === pieces[i].toLowerCase() && pieces[i] !== pieces[i].toUpperCase()) {
        result++;
      }
      else {
        return false;
      }
    }
  }
  if (result) {
    return true;
  }
  return false;
};

/**
 * Determines if a given string adheres to camel-case format
 * @param   {string}  str String to test
 * @returns {boolean}     Whether str adheres to camel-case format
 */
helpers.isCamelCase = function (str) {
  return /^[a-z][a-zA-Z0-9]*$/.test(str);
};

/**
 * Determines if a given string adheres to hyphenated-lowercase format
 * @param   {string}  str String to test
 * @returns {boolean}     Whether str adheres to hyphenated-lowercase format
 */
helpers.isHyphenatedLowercase = function (str) {
  return !(/[^\-a-z0-9]/.test(str));
};

/**
 * Determines if a given string adheres to snake-case format
 * @param   {string}  str String to test
 * @returns {boolean}     Whether str adheres to snake-case format
 */
helpers.isSnakeCase = function (str) {
  return !(/[^_a-z0-9]/.test(str));
};

/**
 * Determines if a given string adheres to strict-BEM format
 * @param   {string}  str String to test
 * @returns {boolean}     Whether str adheres to strict-BEM format
 */
helpers.isStrictBEM = function (str) {
  return /^[a-z](\-?[a-z0-9]+)*(__[a-z0-9](\-?[a-z0-9]+)*)?((_[a-z0-9](\-?[a-z0-9]+)*){2})?$/.test(str);
};

/**
 * Determines if a given string adheres to hyphenated-BEM format
 * @param   {string}  str String to test
 * @returns {boolean}     Whether str adheres to hyphenated-BEM format
 */
helpers.isHyphenatedBEM = function (str) {
  return !(/[A-Z]|-{3}|_{3}|[^_]_[^_]/.test(str));
};

helpers.isValidHex = function (str) {
  if (str.match(/^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
    return true;
  }
  return false;
};

helpers.loadConfigFile = function (configPath) {
  var fileDir = path.dirname(configPath),
      fileName = path.basename(configPath),
      fileExtension = path.extname(fileName),
      filePath = path.join(__dirname, 'config', fileDir, fileName),
      file = fs.readFileSync(filePath, 'utf8') || false;

  if (file) {
    if (fileExtension === '.yml') {
      return yaml.safeLoad(file);
    }
  }

  return file;
};

helpers.hasEOL = function (str) {
  return /\r\n|\n/.test(str);
};

helpers.isEmptyLine = function (str) {
  return /(\r\n|\n){2}/.test(str);
};

helpers.stripQuotes = function (str) {
  return str.substring(1, str.length - 1);
};

helpers.stripPrefix = function (str) {
  var modProperty = str.slice(1),
      prefixLength = modProperty.indexOf('-');

  return modProperty.slice(prefixLength + 1);
};

/**
 * Removes the trailing space from a string
 * @param {string} curSelector - the current selector string
 * @returns {string} curSelector - the current selector minus any trailing space.
 */

helpers.stripLastSpace = function (selector) {

  if (selector.charAt(selector.length - 1) === ' ') {
    return selector.substr(0, selector.length - 1);

  }

  return selector;

};

/**
 * Scans through our selectors and keeps track of the order of selectors and delimiters
 * @param {object} selector - the current selector tree from our AST
 * @returns {array} mappedElements - an array / list representing the order of selectors and delimiters encountered
 */

helpers.mapDelims = function (val) {

  if (val.type === 'simpleSelector') {
    return 's';
  }

  if (val.type === 'delimiter') {
    return 'd';
  }

  return false;
};

/**
 * Constructs a syntax complete selector
 * @param {object} node - the current node / part of our selector
 * @returns {object} constructedSelector - The constructed selector
 * @returns {string} constructedSelector.content - The selector string
 * @returns {string} constructedSelector.type - The type of the selector
 */
helpers.constructSelector = function (node) {
  var content = node.content,
      type = '';

  if (node.type === 'id') {
    content = '#' + node.content;
    type = 'id';
  }

  else if (node.type === 'class') {
    content = '.' + node.content;
    type = 'class';
  }

  else if (node.type === 'ident') {
    content = node.content;
    type = 'selector';
  }

  else if (node.type === 'attribute') {
    var selector = '[';

    node.forEach(function (attrib) {
      var selectorPiece = helpers.constructSelector(attrib);

      selector += selectorPiece.content;
    });

    content = selector + ']';
    type = 'attribute';
  }

  else if (node.type === 'pseudoClass') {
    content = ':' + node.content;
    type = 'pseudoClass';
  }

  else if (node.type === 'pseudoElement') {
    content = '::' + node.content;
    type = 'pseudoElement';
  }

  else if (node.type === 'nth') {
    content = '(' + node.content + ')';
    type = 'nth';
  }

  else if (node.type === 'nthSelector') {
    var nthSelector = ':';

    node.forEach(function (attrib) {
      var selectorPiece = helpers.constructSelector(attrib);

      nthSelector += selectorPiece.content;
    });

    content = nthSelector;
    type = 'nthSelector';
  }

  else if (node.type === 'space') {
    content = ' ';
  }

  else if (node.type === 'parentSelector') {
    content = node.content;
    type = 'parentSelector';
  }

  else if (node.type === 'combinator') {
    content = node.content;
    type = 'combinator';
  }

  return {
    content: content,
    type: type
  };
};

/**
 * Checks the current selector value against the previous selector value and assesses whether they are
 * a) currently an enforced selector type for nesting (user specified - all true by default)
 * b) whether they should be nested
 * @param {object} currentVal - the current node / part of our selector
 * @param {object} previousVal - the previous node / part of our selector
 * @param {array} elements - a complete array of nestable selector types
 * @param {array} nestable - an array of the types of selector to nest
 * @returns {object} Returns whether we or we should nest and the previous val
 */
helpers.isNestable = function (currentVal, previousVal, elements, nestable) {
  // check if they are nestable by checking the previous element against one
  // of the user specified selector types
  if (elements.indexOf(previousVal) !== -1 && nestable.indexOf(currentVal) !== -1) {
    return true;
  }

  return false;
};

/**
 * Tries to traverse the AST, following a specified path
 * @param   {object}  node           Starting node
 * @param   {array}   traversalPath  Array of Node types to traverse, starting from the first element
 * @returns {array}                  Nodes at the end of the path. Empty array if the traversal failed
 */
helpers.attemptTraversal = function (node, traversalPath) {
  var i,
      nextNodeList,
      currentNodeList = [],
      processChildNode = function processChildNode (child) {
        child.forEach(traversalPath[i], function (n) {
          nextNodeList.push(n);
        });
      };

  node.forEach(traversalPath[0], function (n) {
    currentNodeList.push(n);
  });

  for (i = 1; i < traversalPath.length; i++) {
    if (currentNodeList.length === 0) {
      return [];
    }

    nextNodeList = [];
    currentNodeList.forEach(processChildNode);
    currentNodeList = nextNodeList;
  }

  return currentNodeList;
};

/**
 * Collects all suffix extensions for a selector
 * @param   {object}  ruleset      ASTNode of type ruleset, containing a selector with nested suffix extensions
 * @param   {string}  selectorType Node type of the selector (e.g. class, id)
 * @returns {array}                Array of Nodes with the content property replaced by the complete selector
 *                                       (without '.', '#', etc) resulting from suffix extensions
 */
helpers.collectSuffixExtensions = function (ruleset, selectorType) {
  var parentSelectors = helpers.attemptTraversal(ruleset, ['selector', 'simpleSelector', selectorType, 'ident']),
      childSuffixes = helpers.attemptTraversal(ruleset, ['block', 'ruleset']),
      selectorList = [];

  if (parentSelectors.length === 0) {
    return [];
  }

  // Goes recursively through all nodes that look like suffix extensions. There may be multiple parents that are
  // extended, so lots of looping is required.
  var processChildSuffix = function (child, parents) {
    var currentParents = [],
        selectors = helpers.attemptTraversal(child, ['selector', 'simpleSelector']),
        nestedChildSuffixes = helpers.attemptTraversal(child, ['block', 'ruleset']);

    selectors.forEach(function (childSuffixNode) {
      var extendedNode;

      if (childSuffixNode.length >= 2 &&
        childSuffixNode.contains('parentSelector') &&
        childSuffixNode.contains('ident')) {

        // append suffix extension to all parent selectors
        parents.forEach(function (parent) {
          // clone so we don't modify the actual AST
          extendedNode = clone(childSuffixNode.first('ident'));
          extendedNode.content = parent.content + extendedNode.content;

          currentParents.push(extendedNode);
        });
      }
    });

    selectorList = selectorList.concat(currentParents);

    nestedChildSuffixes.forEach(function (childSuffix) {
      processChildSuffix(childSuffix, currentParents);
    });
  };

  childSuffixes.forEach(function (childSuffix) {
    processChildSuffix(childSuffix, parentSelectors);
  });

  return parentSelectors.concat(selectorList);
};

/**
 * Checks if given file matches any of given patterns or filenames.
 * If yes return true - so it will be ignored in linting process.
 *
 * @param  {object} file                object with 'filename' property
 * @param  {string|array} ignoredFiles  ignoredFiles filename(s) or path(s)
 *                                      eg. 'sass/variables.scss' | ['scss/vendor/*.scss']
 * @returns {bool}                       true/false value if file should be ignored or not
 */
helpers.checkIfIgnored = function (file, ignoredFiles) {
  var ignored = false;

  if (ignoredFiles instanceof Array && ignoredFiles.length > 0) {
    ignoredFiles.forEach(function (ignorePath) {
      if (minimatch(file.filename, ignorePath)) {
        ignored = true;
      }
    });
  }
  else if (typeof ignoredFiles === 'string') {
    if (minimatch(file.filename, ignoredFiles)) {
      ignored = true;
    }
  }

  return ignored;
};

module.exports = helpers;
