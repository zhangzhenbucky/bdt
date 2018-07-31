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

const {
    blog, BX_SetLogLevel, BLOG_LEVEL_WARN, BLOG_LEVEL_ERROR,
    BLOG_LEVEL_INFO,
    BLOG_LEVEL_ALL,
    BLOG_LEVEL_OFF,
    BaseLib,
} = require('../../base/base');


BX_SetLogLevel(BLOG_LEVEL_OFF);


const BDTEcho = require('../../doc/P2P_sample')
const DHTUtil = require('../../dht/util.js')


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



const {
    peerid,
    seed_peerid,
    seed_eplist,
    bdt_type,
    bdt_connect_peerid,
    bdt_vport,
    udpPort,
    tcpPort,
}  = params

const BDT_CONNECT = 'connect'
const BDT_LISEN = 'listen'


!(async () => {
    let randomPort = DHTUtil.RandomGenerator.integer(65525, 2048);

    const  bdt = new BDTEcho({
        peerid: peerid,
        udpPort: randomPort,
        tcpPort: randomPort + 10,
        seedPeers: {
            peerid: seed_peerid,
             eplist: [
                 seed_eplist
             ]
        }
        // seedPeers: [
        //     {peerid: seed_peerid,
        //      eplist: [
        //          seed_eplist
        //      ]}
        // ]
    })

    // 启动bdt peer
    await bdt.start()

    // 根据参数决定当前 bdt peer 去connect还是listen
    if ( bdt_type == BDT_CONNECT ) {
        bdt.connect(bdt_connect_peerid, bdt_vport)
    } else if ( bdt_type == BDT_LISEN ) {
        bdt.listen(bdt_vport)
    }
})()




// process.on('unhandledRejection', err => {
//     console.log(err)
// })
