const { dispatch } = require('../lib/dispatcher')
const sha256 = require('js-sha256')
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WStar = require('libp2p-webrtc-star')
const wrtc = require('electron-webrtc')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const Gossipsub = require('libp2p-gossipsub')
const Bootstrap = require('libp2p-bootstrap')
const KadDHT = require('libp2p-kad-dht')
const MDNS = require('libp2p-mdns')
const PubsubPeerDiscovery = require('libp2p-pubsub-peer-discovery')
const uint8ArrayFromString = require('uint8arrays/from-string')
const uint8ArrayToString = require('uint8arrays/to-string')

const bootstrappers = [
  '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
]


const createNode = async () => {
  const node = await Libp2p.create({
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0',
        '/ip6/::/tcp/0',
        '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
        '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
        '/dns4/akasha.cloud/tcp/443/wss/p2p-webrtc-star',
        '/dns4/morg.store/tcp/80/ws/p2p-webrtc-star'
      ]
    },
    modules: {
      transport: [TCP, WStar],
      streamMuxer: [Mplex],
      connEncryption: [NOISE],
      peerDiscovery: [Bootstrap, PubsubPeerDiscovery, MDNS],
      pubsub: Gossipsub,
      dht: KadDHT
    },
    config: {
      transport: {
        [WStar.prototype[Symbol.toStringTag]]: {
          wrtc
        }
      },
      peerDiscovery: {
        autodial: true,
        [PubsubPeerDiscovery.tag]: {
          interval: 1000,
          enabled: true
        },
        [Bootstrap.tag]: {
          enabled: true,
          list: bootstrappers,
          interval : 2000
        },
      },
      dht: {
        enabled: true,
        randomWalk: true
      },
      pubsub: {
        enabled: true,
        emitSelf: false
      },
      nat: {
        ttl: 7200, // TTL for port mappings (min 20 minutes)
        keepAlive: true, // Refresh port mapping after TTL expires
        pmp: {
          enabled: true, // defaults to false
        }
      }
    }
  })
  
  await node.start()
  return node
}


