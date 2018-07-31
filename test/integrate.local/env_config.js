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

// 公共测试设备
const PUBLIC_DEVICE_LIST = [
{
    name: '204',
    ip: '192.168.100.204',
    //ip: '127.0.0.1',
},
];

const SPECIFIED_DEVICE_LIST = [
{
    name: '161',
    ip: '192.168.100.161',

    nodes: {
        NORMAL_SN: {count: 0, startNo: 11024},
        SIMPLE_DHT: {count: 0, startNo: 13024},
        SN_DHT: {count: 0, startNo: 14024},
        NORMAL_BDT_CLIENT: {count: 0, startNo: 15024},
        NORMAL_BDT_SERVER: {count: 0, startNo: 16024},
        BDT_DHT_CLIENT: {count: 1, startNo: 17024},
        BDT_DHT_SERVER: {count: 1, startNo: 18024},
    }
},

{
    name: '170',
    ip: '192.168.100.170',

    nodes: {
        NORMAL_SN: {count: 0, startNo: 11024},
        SIMPLE_DHT: {count: 0, startNo: 13024},
        SN_DHT: {count: 0, startNo: 14024},
        NORMAL_BDT_CLIENT: {count: 0, startNo: 15024},
        NORMAL_BDT_SERVER: {count: 0, startNo: 16024},
        BDT_DHT_CLIENT: {count: 1, startNo: 17024},
        BDT_DHT_SERVER: {count: 1, startNo: 18024},
    }
},
];


const NORMAL_SN_CONFIG = {count: 3, startNo: 11024}; // 独立SN
const SEED_DHT_CONFIG = {count: 3, startNo: 12024}; // DHT网络种子节点
const SIMPLE_DHT_CONFIG = {count: 10, startNo: 13024}; // 纯粹DHT基础节点，不提供任何应用
const SN_DHT_CONFIG = {count: 10, startNo: 14024}; // 基于DHT的SN节点
const NORMAL_BDT_CLIENT_CONFIG = {count: 20, startNo: 15024}; // BDT客户端节点
const NORMAL_BDT_SERVER_CONFIG = {count: 10, startNo: 16024}; // BDT服务端节点
const BDT_DHT_CLIENT_CONFIG = {count: 30, startNo: 17024}; // 基于DHT的BDT客户端节点
const BDT_DHT_SERVER_CONFIG = {count: 5, startNo: 18024}; // 基于DHT的服务端节点

// const NORMAL_SN_CONFIG = {count: 1, startNo: 11024}; // 独立SN
// const SEED_DHT_CONFIG = {count: 1, startNo: 12024}; // DHT网络种子节点
// const SIMPLE_DHT_CONFIG = {count: 1, startNo: 13024}; // 纯粹DHT基础节点，不提供任何应用
// const SN_DHT_CONFIG = {count: 1, startNo: 14024}; // 基于DHT的SN节点
// const NORMAL_BDT_CLIENT_CONFIG = {count: 1, startNo: 15024}; // BDT客户端节点
// const NORMAL_BDT_SERVER_CONFIG = {count: 1, startNo: 16024}; // BDT服务端节点
// const BDT_DHT_CLIENT_CONFIG = {count: 30, startNo: 17024}; // 基于DHT的BDT客户端节点
// const BDT_DHT_SERVER_CONFIG = {count: 7, startNo: 18024}; // 基于DHT的服务端节点

function selectPublicDevice(No) {
    return PUBLIC_DEVICE_LIST[No % PUBLIC_DEVICE_LIST.length];
}

// 纯SN
let NORMAL_SN_LIST = [
    // {
    //     peerid: '',
    //     dev: {},
    //     port: '',
    // },
];

function configureNormalSN(targetDevice) {
    let config = NORMAL_SN_CONFIG;
    if (targetDevice) {
        config = targetDevice.nodes.NORMAL_SN;
    }

    for (let i = 0, No = config.startNo; i < config.count; i++, No++) {
        dev = targetDevice || selectPublicDevice(No);
        let sn = {
            peerid: `SN-${dev.name}-${No}`,
            dev,
            port: No,
        };
        NORMAL_SN_LIST.push(sn);
    }
}

configureNormalSN();
SPECIFIED_DEVICE_LIST.forEach(dev => configureNormalSN(dev));

// DHT种子节点
let SEED_DHT_LIST = [
    // {
    //     peerid: '',
    //     dev: {},
    //     port: '',
    // },
];

