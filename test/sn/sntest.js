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

const dgram = require('dgram');
const SN = require('../../sn/sn.js');
const PackageModule = require('../../bdt/package.js');
const BDTPackage = PackageModule.BDTPackage;

const Base = require('../../base/base.js');
const LOG_INFO = Base.BX_INFO;
const LOG_WARN = Base.BX_WARN;
const LOG_DEBUG = Base.BX_DEBUG;
const LOG_CHECK = Base.BX_CHECK;
const LOG_ASSERT = Base.BX_ASSERT;
const LOG_ERROR = Base.BX_ERROR;

let SN_PEERID = 'SIMPLE-SN-2';
let HOST = '127.0.0.1';
let PORT = 3035;

function startServer() {
    process.on('uncaughtException', function (err) {
        LOG_ERROR('An uncaught error occurred!' + err.message);
        LOG_ERROR(err.stack);
    });

    let sock = dgram.createSocket('udp4');
    
    let snServer = new SN(SN_PEERID, sock);
    
    sock.on('listening', function () {
        var address = sock.address();
        LOG_INFO(`SN Server listening on ${address.address} : ${address.port}`);
    });

    sock.on('message', function (message, remote) {
        console.log(`SNServer got package: ${remote.address}: ${remote.port}  - ${message}`);
        if(!snServer.isAllowed(remote)) {
            return;
        }

        let decoder = BDTPackage.createDecoder(message);
        decoder.decodeHeader();
        decoder.decodeBody();

        if (snServer.isMyPackage(decoder)) {
            let ret = snServer.process(decoder, remote);
            LOG_INFO(`#process ${decoder.header.cmdType} from ${remote.address}:${remote.port}, ret:${ret}`);
        }
    });

    sock.bind(PORT, HOST);
    
    snServer.start();
    console.log(`server<${SN_PEERID}> start.`);
}

class PackageHelper {
    constructor() {
        // [1, PackageHelper.MAX_SEQ]
        this.m_nextSeq = Math.round(Math.random() * (PackageHelper.MAX_SEQ - 1)) + 1;
    }

    createPackage(cmdType) {
        let cmdPackage = {
            header: {
                'magic': 0x8083,
                'version': 0x0100,
                'flags': 0,
                'cmdType': cmdType,
                'totalLength': 0,
                'bodyLength': 0,
                'src': {
                    'vport': 0,
                    'peeridHash': 0,
                },
                'dest': {
                    'vport': 0,
                    'peeridHash': 0,
                },
                'sessionID': 0,
                'seq': this._genSeq(),
                'ackSeq': 0,
            },
            'body': null,
            'data': null,
        };
        
        return cmdPackage;
    }

    static parsePackage(buffer) {
        let cmdPackage = BDTPackage.createDecoder(buffer);
        cmdPackage.decodeHeader();
        cmdPackage.decodeBody();
        return cmdPackage;
    }

    static hashPeerid(peerid) {
        let result = 0;
        let i=0;
        for(i=0;i<peerid.length;i++){
            result += (peerid.charCodeAt(i)*33);
        }
        return result % 65535;
    }

    _genSeq() {
        let seq = this.m_nextSeq++;
        if (this.m_nextSeq > PackageHelper.MAX_SEQ) {
            this.m_nextSeq = 1;
        }
        return seq;
    }
}
PackageHelper.MAX_SEQ = 0x7FFFFFFF;

const CommandType = {
    PING_REQ: 0x10,
    PING_RESP: 0x11,
    CALL_REQ: 0x12,
    CALL_RESP: 0x13,
    CALLED_REQ: 0x14,
    CALLED_RESP: 0x15,
    SN2SN_REQ: 0x16,
    SN2SN_RESP: 0x17,
};

class SNTestClient {
    constructor(peerid) {
        this.m_peerid = peerid;
        this.m_sock = null;
        this.m_packageHelper = new PackageHelper();
        this.m_isCalled = false;
    }

    start() {
        this.m_sock = dgram.createSocket('udp4');
        this.m_sock.on('message', (message, remote) => {
            console.log(`message: ${remote.address} : ${remote.port} - ${message}`);
                
            let decoder = BDTPackage.createDecoder(message);
            decoder.decodeHeader();
            decoder.decodeBody();
    
            let ret = this.process(decoder, remote);
            LOG_INFO(`#process ${decoder.header.cmdType} from ${remote.address}:${remote.port}`);
        });
        console.log(`client<${this.m_peerid}> start.`);
    }