// Controls libp2p
module.exports = class Libp2pController {
  constructor (state) {
    this.state = state
    if(typeof this.state.multiplayer === 'undefined') {
      this.state.multiplayer = {}
      this.state.multiplayer.inRoom = false
    }
  }

  joinRoom(username, roomId){
    try{
      (async () => {
        const state = this.state
        const multiplayer = state.multiplayer
        if(multiplayer.inRoom) {
          this.leaveRoom()
        }
        console.log('Joining room ' + roomId)
        multiplayer.peerInfo = new Map()
        multiplayer.roomId = roomId
        multiplayer.topic = sha256('/torrent2gether/1.0.0/'+roomId)
        if(typeof multiplayer.node === 'undefined'){
          multiplayer.node = await createNode()
        }
        const node = multiplayer.node
        multiplayer.username = username
  
        node.pubsub.subscribe(multiplayer.topic)
      
        node.pubsub.on(multiplayer.topic, (msg) => {
          this.handleMessage(msg)
        })
        console.log('Started libp2p node ' + node.peerId._idB58String)
        
        //start send state interval
        multiplayer.broadcastInterval = setInterval(() => {
          this.sendState()
        }, 2000)
        //start peer check interval
        multiplayer.peerCheckInterval = setInterval(() => {
          this.peerCheck()
        }, 2000)
        
        multiplayer.inRoom = true
      })()
    }
    catch(ex){
      console.log(ex)
    }
  }

  leaveRoom(){
    try{
      const multiplayer = this.state.multiplayer
      if (!multiplayer.inRoom) return;
      multiplayer.inRoom = false;
      this.sendRemoteAction('disconnect', null);
      (async () => { 
        await multiplayer.node.pubsub.unsubscribe(multiplayer.topic) 
      })()
      multiplayer.peerInfo.clear()
      clearInterval(multiplayer.broadcastInterval)
      clearInterval(multiplayer.peerCheckInterval)
      console.log('Left room ' + multiplayer.roomId)
    }
    catch(ex){
      console.log(ex)
    }
  }

  handleMessage(message){
    try{
      const multiplayer = this.state.multiplayer
      if (!multiplayer.inRoom) return;
      const peerInfo = multiplayer.peerInfo
      const msg = JSON.parse(uint8ArrayToString(message.data))
      switch(msg.type){
        case 'identify':
          if(peerInfo.has(message.receivedFrom)){
            peerInfo.get(message.receivedFrom).name = msg.name
            peerInfo.get(message.receivedFrom).lastHeard = new Date().getTime()
          }
          else{
            console.log('Peer joined: ' + msg.name)
            peerInfo.set(message.receivedFrom, {
              name: msg.name, 
              lastHeard: new Date().getTime()
            })
          }
          break
        case 'remoteAction':
          this.handleRemoteAction(msg.remoteAction.action, 
            msg.remoteAction.args, message.receivedFrom)
          break
      }
    }
    catch(ex){console.log(ex)}
  }

  handleRemoteAction(action, args, from){
    try {
      const state = this.state
      const multiplayer = state.multiplayer
      if(!multiplayer.inRoom) return
      switch(action)
      {
        case 'play-torrent':
          //todo: ask user first
          //verify by hashing url with room id
          //only those with roomId can add torrents
          if(sha256(args.url + multiplayer.roomId + from) == args.verification)
            dispatch('addTorrent', args.url)
          else console.log('Remote torrent verification failed')
          break
        case 'play':
        case 'pause':
          if(state.playing.infoHash === args.infoHash){ //check if watching same torrent
            dispatch('skipToFromRemote', args.time)
            dispatch(action)
          }
          break
        case 'disconnect':
          this.peerDisconnected(from)
      }
    } catch (ex) {
      console.log(ex)
    }
  }

  sendSkipTo(time, torrentHash){
    this.sendRemoteAction('skipTo', {time})
  }

  sendTorrent(torrentURL){
    try{
      const multiplayer = this.state.multiplayer
      this.sendRemoteAction('play-torrent', { 
        url: torrentURL,
        verification: sha256(torrentURL + multiplayer.roomId + multiplayer.node.peerId._idB58String)
      })
    }
    catch(ex){console.log(ex)}
  }

  sendRemoteAction(action, args){
    try{
      const multiplayer = this.state.multiplayer
      if(!multiplayer.inRoom) return
      var msg = {
        type: 'remoteAction',
        remoteAction: {
          action: action,
          args
        }
      }
      multiplayer.node.pubsub.publish(
        multiplayer.topic, 
        uint8ArrayFromString(JSON.stringify(msg))
      )
    }
    catch(ex){console.log(ex)}
  }

  sendState(){
    try {
      const multiplayer = this.state.multiplayer
      if(!multiplayer.inRoom) return;
      var curState = {
        type: 'identify',
        name: multiplayer.username
      }
      multiplayer.node.pubsub.publish(
        multiplayer.topic, 
        uint8ArrayFromString(JSON.stringify(curState))
      )
    } catch (e) {
      console.log(e)
    }
  }

  peerCheck(){ //check to see which peers are "online" at interval
    try{
      const now = new Date().getTime()
      for (const [peer, peerInfo] of this.state.multiplayer.peerInfo) {
        if(now-peerInfo.lastHeard > 10000){
          this.peerDisconnected(peer)
        }
      }
    }
    catch(ex){
      console.log(ex)
    }
  }

  peerDisconnected(id){
    const multiplayer = this.state.multiplayer
    if(multiplayer.peerInfo.has(id)){
      console.log('Peer disconnected: ' + multiplayer.peerInfo.get(id).name)
      multiplayer.peerInfo.delete(id)
    }
  }
}