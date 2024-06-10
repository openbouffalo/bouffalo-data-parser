import CastXML from "./castxml.js";
import utils from "./utils.js"

export default class FundamentalType {
  constructor () {
    this.id = '';
    this.name = null;
    /** @type {number} */
    this.size = 0;
    /** @type {number} */
    this.align = 0;
  }

  /**
   * 
   * @param {CastXML} cxml 
   * @param {*} data 
   */
  _parse (cxml, data) {
    utils.assignFields(this, data);
  }
}