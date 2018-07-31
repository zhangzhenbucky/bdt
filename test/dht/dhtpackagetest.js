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

const DHTPackage = require('../../dht/packages/package.js');
const DHTPackageFactory = require('../../dht/package_factory.js');
const CommandType = DHTPackage.CommandType;

const dhtPackageFactory = new DHTPackageFactory();
let dhtPKG = dhtPackageFactory.createPackage(CommandType.PING_REQ);
let pkgCommon = dhtPKG.common;
pkgCommon.src = {
    'peeridHash': 1,
    'peerid': 'source',
    'eplist': ['ep1', 'ep2'],
    'additionalInfo': [['isSN',true], ['isMiner',false]],
};

pkgCommon.dest = {
    'peeridHash': 2,
    'peerid': 'destination',
    'ep': '4@192.168.0.1:1234',
};

pkgCommon.seq = 4567;
pkgCommon.ackSeq = 3456;
pkgCommon.ttl = 5;
pkgCommon.nodes = [{id:'p1', eplist:['ep3', 'ep4']}, {id:'p2', eplist:['ep5', 'ep6']}];

dhtPKG.body = {
    content: 'ping',
};

console.log(`Initial package is :`);
console.log(dhtPKG);

let encoder = DHTPackageFactory.createEncoder(dhtPKG);
let buffer = encoder.encode();

let decoder = DHTPackageFactory.createDecoder(buffer, 0, buffer.length);
let decodePkg = decoder.decode();

console.log(`Decode package is :`);
console.log(decodePkg);
