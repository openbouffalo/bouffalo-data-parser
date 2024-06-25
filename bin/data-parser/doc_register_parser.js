import assert from 'assert';
import fs from 'fs/promises';
import { Register, RegisterField } from './register_header_parser.js';

export class DocRegisterParser {
  constructor(fileInfo, docPath) {
    this._fi = fileInfo;
    this._docPath = docPath;
    this._parts = [];
    /** @type {Register[]} */
    this._regs = null;
  }

  async _parseDoc() {
    const lines = (await fs.readFile(this._docPath, 'utf-8')).replace(/\r/g, '').split('\n');
    const parts = [];
    for (const [i, line] of lines.entries()) {
      if (line.startsWith('====') || line.startsWith('----')) {
        if (lines[i-1][0] === ' ') continue;
        parts.push({
          name: lines[i-1],
          startIndex: i + 1,
          lines: []
        });
      }
    }
    for (const [i,part] of parts.entries()) {
      const next = parts[i+1];
      const endIndex = next != null ? next.startIndex - 3 : lines.length - 1;
      for (let r = part.startIndex; r <= endIndex; r++) {
        part.lines.push(lines[r]);
      }
    }
    this._parts = parts;
  }

  _cleanUpString(str) {
    return str.replace(/`_/g, '').replace(/`/g, '');
  }

  _findTable(lines) {
    let state = 'looking-table';
    let header = null;
    const cleanUpRow = row => row.substring(1, row.length-1).split('|').map(p => p.trim());
    const rows = [];

    for (let [index, lin] of lines.entries()) {
      lin = lin.trim();
      if (state === 'looking-table') {
        if (lin[0] == '+' && lin[1] == '-') {
          state = 'header-look';
        }
      } else if (state === 'header-look') {
        assert(lin[0] === '|' && lin[lin.length-1] === '|');
        header = cleanUpRow(lin);
        state = 'table-delim';
      } else if (state === 'table-delim') {
        assert(lin[0] === '+');
        if (lin[1] === '-' || lin[1] === '=') {
          state = 'table-field';
        } else if (lin[1] === ' ') {
          state = 'table-add-field';
        } else {
          assert(false);
        }
      } else if (state === 'table-field') {
        if (lin[0] !== '|') {
          break;
        }
        const cols = cleanUpRow(lin);
        const finalObj = {};
        for (const i in header) {
          finalObj[header[i]] = cols[i];
        }
        rows.push(finalObj);
        state = 'table-delim';
      } else if (state === 'table-add-field') {
        const cols = cleanUpRow(lin);
        const finalObj = rows.at(-1);
        for (const i in header) {
          if (cols[i] !== '') {
            finalObj[header[i]] += '\n' + cols[i];
          }
        }
        state = 'table-delim';
      }
    }
    return rows;
  }

  _processRegDesc() {
    const regDescs = this._findTable(this._parts[0].lines);
    for (const regDesc of regDescs) {
      regDesc['Name'] = this._cleanUpString(regDesc['Name']);
      if (regDesc['Name'] === 'DMA_Config') {
        regDesc['Name'] = 'DMA_Top_Config'; // TODO:!!
      }

      const reg = this._regs.find(r => r.name === regDesc['Name']);
      assert(reg != null);
      reg.description = regDesc['Description'];
    }
  }

  /**
   * 
   * @param {*} f1 
   * @param {RegisterField} f2 
   */
  _checkIfmatch(f1, f2, reg) {
    const isF1Rsvd = f1['Name'].toLowerCase() === 'rsvd'; 

    if (!isF1Rsvd && f1['Name'] !== f2.name) return 'name-mismatch';
    if (f1['Type'] !== f2.permissions &&
       (!isF1Rsvd && !f2.permissions !== 'rsvd')) return 'perm-mismatch';
    if (f1['bitstart'] !== f2.bit_offset) return 'bit_offset-mismatch';
    if (isNaN(f1['bitend']) && f2.bit_size !== 1) return 'bit_size-mismatch1';
    if (!isNaN(f1['bitend']) && f2.bit_size !== f1['bitend'] - f1['bitstart'] + 1) {
      return 'bit_size-mismatch2';
    }
    if (f1['Reset'] !== f2.default_value) {
      return 'reset-mismatch';
    }
    return null;
  }

  _parseResetField(resetField) {
    if (resetField === '') return 0;
    if (resetField === 'x') return 0;
    let val;
    let apostropheIndex = resetField.indexOf("'");
    if (apostropheIndex !== -1) {
      const val2 = resetField.substring(apostropheIndex + 2);
      if (resetField[apostropheIndex + 1] === 'd') {
        val = parseInt(val2);
      } else if (resetField[apostropheIndex + 1] === 'h') {
        val = parseInt(val2, 16);
      } else if (resetField[apostropheIndex + 1] === 'b') {
        val = parseInt(val2, 2);
      }
    } else {
      val = parseInt(resetField);
    }
    assert(!isNaN(val));
    return val;
  }

  _checkForRegPatch(part) {

  }

  /**
   * 
   * @param {Register[]} regs 
   */
  async parseAndFill(regs) {
    this._regs = regs;
    await this._parseDoc();
    this._processRegDesc();
    let bit_offset = 0;
    for (let i = 1; i < this._parts.length; i++) {
      const part = this._parts[i];
      const fields = this._findTable(part.lines).reverse();

      this._checkForRegPatch(part);
      // if (part.name === 'DMA_Config') {
      //   console.log('TODO: DMA_CONFIG')
      //   part.name = 'DMA_Top_Config'; // TODO:!!
      // }

      let reg = this._regs.find(r => r.name === part.name);
      if (reg === undefined) {
        const manreg = this._regs[i - 1];
        assert(manreg.byte_offset === bit_offset / 8);
        console.log(`TODO: Name of reg is different ${part.name} - ${manreg.name}`)
        reg = manreg;
      }
      assert(reg != null);

      for (const [i, field] of fields.entries()) {
        const bitparts = field['Bit'].split(':');
        field.bitend = bitparts.length === 2 ? parseInt(bitparts[0]) : NaN;
        field.bitstart = bitparts.length === 2 ? parseInt(bitparts[1]) : parseInt(bitparts[0]);
        field.Reset = this._parseResetField(field.Reset);

        let finfield = reg.fields.find(f => f.name === field['Name']);
        if (finfield === undefined) {
          finfield = reg.fields.find(f => f.bit_offset === field['bitstart']);
          if (finfield === undefined) {
            // if (field.Name.toLowerCase() === 'rsvd') continue;
            console.log(`TODO: Not found: ${this._fi.struct_name} - ${reg.name}, ${field.Name}`);
            continue;
          }
        }

        const check = this._checkIfmatch(field, finfield, reg);
        if (check !== null) { 
          console.log(`TODO: Check failed ${this._fi.struct_name} - ${reg.name}, ${field.Name} | ${finfield.name}, err: ${check}`);
        }
        finfield.description = field.Description;
        bit_offset += finfield.bit_size;
      }
    }
  }
}