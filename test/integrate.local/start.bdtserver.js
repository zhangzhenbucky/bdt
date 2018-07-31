// Copyright (c) 2016-2018, BuckyCloud, Inc. and other BDT contributors.
// The BDT project is supported by the GeekChain Foundation.
// All rights reserved.

// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the BDT nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.

// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

'use strict';

const os = require("os");
const EnvConfig = require('./env_config.js');
const path = require('path');
const {spawn, spawnSync} = require('child_process');
const CrashListener = require("../crash_listener.js");

const Base = require('../../base/base.js');
const LOG_INFO = Base.BX_INFO;
const LOG_WARN = Base.BX_WARN;
const LOG_DEBUG = Base.BX_DEBUG;
const LOG_CHECK = Base.BX_CHECK;
const LOG_ASSERT = Base.BX_ASSERT;
const LOG_ERROR = Base.BX_ERROR;

// 1.杀死原测试进程
spawnSync('ps|grep \'test/integrate\'|grep -v grep|awk  \'{print "kill -9 " $1}\' |sh');

// 2.更新测试代码

// 3.根据EnvConfig配置启动测试进程
if (require.main === module) {
    let crashListener = new CrashListener();
    crashListener.listen();

    // node start.js machineName
    let args = process.argv.slice(1);
    let devName = args[1];

    let logFolder;
    if (os.platform() === 'win32') {
        logFolder = "D:\\blog\\";
    } else {
        logFolder = "/var/blog/";
    }
    crashListener.enableFileLog(logFolder);
    Base.BX_EnableFileLog(logFolder, `${path.basename(require.main.filename, ".js")}-${devName}`, '.log');
    Base.blog.enableConsoleTarget(true);

    EnvConfig.NORMAL_SN_LIST.forEach(sn => {
        if (sn.dev.name === devName) {
            let childProcess = spawn('node', ['normal_sn.js', JSON.stringify(sn)], {cwd: path.dirname(args[0])});
            childProcess.stdout.on('data', data => console.log(`normal_sn.js-stdout: ${data}`));
            childProcess.stderr.on('data', data => console.log(`normal_sn.js-stderr: ${data}`));
            childProcess.stderr.on('close', code => console.log(`normal_sn.js-close: ${code}`));
        }
    });
    EnvConfig.SEED_DHT_LIST.forEach(dht => {
        if (dht.dev.name === devName) {
            let childProcess = spawn('node', ['simple_dht.js', JSON.stringify(dht)], {cwd: path.dirname(args[0])});
            childProcess.stdout.on('data', data => console.log(`simple_dht.js-stdout: ${data}`));
            childProcess.stderr.on('data', data => console.log(`seed_dht.js-stderr: ${data}`));
            childProcess.stderr.on('close', code => console.log(`seed_dht.js-close: ${code}`));
        }
    });/**/
    EnvConfig.SIMPLE_DHT_LIST.forEach(dht => {
        if (dht.dev.name === devName) {
            let childProcess = spawn('node', ['simple_dht.js', JSON.stringify(dht)], {cwd: path.dirname(args[0])});
            childProcess.stdout.on('data', data => console.log(`simple_dht.js-stdout: ${data}`));
            childProcess.stderr.on('data', data => console.log(`simple_dht.js-stderr: ${data}`));
            childProcess.stderr.on('close', code => console.log(`simple_dht.js-close: ${code}`));
        }
    });
    EnvConfig.SN_DHT_LIST.forEach(sn => {
        if (sn.dev.name === devName) {
            let childProcess = spawn('node', ['sn_dht.js', JSON.stringify(sn)], {cwd: path.dirname(args[0])});
            childProcess.stdout.on('data', data => console.log(`sn_dht.js-stdout: ${data}`));
            childProcess.stderr.on('data', data => console.log(`sn_dht.js-stderr: ${data}`));
            childProcess.stderr.on('close', code => console.log(`sn_dht.js-close: ${code}`));
        }
    });/**/
    EnvConfig.NORMAL_BDT_SERVER_LIST.forEach(bdt => {
        if (bdt.dev.name === devName) {
            let childProcess = spawn('node', ['normal_bdt_server.js', JSON.stringify(bdt)], {cwd: path.dirname(args[0])});
            childProcess.stdout.on('data', data => console.log(`normal_bdt_server.js-stdout: ${data}`));
            childProcess.stderr.on('data', data => console.log(`normal_bdt_server.js-stderr: ${data}`));
            childProcess.stderr.on('close', code => console.log(`normal_bdt_server.js-close: ${code}`));
        }
    });
    EnvConfig.BDT_DHT_SERVER_LIST.forEach(bdt => {
        if (bdt.dev.name === devName) {
            let childProcess = spawn('node', ['bdt_dht_server.js', JSON.stringify(bdt)], {cwd: path.dirname(args[0])});
            childProcess.stdout.on('data', data => console.log(`bdt_dht_server.js-stdout: ${data}`));
            childProcess.stderr.on('data', data => console.log(`bdt_dht_server.js-stderr: ${data}`));
            childProcess.stderr.on('close', code => console.log(`bdt_dht_server.js-close: ${code}`));
        }
    });/**/
/*    EnvConfig.BDT_DHT_CLIENT_LIST.forEach(bdt => {
        if (bdt.dev.name === devName) {
            let childProcess = spawn('node', ['bdt_dht_client.js', JSON.stringify(bdt)], {cwd: path.dirname(args[0])});
            childProcess.stdout.on('data', data => console.log(`bdt_dht_client.js-stdout: ${data}`));
            childProcess.stderr.on('data', data => console.log(`bdt_dht_client.js-stderr: ${data}`));
            childProcess.stderr.on('close', code => console.log(`bdt_dht_client.js-close: ${code}`));
        }
    });
    EnvConfig.NORMAL_BDT_CLIENT_LIST.forEach(bdt => {
        if (bdt.dev.name === devName) {
            let childProcess = spawn('node', ['normal_bdt_client.js', JSON.stringify(bdt)], {cwd: path.dirname(args[0])});
            childProcess.stdout.on('data', data => console.log(`normal_bdt_client.js-stdout: ${data}`));
            childProcess.stderr.on('data', data => console.log(`normal_bdt_client.js-stderr: ${data}`));
            childProcess.stderr.on('close', code => console.log(`normal_bdt_client.js-close: ${code}`));
        }
    });*/
}
