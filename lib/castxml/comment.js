import CastXML from "./castxml.js";
import utils from "./utils.js"

export default class Comment {
  constructor () {
    this.id = '';
    this.file = null;
    this.begin_offset = 0;
    this.end_offset = 0;
  }

  /**
   * 
   * @param {CastXML} cxml 
   * @param {*} data 
   */
  _parse (cxml, data) {
    utils.assignFields(this, data);
  }

  /**
   * 
   * @param {CastXML} cxml 
   */
  getText(cxml) {
    return cxml._codeData.substring(this.begin_offset, this.end_offset);
  }
}