import CastXML from "./castxml.js";
import utils from "./utils.js"

export default class ElaboratedType {
  constructor () {
    this.id = '';
    this.type = null;
    this.keyword = '';
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