import YAML from 'yaml';
import fs from 'fs/promises';
import { RegisterHeaderParser } from './registers/register_header_parser.js';
import { fileExists } from '../../lib/utils.js';
import path from 'path';
import { DocRegisterParser } from './registers/doc_register_parser.js';

export class DataParser {
  constructor () {
    this._profile = null;
  }

  async loadProfile(path) {
    this._profile = YAML.parse(await fs.readFile(path, 'utf-8'));
  }

  async run() {
    for (const file of this._profile.files) {
      let parser = null;
      if (file.type === 'register_header') {
        parser = new RegisterHeaderParser(this, file);
      }
      await parser.parse();
      
      const docPath = path.join(this._profile.source_dir, 'docs', file.struct_name+'ister.rst');
      if (await fileExists(docPath)) {
        const docParser = new DocRegisterParser(file, docPath);
        await docParser.parseAndFill(parser.registers);
      }
      await parser.saveYaml();
    }
  }
}

async function main() {
  const profile = process.argv[2];
  const dp = new DataParser();
  await dp.loadProfile(profile);
  await dp.run();
}

main();