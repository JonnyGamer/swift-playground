'use strict';

const Sandbox = function(root_dir, temp_dir, filename, toolchain_version, command, options, code, timeout) {
  this.root_dir = root_dir;
  this.temp_dir = temp_dir;
  this.filename = filename;
  this.toolchain_version = toolchain_version;
  this.command = command;
  this.options = options;
  this.code = code;
  let to = parseInt(timeout);
  if (isNaN(to)) {
    to = 60;
  } else if (to > 600) {
    to = 600;
  }
  this.timeout = to;
};

Sandbox.prototype.run = function(success) {
  const sandbox = this;
  this.prepare(function() {
    sandbox.execute(success);
  });
};

Sandbox.prototype.prepare = function(success) {
  const exec = require('child_process').spawnSync;
  const fs = require('fs');
  const path = require('path');
  const sandbox = this;

  const work_dir = path.join(this.root_dir, this.temp_dir);
  exec('mkdir', [work_dir]);
  exec('cp', [path.join(this.root_dir, 'script.sh'), work_dir]);
  exec('chmod', ['777', work_dir]);

  fs.writeFile(path.join(work_dir, sandbox.filename), sandbox.code, function(error) {
    if (error) {
      console.log(error);
    } else {
      success();
    }
  });
};

Sandbox.prototype.execute = function(success) {
  const exec = require('child_process').exec;
  const execSync = require('child_process').spawnSync;
  const fs = require('fs');
  const path = require('path');

  const sandbox = this;
  let counter = 0;

  exec(['sh', path.join(this.root_dir, 'playground/run.sh'), this.timeout + 's', '-v', path.join(this.root_dir, this.temp_dir) + ':/usercode', '-v', path.join(this.root_dir, 'Libraries') + ':/Libraries:ro', 'kishikawakatsumi/swift:' + this.toolchain_version, 'sh', '/usercode/script.sh', [this.command, this.options].join(' ')].join(' '));

  const work_dir = path.join(sandbox.root_dir, sandbox.temp_dir);
  const intid = setInterval(function() {
    counter = counter + 1;
    fs.readFile(path.join(work_dir, 'completed'), 'utf8', function(error, data) {
      if (error && counter < sandbox.timeout) {
        return;
      } else if (counter < sandbox.timeout) {
        fs.readFile(path.join(work_dir, 'errors'), 'utf8', function(error, errorlog) {
          if (!errorlog) {
            errorlog = '';
          }
          const version = fs.readFileSync(path.join(work_dir, 'version'), 'utf8');
          execSync('rm', ['-rf', sandbox.temp_dir]);
          success(data, errorlog, version);
        });
      } else {
        fs.readFile(path.join(work_dir, 'errors'), 'utf8', function(error, errorlog) {
          if (!errorlog) {
            errorlog = 'Timed out.';
          }
          const version = fs.readFileSync(path.join(work_dir, 'version'), 'utf8');
          execSync('rm', ['-rf', sandbox.temp_dir]);
          success(data, errorlog, version);
        });
      }
      clearInterval(intid);
    });
  }, 1000);
};

module.exports = Sandbox;
