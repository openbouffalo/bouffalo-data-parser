import YAML from 'yaml';
import fs from 'fs/promises';
import fs2 from 'fs';
import crypto from 'crypto';
import path from 'path';
import { simpleGit } from 'simple-git';
import { fileExists } from '../../lib/utils.js'

// utils
const md5 = data => crypto.createHash('md5').update(data).digest("hex");

function calculateHash(filePath, algorithm) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs2.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (error) => reject(error));
  });
}

class DiffFinder {
  constructor () {
    this._profile = null;
    this._repo = null;
    this._branch = null;
    this._result = {}
  }

  async loadProfile(profilePath) {
    this._profile = YAML.parse(await fs.readFile(profilePath, 'utf-8'));
  }

  async _processCommit(commit) {
    let commitDate = await this._repo.git.raw('show', '--no-patch', '--no-notes', '--pretty=\'%cd\'', commit);
    commitDate = new Date(commitDate);
    await this._repo.git.checkout(commit);

    for (const file of this._profile.file_set) {
      const filePath = path.resolve(this._repo.path, this._branch.path, file);
      if (this._result[file] == undefined) {
        this._result[file] = {};
      }
      try {
        const hash = await calculateHash(filePath, 'md5');
        if (this._result[file][hash] == null) {
          this._result[file][hash] = {
            date: commitDate,
            hash: hash,
            repo: this._repo.url,
            commit: commit
          };
        }
      } catch (ex) {
        if (ex.code != undefined && ex.code === 'ENOENT') {
          // OK
        } else {
          throw ex;
        }
      }
    }
  }

  async _processBranch(branch) {
    this._branch = {
      path: branch.path,
    };
    await this._repo.git.checkout(branch.name);
    let out = await this._repo.git.raw('rev-list', branch.name, '--first-parent', '--reverse');
    const commits = out.split('\n');
    console.log(`processing branch ${branch.name}`);
    for (const commit of commits) {
      if (commit === '') continue;
      await this._processCommit(commit);
      // break;
    }
  }

  async _processRepo(repo) {
    // Check if we have repo cloned
    const repoHash = md5(repo.url);
    this._repo = {
      hash: repoHash,
      url: repo.url,
      path: path.resolve('repos', repoHash),
    };
    if (!await fileExists(this._repo.path)) {
      console.log(`cloning ${repo.url}...`);
      await fs.mkdir(this._repo.path);
      this._repo.git = simpleGit(this._repo.path);
      await this._repo.git.clone(repo.url, this._repo.path);
    } else {
      this._repo.git = simpleGit(this._repo.path);
    }
    console.log(`processing repo ${repo.url}`);
    for (const branch of repo.branches) {
      await this._processBranch(branch);
    }
  }

  async run() {
    this._result = {};
    for (const repo of this._profile.repos) {
      await this._processRepo(repo);
    }
  }

  async save(filePath) {
    const out = { files: {} };
    for (const [file, hashes] of Object.entries(this._result)) {
      let revs = [];
      for (const hashInfo of Object.values(hashes)) {
        revs.push({
          ...hashInfo,
          date: hashInfo.date.toDateString()
          // date: new Date(hashInfo.date)
        });
      }
      revs = revs.sort((a, b) => a.date - b.date);
      out.files[file] = revs;
    }
    await fs.writeFile(filePath, YAML.stringify(out));
  }
}

async function main() {
  // TODO: Implement args
  const df = new DiffFinder();
  await df.loadProfile('profiles/bl702_regs.yaml');
  await df.run();
  // await fs.writeFile('tmp1.json', JSON.stringify(df._result));
  // df._result = JSON.parse(await fs.readFile('tmp1.json', 'utf-8'));
  await df.save('bl702_regs.yaml');
}

main();