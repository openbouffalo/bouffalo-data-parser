import CastXML from "./castxml.js";
import utils from "./utils.js"

export default class ArrayType {
  constructor () {
    this.id = '';
    this.type = null;
    this.min = 0;
    this.max = 0;
  }

  /**
   * 
   * @param {CastXML} cxml 
   * @param {*} data 
   */
  _parse (cxml, data) {
    utils.assignFields(this, data);
    if (this.type != null) cxml._addReferenceToResolve(this, 'type');
  }
}