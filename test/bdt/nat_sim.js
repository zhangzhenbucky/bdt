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
let BDTPackageSender = require('../../bdt/package').BDTPackageSender;
const originInit = BDTPackageSender.prototype.init;
const originPostPackage = BDTPackageSender.prototype.postPackage;
const originSockets = new Set();

function applyNat() {
    
    let portMap = {};
    
    BDTPackageSender.prototype.init = function() {
        let socket = this.m_udpSocket;
        let nat = portMap[socket.address().port];
        if (!nat) {
            nat = {};
            portMap[socket.address().port] = nat;
        }
        if (!(originSockets.has(socket))) {
            originSockets.add(socket);
            socket.__originListeners = socket.listeners('message');
            socket.removeAllListeners('message');
            socket.on('message', (message, remote)=>{
                if (nat[remote.port]) {
                    for (let listener of socket.__originListeners) {
                        listener(message, remote);
                    }
                }
            });
        }
        
    };
    
    BDTPackageSender.prototype.postPackage = function(encoder) {
        let nat = portMap[this.m_udpSocket.address().port];
        if (!nat) {
            nat = {};
            portMap[this.m_udpSocket.address().port] = nat;
        }
        nat[this.m_remote.port] = true;
        originPostPackage.call(this, encoder);
    }; 
}  


function applyDelay(delayFilter) {
    const prePostPackage = BDTPackageSender.prototype.postPackage;
    BDTPackageSender.prototype.postPackage = function(encoder) {
        let delay = delayFilter(encoder);
        if (delay) {
            setTimeout(()=>{prePostPackage.call(this, encoder);}, delay);
        } else {
            prePostPackage.call(this, encoder);
        }
    };
}


function applyLoss(lossFilter) {
    const prePostPackage = BDTPackageSender.prototype.postPackage;
    BDTPackageSender.prototype.postPackage = function(encoder) {
        if (!lossFilter(encoder)) {
            prePostPackage.call(this, encoder);
        }
    };
}


function clear() {
    BDTPackageSender.prototype.init = originInit;
    BDTPackageSender.prototype.postPackage = originPostPackage;
    for (let socket of originSockets) {
        let originListeners = socket.__originListeners;
        delete [socket.__originListeners];
        socket.removeAllListeners('message');
        for (let listener of originListeners) {
            socket.addListener('message', listener);
        }
    }
    originSockets.clear();
}


module.exports.applyNat = applyNat;
module.exports.applyDelay = applyDelay;
module.exports.applyLoss = applyLoss;
module.exports.clear = clear;
