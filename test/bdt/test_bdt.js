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

"use strict";
const assert = require('assert');
const crypto = require('crypto');
const blog = require('../../base/base').blog;
const bdt = require('../../bdt/bdt');
const P2P = require('../../p2p/p2p');
const simpleSNServer = require('../sn/simpleSNServer');
const natSim = require('./nat_sim');
const simpleSNDHT = require('../sn/simpleSNServerWithDHT');
const BaseUtil = require('../../base/util.js');

const snConfig = {peerid: 'testSN', address: '127.0.0.1', port: 10000, family: 'IPv4', protocol: 'u'};
const peerConfig1 = {peerid: 'supernode', address: '127.0.0.1', port: 10001, vport: 10000};
const peerConfig2 = {peerid: 'miner1', address: '127.0.0.1', port: 10002};

blog.setLevel(3); // info

simpleSNServer.start([snConfig]);


const snDHTConfig = [
    {peerid: 'DHTSN1', address: '127.0.0.1', port: 20000, eplist: ['4@127.0.0.1@20000']},
    {peerid: 'DHTSN2', address: '127.0.0.1', port: 20001, eplist: ['4@127.0.0.1@20001']},
    {peerid: 'DHTSN3', address: '127.0.0.1', port: 20002, eplist: ['4@127.0.0.1@20002']},
];

simpleSNDHT.start(snDHTConfig);

let peer1 = {
    stack: null,
    acceptor: null,
    connection: null
};
let peer2 = {
    stack: null,
    connection: null
};

async function prepare(options=null, dht=false) {
    let peer1Params = {
        peerid: peerConfig1.peerid, 
        udp: {
            addrList: [peerConfig1.address], 
            initPort: peerConfig1.port, 
        },
        options: options
    };
    if (!dht) {
        peer1Params.snPeer = {peerid: snConfig.peerid, eplist: [BaseUtil.EndPoint.toString(snConfig)]}
    } else {
        peer1Params.dhtEntry = snDHTConfig;
    }

    let {result: r1, p2p: p2p1} = await P2P.create(peer1Params);

    let peer2Params = {
        peerid: peerConfig2.peerid, 
        udp: {
            addrList: [peerConfig2.address], 
            initPort: peerConfig2.port,
        },
        options: options
    };
    if (!dht) {
        peer2Params.snPeer = {peerid: snConfig.peerid, eplist: [BaseUtil.EndPoint.toString(snConfig)]}
    } else {
        peer2Params.dhtEntry = snDHTConfig;
    }

    let {result: r2, p2p: p2p2} = await P2P.create(peer2Params);

    await Promise.all([p2p1.startupBDTStack(), p2p2.startupBDTStack()]);
    peer1.stack  = p2p1.bdtStack;
    peer2.stack  = p2p2.bdtStack;
    
    peer1.acceptor = peer1.stack.newAcceptor({vport: peerConfig1.vport});
    peer1.acceptor.listen();

    if (dht) {
        // wait dht convergence
        await new Promise((resolve)=>{
            setTimeout(resolve, 10000);
        });
    }
}

async function clear() {
    await Promise.all([peer1.stack.close(), peer2.stack.close()]);
    peer1.stack = null;
    peer1.acceptor = null;
    peer2.stack = null;
}


async function connect() {
    peer2.connection = peer2.stack.newConnection();
    peer2.connection.bind(null);
    await Promise.all([
        new Promise((resolve, reject)=>{
            peer1.acceptor.once(bdt.Acceptor.EVENT.connection, 
                (connection)=>{
                    peer1.connection = connection;
                    resolve(); 
                });
            peer1.acceptor.once('error', 
                ()=>{
                    reject();
                });
            }
        ), 
        peer2.connection.connect({peerid: peerConfig1.peerid, vport: peerConfig1.vport})]);
}

async function singleBreak() {
    peer1.connection.close(true);
    peer1.connection.once('error', ()=>{});
    return new Promise((resolve)=>{
        peer2.connection.once('error', ()=>{
            resolve();
        });
    });
}

async function simpleMessage() {
    peer1.connection.send(Buffer.from('1', 'utf8'));
    peer2.connection.send(Buffer.from('2', 'utf8'));
    await Promise.all([new Promise((resolve)=>{
            peer1.connection.once(bdt.Connection.EVENT.data, ((buffers)=>{
                assert('2' === buffers[0].toString('utf8'));
                resolve();
            }));
        }),
        new Promise((resolve)=>{
            peer2.connection.once(bdt.Connection.EVENT.data, ((buffers)=>{
                assert('1' === buffers[0].toString('utf8'));
                resolve();
            }));
        })]);
}

async function simpleData() {
    const data = Buffer.alloc(100*1024);
    let random = new Date();
    random.setTime(Date.now());
    random = Buffer.from(random.toLocaleString(), 'utf8');
    for (let offset = 0; offset < data.length; offset += random.length) {
        random.copy(data, offset);
    }
    let srcDigest = crypto.createHash('md5').update(data).digest('hex');
    let sentBytes = 0;
    sentBytes = peer1.connection.send(Buffer.from(data.buffer, sentBytes));
    if (sentBytes < data.length) {
        let onDrain = ()=>{
            sentBytes += peer1.connection.send(Buffer.from(data.buffer, sentBytes));
            if (sentBytes === data.length) {
                setImmediate(()=>{peer1.connection.removeListener(bdt.Connection.EVENT.drain, onDrain);});
            }
        };
        peer1.connection.on(bdt.Connection.EVENT.drain, onDrain);
    }   

    return new Promise((resolve)=>{
        let recvBytes = 0;
        let recvDigest = crypto.createHash('md5');
        let onData = (buffers)=>{
            for (const buffer of buffers) {
                recvDigest.update(buffer);
                recvBytes += buffer.length;
            }
            if (recvBytes === data.length) {
                setImmediate(()=>{peer2.connection.removeListener(bdt.Connection.EVENT.data, onData);});
                assert(recvDigest.digest('hex') === srcDigest);
                resolve();
            }
        };
        peer2.connection.on(bdt.Connection.EVENT.data, onData);
    });
    
}


async function closeConnect() {
    let op = Promise.all([peer1.connection.close(), peer2.connection.close()]);
    await op;
    peer1.connection = null;
    peer2.connection = null;
}

async function main() {
    await prepare({breakTimeout: 100000000});

    blog.info('[test_bdt]: test connect');
    await connect();
    blog.info('[test_bdt]: test connect ok');

    // blog.info('[test_bdt]: test simple message');
    // await simpleMessage();
    // blog.info('[test_bdt]: test simple message ok');

    // blog.info('[test_bdt]: test break');
    // await singleBreak();
    // blog.info('[test_bdt]: test break ok');

    blog.info('[test_bdt]: test simple data');
    await simpleData();
    blog.info('[test_bdt]: test simple data ok');

    // blog.info('[test_bdt]: test close connect at same time ');
    // await closeConnect();
    // blog.info('[test_bdt]: test close connect at same time ok');

    // blog.info('[test_bdt]: test close stack');
    // await clear();
    // blog.info('[test_bdt]: test close stack ok');

    // natSim.applyNat();
    // await prepare();
    // blog.info('[test_bdt]: test connect with nat');
    // await connect();
    // blog.info('[test_bdt]: test connect with nat ok');
    // await clear();
    // natSim.clear();

    // await prepare(null, true);
    // blog.info('[test_bdt]: test connect with dht');
    // await connect();
    // blog.info('[test_bdt]: test connect with dht ok');
    // await clear();


    blog.info('[test_bdt]: all test ok');
}


main();










