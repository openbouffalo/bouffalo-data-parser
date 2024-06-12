import { XMLParser } from "fast-xml-parser";
import YAML from 'yaml';
import fs from "fs/promises";
import CastXML from "../../lib/castxml/castxml.js";

/** @type {String} */
let XMLdata;
/** @type {String} */
let inputFile;

class Meta {
  constructor (name) {
    /** @type {!String} */
    this.name = name;
    /** @type {String} */
    this.description = "";
    /** @type {boolean} */
    this.packed = false;
    /** @type {number} */
    this.aligned = 4;
    /** @type {number} */
    this.final_size = 0;
    /** @type {String[]} */
    this.imports = [];
  }
}

class Field {
  constructor (id, type) {
    /** @type {!String} */
    this.id = id;
    /** @type {!String} */
    this.type = type;
    /** @type {?number} */
    this.size = undefined;
    /** @type {?number} */
    this.bitsize = undefined;
    /** @type {String} */
    this.description = undefined;
    /** @type {?Field[]} */
    this.unionFields = undefined;
  }
}

class Struct {
  constructor (name) {
    this.meta = new Meta(name);
    /** @type {Field[]} */
    this.fields = [];
  }
}

const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

/**
 * 
 * @param {CastXML} cxml 
 * @param {String} structName 
 * @param {ProcessContext} ctx
 */
function processStructById(cxml, structId, ctx) {
  const struct = cxml.structs.find(f => f.id === structId);
  const st = new Struct(struct.name);
  st.meta.packed = true; // TODO: we need to detect this somehow
  st.meta.aligned = struct.align / 8;

  const processField = field => {
    if (field.constructor.name === 'Union') {
      // TODO: Implement
      return null;
    }
    const name = camelToSnakeCase(field.name);
    let type = field.type;
    let array = null;
    let unionFields = null;
    if (type.constructor.name === "ArrayType") {
      array = type;
      type = array.type;
    } else if (type.constructor.name === 'ElaboratedType') {
      if (type.keyword === 'struct') {
        type = type.type;
        st.meta.imports.push(type.name);
        if (ctx != null && ctx.objects[type.name] == undefined) {
          const st2 = processStructById(cxml, type.id, ctx);
          ctx.objects[type.name] = st2;
        }
      } else if (type.keyword === 'union') {
        // Here, we need to detect if this is that kind of union, which allows you to access it as int, or as bitfield.
        const union = type.type;
        if (union.members.length === 3 &&
            union.members[0].constructor.name === 'Struct') {
          type = {
            name: field.name + '_t'
          };
          if (ctx != null && ctx.objects[type.name] == undefined) {
            const st2 = processStructById(cxml, union.members[0].id, ctx);
            st2.meta.name = type.name;
            // TODO: Mark it was part of union thingy
            ctx.objects[type.name] = st2;
            st.meta.imports.push(type.name);
          }
        } else {
          type = {
            name: 'union'
          };
          unionFields = [];
          for (const field2 of union.members) {
            const f2 = processField(field2);
            if (f2 != null) unionFields.push(f2);
          }
        }
      } else {
        throw new Error('Unknown elaborated type ' + type.keyword);
      }
    }
    if (type == null || type.name == null) throw new Error(`Field ${name} does not have any type`);
    const comment = field.comment;
    const f = new Field(name, type.name);
    f.bitsize = field.bits;
    if (array != null) {
      f.size = array.max + 1;
    }
    if (unionFields != null) {
      f.unionFields = unionFields;
    }
    if (comment != null) f.description = comment.getText(cxml);
    return f;
  }

  for (const field of struct.members) {
    const f = processField(field);
    if (f != null) st.fields.push(f);
  }

  return st;
}

class ProcessContext {
  constructor () {
    this.objects = {};
  }
}
/**
 * 
 * @param {CastXML} cxml 
 * @param {String} structName 
 */
function processStructs(cxml, structName) {
  const ctx = new ProcessContext();

  const struct = cxml.structs.find(f => f.name === structName);
  if (struct === undefined) throw new Error('Failed to find struct ' + structName);

  const str = processStructById(cxml, struct.id, ctx);
  ctx.objects[structName] = str;

  return ctx;
}

async function main() {
  // XMLdata = await fs.readFile('output.xml', 'utf-8');
  // inputFile = await fs.readFile('input.c', 'utf-8');

  const cxml = new CastXML();
  await cxml.parse('output.xml', 'input.c');
  const out = processStructs(cxml, 'l1c_reg');
  for (const [key, str] of Object.entries(out.objects)) {
    await fs.writeFile(`./output/${key}.yaml`, YAML.stringify(str, null, {
      // defaultStringType: 'QUOTE_SINGLE'
    }));
  }
}

main();