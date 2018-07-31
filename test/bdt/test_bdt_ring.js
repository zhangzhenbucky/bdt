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

const EventEmitter = require('events');
const bdt = require('../../bdt/bdt');
const {BDT_ERROR, BDTPackage} = require('../../bdt/package');
const P2P = require('../../p2p/p2p');
const assert = require('assert');
const simpleSNServer = require('../sn/simpleSNServer');
const CommandLine = require('../../base/commandline').CommandLine;
const BaseUtil = require('../../base/util.js');

class Package{
	constructor(message, srcPeerID, srcVport, loopCount){
		this.m_message = message;
		this.m_imessage = {
			head:{
				src_peerid: srcPeerID,
				src_vport: srcVport,
				loop_count: loopCount,
			},
			body:{
				message: message
			}
		};
	}

	get head(){
		return this.m_imessage.head;
	}

	get body(){
		return this.m_imessage.body;
	}

	encode(){
		let str = JSON.stringify(this.m_imessage);
		let length = str.length;
		let buffer = Buffer.alloc(4+length);
		buffer.writeUInt32BE(length,0);
		buffer.write(str, 4);

		/*
		let l = buffer.readUInt32BE(0);
		let b = buffer.slice(4);
		let o = JSON.parse(b);
		let s = JSON.stringify(o);
		console.log('');
		console.log(`==>l:${l}/${length}, v:${s}`);
		console.log('');
		*/

		console.log(buffer);

		return buffer;
	}

	static from(buffer){
		let imessage = JSON.parse(buffer.toString());
		return new Package(imessage.body.message,
			imessage.head.src_peerid, 
			imessage.head.src_vport,
			imessage.head.loop_count);
	}
}

class PackageParser{
	constructor(){
		this.m_state = 'head';
		
		this.m_headLength = 4;
		this.m_headBuffer = Buffer.alloc(this.m_headLength);
		this.m_headPos = 0;

		this.m_bodyLength = 0;
		this.m_buffer = null;
		this.m_bodyPos = 0;

		this.m_packages = [];
	}

	pushData(buffers){
		for(let buffer of buffers){
			this._pushBuffer(buffer);
		}
	}

	hasPackage(){
		return this.m_packages.length>0;
	}

	popPackage(){
		return this.m_packages.pop();
	}

	_pushBuffer(buffer){
		switch(this.m_state){
			case 'head': this._parseHead(buffer);break;
			case 'body': this._parseBody(buffer);break;
			default: break;
		}
	}

	_parseHead(buffer){
		let rest = this.m_headLength - this.m_headPos;
		assert(rest>0);

		let bufferLength = buffer.length;
		let copyLength = Math.min(rest,bufferLength);
		let restBufferLength = bufferLength - copyLength;

		console.log('~~~~~~~~');
		console.log(`copy length: ${this.m_headPos}, [0,${copyLength}] `);
		buffer.copy(this.m_headBuffer,this.m_headPos,0,copyLength);
		this.m_headPos+=copyLength;
		console.log(buffer);
		console.log(this.m_headBuffer);
		console.log('~~~~~~~~');
		
		rest = this.m_headLength - this.m_headPos;
		if(rest<=0){
			// create body
			console.log(this.m_headBuffer);
			this.m_bodyLength = this.m_headBuffer.readUInt32BE(0);
			this.m_bodyBuffer = Buffer.alloc(this.m_bodyLength);
			this.m_state = 'body';

			// check tail
			if(restBufferLength>0){
				this._pushBuffer(buffer.slice(copyLength));
			}
		}
	}

	_parseBody(buffer){
		console.log(`${this.m_bodyLength}/${this.m_bodyPos}`);
		let rest = this.m_bodyLength - this.m_bodyPos;
		assert(rest>0);

		let bufferLength = buffer.length;
		let copyLength = Math.min(rest,bufferLength);
		let restBufferLength = bufferLength - copyLength;

		buffer.copy(this.m_bodyBuffer,this.m_bodyPos,0,copyLength);
		this.m_bodyPos+=copyLength;

		rest = this.m_bodyLength - this.m_bodyPos;
		if(rest<=0){
			// create package
			let pkg = Package.from(this.m_bodyBuffer);
			this.m_packages.push(pkg);

			// reset 
			this.m_headPos = 0;
			this.m_bodyLength = 0;
			this.m_bodyBuffer = null;
			this.m_bodyPos = 0;
			this.m_state = 'head';

			// check tail
			if(restBufferLength>0){
				this._pushBuffer(buffer.slice(copyLength));
			}
		}
	}
}