for (let i = 0, No = SEED_DHT_CONFIG.startNo; i < SEED_DHT_CONFIG.count; i++, No++) {
    let dev = selectPublicDevice(No);
    let port = No;
    let dht = {
        peerid: `SEED-DHT-${dev.name}-${No}`,
        dev,
        port,
        eplist: [`4@${dev.ip}@${port}@u`],
    };

    let seed = dht;
    if (i > 0) {
        seed = SEED_DHT_LIST[0];
    }
    dht.seedDHTNode = {peerid: seed.peerid, eplist: seed.eplist};
    SEED_DHT_LIST.push(dht);
}

function selectSeedDHTNode(No) {
    let seed = SEED_DHT_LIST[No % SEED_DHT_LIST.length];
    return {peerid: seed.peerid, eplist: seed.eplist};
}

// 纯DHT
let SIMPLE_DHT_LIST = [
    // {
    //     peerid: '',
    //     dev: {},
    //     port: '',
    //     seedDHTNode: {peerid: '', eplist: ['']},
    // },
];

function configureSimpleDHT(targetDevice) {
    let config = SIMPLE_DHT_CONFIG;
    if (targetDevice) {
        config = targetDevice.nodes.SIMPLE_DHT;
    }

    for (let i = 0, No = config.startNo; i < config.count; i++, No++) {
        let dev = targetDevice || selectPublicDevice(No);
        let dht = {
            peerid: `DHT-${dev.name}-${No}`,
            dev,
            port: No,
            seedDHTNode: selectSeedDHTNode(No),
        };
        SIMPLE_DHT_LIST.push(dht);
    }
}

configureSimpleDHT();
SPECIFIED_DEVICE_LIST.forEach(dev => configureSimpleDHT(dev));

// 基于DHT的SN
let SN_DHT_LIST = [
    // {
    //     peerid: '',
    //     dev: {},
    //     port: '',
    //     isSeedSN: false, // 是否是SN网络中的种子SN，一般作为初始化节点
    //     seedDHTNode: {peerid: '', eplist: ['']},
    // }
];

function configureSNDHT(targetDevice) {
    let config = SN_DHT_CONFIG;
    if (targetDevice) {
        config = targetDevice.nodes.SN_DHT;
    }

    for (let i = 0, No = config.startNo; i < config.count; i++, No++) {
        let dev = targetDevice || selectPublicDevice(No);
        let sn = {
            peerid: `DHT-SN-${dev.name}-${No}`,
            dev,
            port: No,
            isSeedSN: !(i % 2),
            seedDHTNode: selectSeedDHTNode(No),
        };
        SN_DHT_LIST.push(sn);
    }
}

configureSNDHT();
SPECIFIED_DEVICE_LIST.forEach(dev => configureSNDHT(dev));

function selectSNDHT(No) {
    let sn = SN_DHT_LIST[No % SN_DHT_LIST.length];
    return {peerid: sn.peerid, eplist: [`4@${sn.dev.ip}@${sn.port}@u`]};
}

function selectSN(No) {
    let sn = NORMAL_SN_LIST[No % NORMAL_SN_LIST.length];
    return {peerid: sn.peerid, eplist: [`4@${sn.dev.ip}@${sn.port}@u`]};
}

// 纯BDT（服务端）
let NORMAL_BDT_SERVER_LIST = [
    // {
    //     peerid: '',
    //     dev: {},
    //     port: '',
    //     vport: '',
    //     sn: {peerid, eplist}
    // },
];

function configureNormalBDTServer(targetDevice) {
    let config = NORMAL_BDT_SERVER_CONFIG;
    if (targetDevice) {
        config = targetDevice.nodes.NORMAL_BDT_SERVER;
    }

    for (let i = 0, No = config.startNo; i < config.count; i++, No++) {
        let dev = targetDevice || selectPublicDevice(No);
        let bdt = {
            peerid: `BDT-SERVER-${dev.name}-${No}`,
            dev,
            port: No,
            vport: `${No}`,
            sn: selectSN(No),
        };
        NORMAL_BDT_SERVER_LIST.push(bdt);
    }
}

configureNormalBDTServer();
SPECIFIED_DEVICE_LIST.forEach(dev => configureNormalBDTServer(dev));

function selectServer(No) {
    let svr = NORMAL_BDT_SERVER_LIST[No % NORMAL_BDT_SERVER_LIST.length];
    return {
        peerid: svr.peerid,
        vport: svr.vport,
        sn: svr.sn,
        eplist: [`4@${svr.dev.ip}@${svr.port}@u`],
    };
}

