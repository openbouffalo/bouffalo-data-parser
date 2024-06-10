import CastXML from "./castxml.js";
import utils from "./utils.js"

export default class Record {
  constructor () {
    this.id = '';
    this.type = null;
    this.name = null;
    this.comment = undefined;
    this.size = 0;
    this.align = 0;
    this.members = undefined;
    this.context = undefined;
  }

  /**
   * 
   * @param {CastXML} cxml 
   * @param {*} data 
   */
  _parse (cxml, data) {
    utils.assignFields(this, data);
    if (this.type != null) cxml._addReferenceToResolve(this, 'type');
    if (this.comment !== undefined) cxml._addReferenceToResolve(this, 'comment');
    if (this.members !== undefined) cxml._addReferenceToResolve(this, 'members', true);
    if (this.context !== undefined) cxml._addReferenceToResolve(this, 'context');
  }
}