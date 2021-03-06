"use strict";

var visit = require('unist-util-visit');

var appendix = require('../type/appendix');

var defaultReferenceGenerator = function defaultReferenceGenerator(appendixIndex) {
  return "Code appendice ".concat(appendixIndex);
};

module.exports = function (ctx, tree) {
  ctx.overrides.appendix = appendix;
  return function (node) {
    var appendix = tree.children[tree.children.length - 1];

    if (!appendix || appendix.type !== 'appendix') {
      appendix = {
        type: 'appendix',
        children: []
      };
      tree.children.push(appendix);
    }

    var appendixIndex = appendix.children.length + 1;
    visit(node, 'code', function (innerNode, index, _parent) {
      appendix.children.push({
        type: 'paragraph',
        children: [{
          type: 'heading',
          children: [{
            type: 'definition',
            identifier: "appendix-".concat(appendixIndex),
            url: "".concat(ctx.codeAppendiceTitle || 'Appendix', " ").concat(appendixIndex),
            referenceType: 'full'
          }],
          depth: 1
        }]
      });
      appendix.children.push(innerNode);
      var generator = ctx.appendiceReferenceGenerator || defaultReferenceGenerator;
      var referenceNode = {
        type: 'linkReference',
        identifier: "appendix-".concat(appendixIndex),
        children: [{
          type: 'text',
          value: generator(appendixIndex)
        }]
      };

      _parent.children.splice(index, 1, referenceNode);

      appendixIndex++;
    });
  };
};