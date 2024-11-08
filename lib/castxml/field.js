import CastXML from "./castxml.js";
import utils from "./utils.js"

export default class Field {
  constructor () {
    this.id = '';
    this.type = null;
    this.name = null;
    this.comment = undefined;
    this.bits = undefined;
    this.offset = undefined;
    this.line = undefined;
  }

  /**
   * 
   * @param {CastXML} cxml 
   * @param {*} data 
   */
  _parse (cxml, data) {
    utils.assignFields(this, data);
    cxml._addReferenceToResolve(this, 'type');
    if (this.comment !== undefined) cxml._addReferenceToResolve(this, 'comment');
  }

  /**
   * 
   * @param {CastXML} cxml
   * @returns {?string} 
   */
  parseComment (cxml) {
    const line = cxml._codeLines[this.line - 1];
    const commentContent = (line.match(/\/\*(.*?)\*\//) || [])[1]?.trim() || null;
    return commentContent;
    // TODO: // comment
  }
}