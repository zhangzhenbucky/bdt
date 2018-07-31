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
const DHT = require('../../dht/dht.js');
const SNDHT = require('../../sn/sn_dht.js');
const DHTUtil = require('../../dht/util.js');
const BDTPackage = PackageModule.BDTPackage;

const Base = require('../../base/base.js');
const LOG_INFO = Base.BX_INFO;
const LOG_WARN = Base.BX_WARN;
const LOG_DEBUG = Base.BX_DEBUG;
const LOG_CHECK = Base.BX_CHECK;
const LOG_ASSERT = Base.BX_ASSERT;
const LOG_ERROR = Base.BX_ERROR;

const DHT_SEED_PEER = {
    peerid: 'SIMPLE-SN-2',
    eplist: ['4@127.0.0.1@3035', '4@192.168.100.175@3035'],
};

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
        
        this.m_dht = null;
        this.m_snDHT = null;
    }

    start() {
        this.m_sock = dgram.createSocket('udp4');
        this.m_sock.on('message', (message, remote) => {
            // console.log(`message: ${remote.address} : ${remote.port} - ${message}`);
            {
                let magic = message.readUInt16LE(0);
                if (magic === DHTUtil.Config.Package.MagicNum) {
                    this.m_dht.process(this.m_sock, message, remote);
                    return;
                }
            }
                
            let decoder = BDTPackage.createDecoder(message);
            decoder.decodeHeader();
            decoder.decodeBody();
    
            let ret = this.process(decoder, remote);
            LOG_INFO(`#process ${decoder.header.cmdType} from ${remote.address}:${remote.port}`);
        });
        console.log(`client<${this.m_peerid}> start.`);

        this.m_dht = new DHT(this.m_sock, {peerid: this.m_peerid});
        this.m_dht.start();
        this.m_dht.activePeer(DHT_SEED_PEER);
        this.m_snDHT = new SNDHT(this.m_dht);
        this.m_snDHT.signinVistor();
    }

    ping() {
        let pingReq = this.m_packageHelper.createPackage(CommandType.PING_REQ);
        pingReq.header.src.peeridHash = PackageHelper.hashPeerid(this.m_peerid);
        pingReq.header.dest.peeridHash = 0; //PackageHelper.hashPeerid(SN_PEERID);
        pingReq.body = {
            peerid: this.m_peerid,
            eplist: [],
        }
        
        this._sendPackage(pingReq, null, function(err, bytes) {
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
            eplist: [],
        }
        
        this._sendPackage(callReq, peerid, function(err, bytes) {
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
        
        this.m_sock.send(buffer, 0, buffer.length, remote.port, remote.address, function(err, bytes) {
            if (err) {
                console.log(`send failed. UDP message sent to ${remote.address} : ${remote.port} , error = ${err.message}`);
            }
            else {
                console.log(`send ok. UDP message sent to ${remote.address} : ${remote.port}`);
            }
        });
    }

    _sendPackage(pkg, targetPerid, callback) {
        targetPerid = targetPerid || this.m_peerid;
        this.m_snDHT.findSN(targetPerid, ({result, snList}) => {
            if (snList && snList.length > 0) {
                console.log(`${snList.length} SN found.`);
                let sn = snList[0];
                let address = DHTUtil.EndPoint.toAddress(sn.eplist[0]);

                let encoder = BDTPackage.createEncoder(pkg);
                if (pkg.body.dest) {
                    pkg.header.dest.peeridHash = PackageHelper.hashPeerid(pkg.body.dest);
                } else {
                    pkg.header.dest.peeridHash = PackageHelper.hashPeerid(sn.peerid);
                }
                encoder.m_header = pkg.header;
                encoder.m_body = pkg.body;
                encoder.encode();
                let buffer = encoder.buffer;

                this.m_sock.send(buffer, 0, buffer.length, address.port, address.address, (err, bytes) => {
                    if (err) {
                        console.log(`send failed. UDP message(${pkg.header.cmdType}) sent to ${address.address} : ${address.port}, error = ${err.message}`);
                    }
                    else {
                        console.log(`send ok. UDP message(${pkg.header.cmdType}) sent to ${address.address} : ${address.port}`);
                    }
                    callback(err, bytes);
                });
            } else {
                console.log(`No SN found.`);
            }
        });
    }
}

function startClients() {
    const CALLER_PEER_ID = 'I am test snclient<caller>.';
    const CALLED_PEER_ID = 'I am test snclient<called>.';
    let clientCaller = new SNTestClient(CALLER_PEER_ID);
    let clientCalled = new SNTestClient(CALLED_PEER_ID);

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