class Node extends EventEmitter{
	/**
	 * A Node is a peer
	 * @param  {[object]} param {
	 *   addressList:[],
	 *   initPort:0,  
	 *   maxPortOffset: 0,
	 *   peerID: '',
	 *   vport:0,
	 *   snInfo:{
	 *   	address:'',
	 *   	port:'',
	 * 		protocol: 'u',
	 * 		family: 'IPv4'
	 *   }              
	 * }
	 * @return {[Node]} the peer node
	 */
	constructor(param){
		super();
		
		this.m_peerID = param.peerID;
		this.m_addressList = param.addressList;
		this.m_localPort = param.vport;
		this.m_initPort = param.initPort;
		this.m_maxPortOffset = param.maxPortOffset;
		this.m_snInfo = param.snInfo;

		this.m_linkPeers = {};
		this.m_linkConnections = {};
		this.m_tryConectInterval = 10*1000;

		this.m_bdtStack = null;
		this.m_acceptor = null;

		this.m_inited = false;
	}

	async init(){
		let {result, p2p} = await P2P.create({
				peerid: this.m_peerID,
				udp: {
					addrList: this.m_addressList,
					initPort: this.m_initPort,
					maxPortOffset: this.m_maxPortOffset,
				},
				snPeer: {
					peerid: 'SN-X',
					eplist: [BaseUtil.EndPoint.toString(this.m_snInfo)],
				}
			});
		
		let ret = await p2p.startupBDTStack();
		this.m_bdtStack  = p2p.bdtStack;

		this.m_acceptor = this.m_bdtStack.newAcceptor({
			vport:this.m_localPort
		});
	}

	get peerID(){
		return this.m_peerID;
	}

	get vport(){
		return this.m_localPort;
	}

	link(peerID, vport){
		this.m_linkPeers[peerID] = {
			vport: vport
		};
		return this;
	}

	async run(){
		this._listen();
		return this._autoConnect();
	}

	stop(){
		// not implement
		return this;
	}

	/**
	 * boad a message
	 * @param  {[string]} message
	 * @return {[Node]} the node it self
	 */
	broadcast(message,loopCount){
		console.log('will broadcast message:'+message);
		this.m_loopLimit = loopCount;
		let imessage = new Package(message, this.m_peerID, this.m_localPort, 0);
		this._tryBroadcast(imessage);
		return this;
	}

	_tryBroadcast(imessage){
		if(this._tryBroadcastImpl(imessage)){
			return;
		}

		let interValID = setInterval(()=>{
			if(this._tryBroadcastImpl(imessage)){
				clearInterval(interValID);
			}
		}, this.m_tryConectInterval);
	}

	_tryBroadcastImpl(imessage){

		console.log('try broadcast message');

		let hasSend = false;
		let buf = imessage.encode();

		for(let peerID in this.m_linkConnections){
			let conn = this.m_linkConnections[peerID];

			conn.send(buf);

			console.log('has broadcast message to '+ peerID);
			hasSend = true;
		}

		return hasSend;
	}

	_listen(){
		this.m_acceptor.listen();

		this.m_acceptor.on(bdt.Acceptor.EVENT.connection, 
			(conn)=>{

				console.log('accept a new connection');

				conn.parser = new PackageParser();
				conn.on(bdt.Connection.EVENT.data,(buffers)=>{
					console.log(`receive buffers:`, buffers);
					conn.parser.pushData(buffers);
					while(conn.parser.hasPackage()){
						let imessage = conn.parser.popPackage();
						this._onReveive(imessage);
					}
				});
			});
	}

	async _autoConnect(){
		
		/** get all link peers right now */
		let linkPeers = Object.assign({},this.m_linkPeers);

		/** connect to all link peers */
		console.log(`this peer: ${this.m_peerID}`);
		console.log(linkPeers);
		let connectOp = [];
		for(let peerID in linkPeers){
			let peerInfo = linkPeers[peerID];
			connectOp.push(this._tryConnect(peerID, peerInfo));
		}
		return Promise.all(connectOp);
	}