    ping() {
        let pingReq = this.m_packageHelper.createPackage(CommandType.PING_REQ);
        pingReq.header.src.peeridHash = PackageHelper.hashPeerid(this.m_peerid);
        pingReq.header.dest.peeridHash = PackageHelper.hashPeerid(SN_PEERID);
        pingReq.body = {
            peerid: this.m_peerid,
            eplist: [`4@${HOST}@${PORT}`],
        }

        let encoder = BDTPackage.createEncoder(pingReq);
        encoder.m_header = pingReq.header;
        encoder.m_body = pingReq.body;
        encoder.encode();
        let buffer = encoder.buffer;
        
        this.m_sock.send(buffer, 0, buffer.length, PORT, HOST, function(err, bytes) {
            if (err) {
                console.log(`send failed. UDP message sent to ${HOST} : ${PORT}, error = ${err.message}`);
            }
            else {
                console.log(`send ok. UDP message sent to ${HOST} : ${PORT}`);
            }
        });
    }

    call(peerid) {
        let callReq = this.m_packageHelper.createPackage(CommandType.CALL_REQ);
        callReq.header.src.peeridHash = PackageHelper.hashPeerid(this.m_peerid);
        callReq.header.src.vport = 1234;
        callReq.header.dest.peeridHash = PackageHelper.hashPeerid(peerid);
        callReq.header.dest.vport = 2345;
        callReq.body = {
            src: this.m_peerid,
            dest: peerid,
            eplist: [`4@${HOST}@${PORT}`],
        }

        let encoder = BDTPackage.createEncoder(callReq);
        encoder.m_header = callReq.header;
        encoder.m_body = callReq.body;
        encoder.encode();
        let buffer = encoder.buffer;
        
        this.m_sock.send(buffer, 0, buffer.length, PORT, HOST, function(err, bytes) {
            if (err) {
                console.log(`send failed. UDP message sent to ${HOST} : ${PORT} , error = ${err.message}`);
            }
            else {
                console.log(`send ok. UDP message sent to ${HOST} : ${PORT}`);
            }
        });
    }

    process(cmdPackage, remote) {
        if (cmdPackage.header.cmdType === CommandType.PING_RESP) {
            this._processPingResp(cmdPackage, remote);
        } else if (cmdPackage.header.cmdType === CommandType.CALLED_REQ) {
            this._processCalledReq(cmdPackage, remote);
        } else if (cmdPackage.header.cmdType === CommandType.CALL_RESP) {
            this._processCallResp(cmdPackage, CommandType.CALL_RESP);
        }
    }

    isCalled() {
        return this.m_isCalled;
    }

    _processPingResp(cmdPackage, remote) {
        LOG_ASSERT(cmdPackage.header.dest.peeridHash === PackageHelper.hashPeerid(cmdPackage.body.peerid));
        console.log(`ping resp, eplist:${[...cmdPackage.body.eplist]}`);
    }

    _processCallResp(cmdPackage, remote) {
        LOG_ASSERT(cmdPackage.header.dest.peeridHash === PackageHelper.hashPeerid(cmdPackage.body.dest));
        console.log(`call resp, eplist:${[...cmdPackage.body.eplist]}`);
    }

    _processCalledReq(cmdPackage, remote) {
        console.log(`called by ${cmdPackage.body.src} and eplist:${[...cmdPackage.body.eplist]}`);
        this.m_isCalled = true;

        let calledResp = this.m_packageHelper.createPackage(CommandType.CALLED_RESP);
        calledResp.header.src.peeridHash = PackageHelper.hashPeerid(this.m_peerid);
        calledResp.header.src.vport = 1234;
        calledResp.header.dest.peeridHash = PackageHelper.hashPeerid(cmdPackage.body.src);
        calledResp.header.dest.vport = 2345;
        calledResp.header.ackSeq = cmdPackage.header.seq;
        calledResp.body = {
            src: this.m_peerid,
            dest: cmdPackage.body.src,
        }

        let encoder = BDTPackage.createEncoder(calledResp);
        encoder.m_header = calledResp.header;
        encoder.m_body = calledResp.body;
        encoder.encode();
        let buffer = encoder.buffer;
        
        this.m_sock.send(buffer, 0, buffer.length, PORT, HOST, function(err, bytes) {
            if (err) {
                console.log(`send failed. UDP message sent to ${HOST} : ${PORT} , error = ${err.message}`);
            }
            else {
                console.log(`send ok. UDP message sent to ${HOST} : ${PORT}`);
            }
        });
    }
}

function startClients() {
    const CALLER_PEER_ID = 'I am test snclient<caller>.';
    const CALLED_PEER_ID = 'I am test snclient<called>.';
    let clientCaller = new SNTestClient('I am test snclient<caller>.');
    let clientCalled = new SNTestClient('I am test snclient<called>.');

    clientCaller.start();
    clientCalled.start();

    clientCaller.ping();
//*
    let startTime = Date.now();
    let timer = setInterval(() => {
            if (clientCalled.isCalled()) {
                clearInterval(timer);
                console.log('test pass.');
                process.exit(0);
                return;
            } else if (Date.now() - startTime > 10000) {
                console.log('test failed.');
                process.exit(-1);
            }

            clientCaller.ping();
            clientCalled.ping();
            clientCaller.call(CALLED_PEER_ID);
        },
        1000);//*/
}

// startServer();
startClients();