// 基于DHT的BDT（服务端）
let BDT_DHT_SERVER_LIST = [
    // {
    //     peerid: '',
    //     dev: '',
    //     port: '',
    //     vport: '',
    //     seedDHTNode: {peerid: '', eplist: ['']},
    // },
];

function configureBDTDHTServer(targetDevice) {
    let config = BDT_DHT_SERVER_CONFIG;
    if (targetDevice) {
        config = targetDevice.nodes.BDT_DHT_SERVER;
    }

    for (let i = 0, No = config.startNo; i < config.count; i++, No++) {
        let dev = targetDevice || selectPublicDevice(No);
        let bdt = {
            peerid: `DHT-BDT-SERVER-${dev.name}-${No}`,
            dev,
            port: No,
            vport: `${No}`,
            seedDHTNode: selectSeedDHTNode(No),//selectSNDHT(No),
        };
        BDT_DHT_SERVER_LIST.push(bdt);
    }
}

configureBDTDHTServer();
SPECIFIED_DEVICE_LIST.forEach(dev => configureBDTDHTServer(dev));

function selectDHTServer(No) {
    let svr = BDT_DHT_SERVER_LIST[No % BDT_DHT_SERVER_LIST.length];
    return {
        peerid: svr.peerid,
        vport: svr.vport,
        eplist: [`4@${svr.dev.ip}@${svr.port}@u`],
    };
}

// 纯BDT（客户端）
let NORMAL_BDT_CLIENT_LIST = [
    // {
    //     peerid: '',
    //     dev: {},
    //     port: '',
    //     sn: {peerid, eplist},
    //     server: {peerid, vport},
    // },
];

function configureNormalBDTClient(targetDevice) {
    let config = NORMAL_BDT_CLIENT_CONFIG;
    if (targetDevice) {
        config = targetDevice.nodes.NORMAL_BDT_CLIENT;
    }

    for (let i = 0, No = config.startNo; i < config.count; i++, No++) {
        let dev = targetDevice || selectPublicDevice(No);
        let svr = selectServer(No);
        let bdt = {
            peerid: `BDT-CLIENT-${dev.name}-${No}`,
            dev,
            port: No,
            sn: svr.sn,
            server: {peerid: svr.peerid, vport: svr.vport, eplist: svr.eplist},
        };
        NORMAL_BDT_CLIENT_LIST.push(bdt);
    }
}

configureNormalBDTClient();
SPECIFIED_DEVICE_LIST.forEach(dev => configureNormalBDTClient(dev));

// 基于DHT的BDT（客户端）
let BDT_DHT_CLIENT_LIST = [
    // {
    //     peerid: '',
    //     dev: {},
    //     port: '',
    //     seedDHTNode: {peerid: '', eplist: ['']},
    // },
];


function configureBDTDHTClient(targetDevice) {
    let config = BDT_DHT_CLIENT_CONFIG;
    if (targetDevice) {
        config = targetDevice.nodes.BDT_DHT_CLIENT;
    }

    for (let i = 0, No = config.startNo; i < config.count; i++, No++) {
        let dev = targetDevice || selectPublicDevice(No);
        let svr = selectDHTServer(No);
        let bdt = {
            peerid: `DHT-BDT-CLIENT-${dev.name}-${No}`,
            dev,
            port: No,
            seedDHTNode: selectSeedDHTNode(No),//selectSNDHT(No),
            server: {peerid: svr.peerid, vport: svr.vport, eplist: svr.eplist},
        };
        BDT_DHT_CLIENT_LIST.push(bdt);
    }
}

configureBDTDHTClient();
SPECIFIED_DEVICE_LIST.forEach(dev => configureBDTDHTClient(dev));

module.exports.NORMAL_SN_LIST = NORMAL_SN_LIST;
module.exports.SEED_DHT_LIST = SEED_DHT_LIST;
module.exports.SIMPLE_DHT_LIST = SIMPLE_DHT_LIST;
module.exports.SN_DHT_LIST = SN_DHT_LIST;
module.exports.NORMAL_BDT_SERVER_LIST = NORMAL_BDT_SERVER_LIST;
module.exports.BDT_DHT_SERVER_LIST = BDT_DHT_SERVER_LIST;
module.exports.NORMAL_BDT_CLIENT_LIST = NORMAL_BDT_CLIENT_LIST;
module.exports.BDT_DHT_CLIENT_LIST = BDT_DHT_CLIENT_LIST;