	async _tryConnect(peerID, peerInfo){

		console.log(`try connect to peer: ${peerID} again`);

		/** close old instance */
		let oldConnection = this.m_linkConnections[peerID];
		if(oldConnection){
			await oldConnection.close();
		}

		/** create new connection */

		let conn =this.m_bdtStack.newConnection();
		conn.bind();

		let peerStateLog = (state)=>{
			console.log(`conn ${state}: ${peerID}:${peerInfo.vport}`);
		};

		conn.on(bdt.Connection.EVENT.error,()=>{
			peerStateLog(bdt.Connection.EVENT.error);

			/** change state from error to close */
			conn.close();
		});
		
		conn.on(bdt.Connection.EVENT.connect,()=>{
			/** insert it into linked connection list */
			this.m_linkConnections[peerID] = conn;

			peerStateLog(bdt.Connection.EVENT.connect);
		});

		conn.on(bdt.Connection.EVENT.close,()=>{
			/** remove it from linked connection list */
			delete this.m_linkConnections[peerID];

			peerStateLog(bdt.Connection.EVENT.close);

			/** retry connect after m_tryConectInterval millseconds */
			let tryOnceID = setInterval(()=>{
				clearInterval(tryOnceID);
				this._tryConnect(peerID, peerInfo);
			},this.m_tryConectInterval);
		});

		conn.on(bdt.Connection.EVENT.data,(buffers)=>{
			// ignore
		});

		return conn.connect({peerid:peerID, vport:peerInfo.vport});
	}

	_onReveive(imessage){
		if(imessage.head.src_peerid===this.m_peerID&&imessage.head.src_vport===this.m_localPort){
			imessage.head.loop_count++;
			if(imessage.head.loop_count>this.m_loopLimit){
				console.log('message loop count is overflow, stop it:', imessage.body.message);
				return;
			}else{
				console.log('continue');
			}
		}
		
		let src = {
			peerid: imessage.head.src_peerid,
			vport: imessage.head.src_vport
		};

		let dest = {
			peerid: this.m_peerID, 
			vport: this.m_localPort
		};

		let message = imessage.body.message;

		console.log('###############');
		console.log(`${imessage.head.loop_count}/${this.m_loopLimit}`);
		this._tryBroadcast(imessage);
		this.emit('message', src, dest, message);
		console.log('###############');
	}
}


/**
 * test function
 */
async function run(){
	/** prepare three node */
	let addressList = [
		'127.0.0.1'
	];
	let initPort  = 2000;
	let maxPortOffset = 1;
	let localVPort = 20000;
	let snInfo = {
		peerid: 'SIMPLE-SN-2',
		address: '127.0.0.1',
		port: 3035,
		family: 'IPv4',
		protocol: 'u',
	};

	simpleSNServer.start([snInfo]);


	let ringCount = 2;
	let rings = [];

	/** create nodes */
	console.log('1. create nodes');
	let nodeInitOp = [];
	for(let i=0;i<ringCount;i++){
		let nodei = new Node({
			addressList: addressList, 
			initPort: initPort,
			maxPortOffset: maxPortOffset,
			peerID: `node${i}`, 
			vport: localVPort,
			snInfo:snInfo
		});

		initPort+=maxPortOffset+1;
		localVPort++;
		rings.push(nodei);
		nodeInitOp.push(nodei.init());
	}

	await Promise.all(nodeInitOp);

	/** get the root node and set it as the last node */
	console.log('2. get the root node and set it as the last node');
	let root = rings[0];
	rings.push(root);
		
	/** just link all nodes as a ring */
	console.log('3. just link all nodes as a ring');
	for(let i=0;i<ringCount;i++){
		let src = rings[i];
		let dest = rings[i+1];
		src.link(dest.peerID, dest.vport).on('message',(src, dest,message)=>{
			let srcInfo = `${src.peerid}:${src.vport}`;
			let destInfo = `${dest.peerid}:${dest.vport};`;
			let log = `recv from , ${src} to ${dest}: ${message}`;
			console.log(log);
		});
	}
	
	/** run all nodes */
	console.log('4. run all nodes');
	let nodeRunOp = [];
	for(let i=0;i<ringCount;i++){
		let node = rings[i];
		nodeRunOp.push(node.run());
	}

	await Promise.all(nodeRunOp);

	/** broadcast a message in the ring */
	console.log('5. broadcast a message in the ring');
	root.broadcast('hello blockchain',10);
}

function main(){
	let cmd = new CommandLine({
		'run':false,
	});
	let options = cmd.parse();
	if(options.run){
		run();
	}
}


process.on('unhandledRejection', (reason) => {
    console.log('unhandledRejection', {reason});
});
main();

/**
 * export the test 
 */
module.exports = {
    run
};








