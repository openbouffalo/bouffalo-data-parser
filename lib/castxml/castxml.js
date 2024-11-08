import { XMLParser } from "fast-xml-parser";
import Typedef from "./typedef.js";
import fs from "fs/promises";
import FundamentalType from "./fundamentaltype.js";
import Struct from "./struct.js";
import Union from "./union.js";
import Field from "./field.js";
import ElaboratedType from "./elaboratedtype.js";
import ArrayType from "./arraytype.js";
import Comment from "./comment.js";
import { fileExists } from '../utils.js'
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execPromise = promisify(exec);

export default class CastXML {
  static castXmlBinaryPath = 'castxml';
  constructor () {
    /** @type {string} */
    this._xmlData = '';
    /** @type {string} */
    this._codeData = '';
    /** @type {string[]} */
    this._codeLines = [];

    this._parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      preserveOrder: true,
      ignoreDeclaration: true,
      parseAttributeValue: true,
    });
    this._xml = null;
    this._refTable = {};
    /** @type {Typedef[]} */
    this.typedefs = [];
    /** @type {FundamentalType[]} */
    this.fundamentalTypes = [];
    /** @type {Struct[]} */
    this.structs = [];
    /** @type {Union[]} */
    this.unions = [];
    /** @type {Field[]} */
    this.fields = [];
    /** @type {ElaboratedType[]} */
    this.elaboratedTypes = [];
    /** @type {ArrayType[]} */
    this.arrayTypes = [];
    /** @type {Comment[]} */
    this.comments = [];

    this._refsToResolve = [];
    this._knownObjects = {
      "Typedef": Typedef,
      "FundamentalType": FundamentalType,
      "Struct": Struct,
      "Field": Field,
      "ElaboratedType": ElaboratedType,
      "Union": Union,
      "ArrayType": ArrayType,
      "Comment": Comment,
    };
  }

  async _generate(filePath) {
    const tmpFilePath = path.join(os.tmpdir(), path.basename(filePath)+'.xml');
    // TODO: Optional caching
    if (await fileExists(tmpFilePath)) {
      return tmpFilePath;
    }

    const command = `${CastXML.castXmlBinaryPath} --castxml-output=1 ${filePath} -o ${tmpFilePath}`;

    await execPromise(command);
    
    return tmpFilePath;
  }

  async parseFile (filePath) {
    const xmlPath = await this._generate(filePath);
    this._xmlData = await fs.readFile(xmlPath, 'utf-8');
    this._codeData = await fs.readFile(filePath, 'utf-8');
    this._codeLines = this._codeData.split('\n');

    this._xml = this._parser.parse(this._xmlData);
    const cxml = this._xml[0].CastXML;
    for (const ele of cxml) {
      const type = Object.keys(ele)[0];
      if (this._knownObjects[type] !== undefined) {
        const obj = new this._knownObjects[type]();
        const objArrayName = type.charAt(0).toLowerCase() + type.slice(1) + 's';
        obj._parse(this, ele[':@']);
        this[objArrayName].push(obj);
        if (this._refTable[obj.id]) {
          console.log(`ID Collision: ${obj.id}`);
        }
        this._refTable[obj.id] = obj;
      }
    }

    for (const refInfo of this._refsToResolve) {
      const isArray = refInfo.isArray;
      if (isArray) {
        const refIds = refInfo.object[refInfo.field].split(' ');
        refInfo.object[refInfo.field] = [];

        for (const [i, refId] of refIds.entries()) {
          const targetObject = this._refTable[refId];
          if (targetObject == undefined) {
            // console.log(`Reference ${refId} not found`);
            refInfo.object[refInfo.field][i] = undefined;
            continue;
          }
          refInfo.object[refInfo.field][i] = targetObject;
        }
      } else {
        const refId = refInfo.object[refInfo.field];
        const targetObject = this._refTable[refId];
        if (targetObject == undefined) {
          // console.log(`Reference ${refId} not found`);
          refInfo.object[refInfo.field] = undefined;
          continue;
        }
        refInfo.object[refInfo.field] = targetObject;
      }
    }
  }

  _addReferenceToResolve (sourceObject, sourceField, isArray) {
    this._refsToResolve.push({
      object: sourceObject,
      field: sourceField,
      isArray: isArray ?? false
    });
  }
}