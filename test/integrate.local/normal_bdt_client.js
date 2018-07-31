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

// 普通的不带dht的BDT客户端测试程序

"use strict";

const os = require("os");
const assert = require('assert');
const crypto = require('crypto');
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

class BDTClient {
    constructor(peerinfo) {
        this.m_peerinfo = peerinfo;
        this.m_bdtStack = null;
        this.m_connect = null;
        this.m_sendBuffer = Buffer.from(`hello! I'm ${this.m_peerinfo.peerid}, please echo me.`);
        this.m_recvLength = 0;
    }

    async start() {
        let {result, p2p} = await P2P.create(this._makeStackParam());
        result = await p2p.startupBDTStack();
        this.m_bdtStack = p2p.bdtStack;
        await new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 10000);
        });
        this.m_connect = this.m_bdtStack.newConnection();
        this.m_connect.bind(null);
        this.m_connect.on(BDT.Connection.EVENT.error, error => this._onError(error));
        this.m_connect.on(BDT.Connection.EVENT.close, () => this._onClose());
        this.m_connect.on(BDT.Connection.EVENT.connect, connection => this._onConnect(this.m_connect));
        
        this.m_connect.connect({peerid: this.m_peerinfo.server.peerid, vport: this.m_peerinfo.server.vport}).then(result => {
            //LOG_ERROR(`[${this.m_peerinfo.peerid} - ${this.m_peerinfo.server.peerid}|${this.m_connect.m_remote.peerid}|${this.m_connect.m_remote.peeridHash}] connect return ${result}.`);
        });
/*
        this.m_timer = setInterval(() => {
                // this.m_connect = this.m_bdtStack.newConnection();
                // this.m_connect.bind(null);
                // this.m_connect.on(BDT.Connection.EVENT.error, error => this._onError(error));
                // this.m_connect.on(BDT.Connection.EVENT.close, () => this._onClose());
                // this.m_connect.on(BDT.Connection.EVENT.connect, connection => this._onConnect(this.m_connect));
                // this.m_connect.connect({peerid: this.m_peerinfo.server.peerid, vport: this.m_peerinfo.server.vport}).then(() =>
                this.m_connect.send(this.m_sendBuffer)
            //);
        }, 10000);*/
    }

    static run(peerinfo) {
        let bdtClient = new BDTClient(peerinfo);
        bdtClient.start();
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
        console.log(`[${this.m_peerinfo.peerid} - ${this.m_peerinfo.server.peerid}|${connection.m_remote.peerid}|${connection.m_remote.peeridHash}] connected.`);
        connection.send(this.m_sendBuffer);
        connection.on(BDT.Connection.EVENT.data, buffers => {
                buffers.forEach(buffer => {
                    let sendBuffer = this.m_sendBuffer;
                    let matchSendPos = this.m_recvLength % sendBuffer.length;
                    let matchSendEndPos = Math.min(buffer.length, matchSendPos + this.m_sendBuffer.length);
                    let matchSendBuffer = this.m_sendBuffer.slice(matchSendPos, matchSendEndPos);
                    if (Buffer.compare(buffer.slice(0, matchSendEndPos - matchSendPos), matchSendBuffer) !== 0) {
                        assert(Buffer.compare(buffer, matchSendBuffer) === 0, `echo package error.`);
                    }
                    console.log(buffer.toString());
                    this.m_recvLength += buffer.length;
                });
                connection.close();
            }
        );
    }
    
    _onClose() {
        // console.error(`[${this.m_peerinfo.peerid} - ${this.m_peerinfo.server.peerid}] closed. recvcount: ${this.m_recvLength}`);
        // setInterval(() => {
        //     this.m_bdtStack.m_dht.findPeer(this.m_peerinfo.server.peerid, ({result, peerlist}) => {
        //         peerlist = peerlist || [];
        //         console.error(`[${this.m_peerinfo.peerid}] find peer [${this.m_peerinfo.server.peerid}]: ${peerlist.length}.`)
        //         peerlist.forEach(peer => console.error(`[${this.m_peerinfo.peerid}] find peer [${this.m_peerinfo.server.peerid}]: [${peer.peerid}].`));
        //     });
        // }, 10000);
    }

    _onError(error) {
        console.error(`[${this.m_peerinfo.peerid} - ${this.m_peerinfo.server.peerid}] error:${error}`);
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

    BDTClient.run(peerinfo);

    // <TODO> fill 测试数据
}

module.exports = BDTClient;