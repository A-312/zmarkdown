"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/* Dependencies. */
var clone = require('clone');

var tableCell = require('rebber/dist/types/tableCell');

var tableRow = require('rebber/dist/types/tableRow');

var table = require('rebber/dist/types/table');
/* Expose. */


module.exports = gridTable;

var MultiRowLine =
/*#__PURE__*/
function () {
  function MultiRowLine(startRow, endRow, startCell, endCell, colspan, endOfLine) {
    _classCallCheck(this, MultiRowLine);

    this.multilineCounter = endRow - startRow;
    this.startCell = startCell;
    this.endCell = endCell;
    this.colspan = colspan;
    this.endOfLine = endOfLine;
  }

  _createClass(MultiRowLine, [{
    key: "getCLine",
    value: function getCLine() {
      var startCLine = 1;
      var endCLine = this.startCell - 1; // case where the multi row line is at the start of the table

      if (this.startCell === 1) {
        startCLine = this.startCell + this.colspan;
        endCLine = this.endOfLine;
      } else if (this.startCell > 1 && this.startCell + this.colspan < this.endOfLine) {
        // case where the multi row line is in the middle of the table
        var clineBefore = "\\cline{1-".concat(this.startCell - 1, "}");
        var clineAfter = "\\cline{".concat(this.startCell + this.colspan, "-").concat(this.endOfLine, "}");
        return "".concat(clineBefore, " ").concat(clineAfter);
      }

      return "\\cline{".concat(startCLine, "-").concat(endCLine, "}");
    }
  }]);

  return MultiRowLine;
}();

var GridTableStringifier =
/*#__PURE__*/
function () {
  function GridTableStringifier() {
    _classCallCheck(this, GridTableStringifier);

    this.lastMultiRowLine = null;
    this.currentSpan = 0;
    this.rowIndex = 0;
    this.colIndex = 0;
    this.multiLineCellIndex = 0;
    this.colspan = 1;
    this.nbOfColumns = 0;
  }

  _createClass(GridTableStringifier, [{
    key: "gridTableCell",
    value: function gridTableCell(ctx, node) {
      var overriddenCtx = clone(ctx);
      this.colIndex++;
      overriddenCtx.tableCell = undefined;
      var baseText = tableCell(overriddenCtx, node).trim().replace(/\n/g, ' \\par ');

      if (node.data && node.data.hProperties.rowspan > 1) {
        this.currentSpan = node.data.hProperties.rowspan;
        this.multiLineCellIndex = this.colIndex;
        baseText = "\\multirow{".concat(node.data.hProperties.rowspan, "}{*}{").concat(baseText, "}");
        this.colspan = node.data.hProperties.colspan > 1 ? node.data.hProperties.colspan : 1;
      } else if (node.data && node.data.hProperties.colspan > 1) {
        var colspan = node.data.hProperties.colspan;
        var colDim = "p{\\dimexpr(\\linewidth) * ".concat(colspan, " / \\number-of-column}");
        baseText = "\\multicolumn{".concat(colspan, "}{|").concat(colDim, "|}{").concat(baseText, "}");
      }

      if (node.data && node.data.hProperties.colspan > 1) {
        this.colIndex -= 1;
        this.colIndex += node.data.hProperties.colspan;
      }

      return baseText;
    }
  }, {
    key: "gridTableRow",
    value: function gridTableRow(ctx, node) {
      var overriddenCtx = clone(ctx);
      this.rowIndex++;
      overriddenCtx.tableRow = undefined;

      if (this.previousRowWasMulti()) {
        var lastMultiRowline = this.flushMultiRowLineIfNeeded();

        for (var i = 0; i < lastMultiRowline.colspan; i++) {
          node.children.splice(lastMultiRowline.startCell - 1, 0, {
            type: 'tableCell',
            children: [{
              type: 'paragraph',
              children: [{
                type: 'text',
                value: ' '
              }]
            }]
          });
        }

        this.colIndex = 0;
        var rowStr = tableRow(overriddenCtx, node);

        if (lastMultiRowline.multilineCounter > 0) {
          rowStr = rowStr.replace(/\\hline/, lastMultiRowline.getCLine());
        }

        this.colIndex = 0;
        return rowStr;
      }

      var rowText = tableRow(overriddenCtx, node);

      if (this.currentSpan !== 0) {
        this.lastMultiRowLine = new MultiRowLine(this.rowIndex, this.rowIndex + this.currentSpan + -1, this.multiLineCellIndex, this.colIndex + this.colspan, this.colspan, this.colIndex);
        rowText = rowText.replace(/\\hline/, this.lastMultiRowLine.getCLine());
      }

      this.currentSpan = 0;

      if (this.colIndex >= this.nbOfColumns) {
        this.nbOfColumns = this.colIndex;
      }

      this.colIndex = 0;
      return rowText;
    }
  }, {
    key: "flushMultiRowLineIfNeeded",
    value: function flushMultiRowLineIfNeeded() {
      if (!this.lastMultiRowLine) {
        return null;
      }

      var row = this.lastMultiRowLine;

      if (row.multilineCounter >= 1) {
        row.multilineCounter--;
      }

      if (row.multilineCounter === 0) {
        this.lastMultiRowLine = null;
      }

      return row;
    }
  }, {
    key: "gridTableHeaderParse",
    value: function gridTableHeaderParse() {
      var headers = "|p{\\dimexpr(\\linewidth) / ".concat(this.nbOfColumns, "}").repeat(this.nbOfColumns);
      return "".concat(headers, "|");
    }
  }, {
    key: "previousRowWasMulti",
    value: function previousRowWasMulti() {
      return this.lastMultiRowLine !== null;
    }
  }]);

  return GridTableStringifier;
}();

function gridTable(ctx, node) {
  var overriddenCtx = clone(ctx);
  overriddenCtx.spreadCell = '';
  var stringifier = new GridTableStringifier();

  overriddenCtx["break"] = function () {
    return ' \\par';
  }; // in gridtables '\\\\' won't work


  overriddenCtx.tableCell = stringifier.gridTableCell.bind(stringifier);
  overriddenCtx.tableRow = stringifier.gridTableRow.bind(stringifier);
  overriddenCtx.headerParse = stringifier.gridTableHeaderParse.bind(stringifier);
  return table(overriddenCtx, node).replace(/\\number-of-column/gm, stringifier.nbOfColumns);
}