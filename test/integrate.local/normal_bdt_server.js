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

// 普通的不带dht的BDT服务端测试程序

"use strict";

const os = require("os");
const assert = require('assert');
const path = require("path");
const Base = require('../../base/base');
const CrashListener = require("../crash_listener.js");
const BDT = require('../../bdt/bdt');
const P2P = require('../../p2p/p2p');

const LOG_INFO = Base.BX_INFO;
const LOG_WARN = Base.BX_WARN;
const LOG_DEBUG = Base.BX_DEBUG;
const LOG_CHECK = Base.BX_CHECK;
const LOG_ASSERT = Base.BX_ASSERT;
const LOG_ERROR = Base.BX_ERROR;

class BDTServer {
    constructor(peerinfo) {
        this.m_peerinfo = peerinfo;
        this.m_bdtStack = null;
        this.m_acceptor = null;
    }

    async start() {
        let params = this._makeStackParam();
        let {result, p2p} = await P2P.create(params);
        result = await p2p.startupBDTStack();
        this.m_bdtStack = p2p.bdtStack;

        this.m_acceptor = this.m_bdtStack.newAcceptor({vport: this.m_peerinfo.vport});
        this.m_acceptor.listen();

        this.m_acceptor.on(BDT.Acceptor.EVENT.close, () => this._onClose());

        this.m_acceptor.on(BDT.Acceptor.EVENT.connection, 
            (connection)=>{
        
                this._onConnect(connection);
            });
        this.m_acceptor.on('error', 
            ()=>{
                this._onError();
            });
    }

    static async run(peerinfo) {
        let bdtServer = new BDTServer(peerinfo);
        await bdtServer.start();
    }

    _makeStackParam() {
        let param = {
            peerid: this.m_peerinfo.peerid, 
            udp: {
                addrList: [this.m_peerinfo.dev.ip], 
                initPort: this.m_peerinfo.port, 
            },
            snPeer: {peerid: this.m_peerinfo.sn.peerid, eplist: this.m_peerinfo.sn.eplist},
        };

        return param;
    }

    _onConnect(connection) {
        console.log(`[${this.m_peerinfo.peerid} - ${connection.m_remote.peerid}|${connection.m_remote.peeridHash}] connection accepted.`);
        connection.on(BDT.Connection.EVENT.data, buffers =>
            buffers.forEach(buffer => connection.send(buffer))
        );
        connection.once(BDT.Connection.EVENT.error, () => {});
    }

    _onClose() {
        console.error(`SERVER [${this.m_peerinfo.peerid}] closed`);
    }

    _onError() {
        console.error(`SERVER [${this.m_peerinfo.peerid}] error:${error}`);
    }
}

if (require.main === module) {
    let crashListener = new CrashListener();
    crashListener.listen();

    let args = process.argv.slice(2);
    let peerinfo = JSON.parse(args[0]);

    let logFolder;
    if (os.platform() === 'win32') {
        logFolder = "D:\\blog\\";
    } else {
        logFolder = "/var/blog/";
        Base.BX_SetLogLevel(Base.BLOG_LEVEL_WARN);
    }
    crashListener.enableFileLog(logFolder);
    Base.BX_SetLogLevel(Base.BLOG_LEVEL_WARN);
    Base.BX_EnableFileLog(logFolder, `${path.basename(require.main.filename, ".js")}-${peerinfo.port}`, '.log');
    Base.blog.enableConsoleTarget(false);

    BDTServer.run(peerinfo);

    // <TODO> fill 测试数据
}

module.exports = BDTServer;