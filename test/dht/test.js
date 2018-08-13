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

const {
    blog, BX_SetLogLevel, BLOG_LEVEL_WARN, BLOG_LEVEL_ERROR,
    BLOG_LEVEL_INFO,
    BLOG_LEVEL_ALL,
    BLOG_LEVEL_OFF,
    BaseLib,
} = require('../../base/base');

const DHTUtil = require('../../dht/util.js')
const P2P = require('../../p2p/p2p');
const Peer = require('../../dht/peer');

BX_SetLogLevel(BLOG_LEVEL_OFF);
const args = process.argv.slice(2)
// @var {object<string>}
// 解析cli传入的参数,
const params = args
      .map( val => val.split('='))
      .filter( val => val.length == 2)
      .reduce((params, val) => {
          const [key, value] = val
          params[key] = value
          return params
      }, {})



const dhtPeerid = "106.75.175.167#SN"

const snPeer = {
    peerid: dhtPeerid,
    eplist: [
        "4@106.75.175.167@10000@t",
        "4@106.75.175.167@10010@u"
    ]
}

// const snPeer = {
//     peerid: "SEED_DHT_PEER_10000",
//     eplist: ["4@106.75.175.123@10000@u", "4@106.75.175.123@10010@t"]
// }

// const localhost = '0.0.0.0'
const localhost = '192.168.100.152'


async function start() {
    let randomPort = DHTUtil.RandomGenerator.integer(65525, 2048);
    let {result, p2p, bdtStack} = await P2P.create4BDTStack({
        peerid: params.peerid,
        udp: {
            addrList: [localhost],
            initPort: randomPort,
            maxPortOffset: 0,
        },
        tcp: {
            addrList: [localhost],
            initPort: randomPort + 10,
            maxPortOffset: 0,
        },
        dhtEntry: [snPeer]
    })

    if ( result != 0) {
        console.log('result', result)
        return
    }

    // let res = await p2p.m_dht.findPeer(params.peerid)
    // return

    setTimeout(async ()=> {
        let res = await p2p.m_dht.findPeer(params.peerid)
        let peers = res.peerlist.filter(val => {
            return val.id!= params.peerid && val.id != dhtPeerid
        })


        const ops = peers.map((val, key) => {
            return new Promise(resolve => {
                console.log('handshake', val.id)
                p2p.m_dht.handshake({
                    peerid: val.id,
                    eplist: val.eplist
                }, null, (result, peer) => {
                    if ( result == 4 ) {
                        console.log(val.id, 'timeout')
                        delete peers[key]
                    }
                    resolve(result)
                })
            })
        })

        const result = await Promise.all(ops)
        console.log(result, peers)
        peers = peers.filter(val => val)
        console.log(peers)
    }, 3000)
}

start()
