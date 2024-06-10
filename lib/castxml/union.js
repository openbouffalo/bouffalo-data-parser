import CastXML from "./castxml.js";
import Record from "./record.js";

export default class Union extends Record {
  constructor () {
    super();
  }

  /**
   * 
   * @param {CastXML} cxml 
   * @param {*} data 
   */
  _parse (cxml, data) {
    super._parse(cxml, data);
  }
}