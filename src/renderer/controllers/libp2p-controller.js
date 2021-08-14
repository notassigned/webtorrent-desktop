const { dispatch } = require('../lib/dispatcher')
const sha256 = require('js-sha256')
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
// const Websockets = require('libp2p-websockets')
// const WStar = require('libp2p-webrtc-star')
// const wrtc = require('electron-webrtc')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const Gossipsub = require('libp2p-gossipsub')
const Bootstrap = require('libp2p-bootstrap')
const KadDHT = require('libp2p-kad-dht')
const MDNS = require('libp2p-mdns')
const PubsubPeerDiscovery = require('libp2p-pubsub-peer-discovery')
const uint8ArrayFromString = require('uint8arrays/from-string')
const uint8ArrayToString = require('uint8arrays/to-string')
const address = require('address')

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
      ]
    },
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [NOISE],
      peerDiscovery: [Bootstrap, PubsubPeerDiscovery, MDNS],
      pubsub: Gossipsub,
      dht: KadDHT
    },
    config: {
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
    if(typeof this.state.inRoom === 'undefined') this.state.inRoom = false
    
  }

  joinRoom(username, roomId){
    try{
      (async () => {
        const state = this.state
        if(state.inRoom) {
          this.leaveRoom()
        }
        console.log('Joining room ' + roomId)
        state.peerInfo = new Map()
        state.multiplayerRoom = roomId
        state.topic = '/torrent2gether/1.0.0/'+sha256(roomId)
        if(typeof state.node === 'undefined'){
          state.node = await createNode()
        }
        
        state.username = username
  
        state.node.pubsub.subscribe(state.topic)
      
        state.node.pubsub.on(state.topic, (msg) => {
          this.handleMessage(msg)
        })
        console.log('started libp2p node ' + state.node.peerId)
        
        //start send state interval
        state.broadcastInterval = setInterval(() => {
          this.sendState()
        }, 2000)
        //start peer check interval
        state.peerCheckInterval = setInterval(() => {
          this.peerCheck()
        }, 2000)
        
        state.inRoom = true
      })()
    }
    catch(ex){
      console.log(ex)
    }
  }

  handleMessage(message){
    try{
      //console.log(message)
      const state = this.state
      const msg = JSON.parse(uint8ArrayToString(message.data))
      switch(msg.type){
        case 'identify':
          if(state.peerInfo.has(message.receivedFrom)){
            state.peerInfo.get(message.receivedFrom).name = msg.name
            state.peerInfo.get(message.receivedFrom).lastHeard = new Date().getTime()
          }
          else{
            console.log('peer joined: ' + msg.name)
            state.peerInfo.set(message.receivedFrom, {
              name: msg.name, 
              lastHeard: new Date().getTime()
            })
          }
          break
        case 'remoteAction':
          this.handleRemoteAction(msg.remoteAction.action, msg.remoteAction.args)
          break
        case 'disconnect':
          this.peerDisconnected(message.receivedFrom)
          break
      }
    }
    catch(ex){console.log(ex)}
  }

  handleRemoteAction(action, args){
    try {
      if(!this.state.inRoom) return
      switch(action)
      {
        case 'play-torrent':
          //todo: ask user first
          dispatch('addTorrent', args.url)
          break
        case 'play':
          dispatch('skipToFromRemote', args.time)
          dispatch('play')
          break
        case 'pause':
          dispatch('pause')
          dispatch('skipToFromRemote', args.time)
          break
      }
    } catch (ex) {
      console.log(ex)
    }
  }

  leaveRoom(){
    try{
      const state = this.state
      if (!state.inRoom) return;
      state.inRoom = false;
      var disconnectMsg = {
        type: 'disconnect'
      } 
      this.state.node.pubsub.publish(
        this.state.topic, 
        uint8ArrayFromString(JSON.stringify(disconnectMsg))
      )
      (async () => { await state.node.pubsub.unsubscribe(state.topic) })()
      state.peerInfo.clear()
      clearInterval(state.broadcastInterval)
      clearInterval(state.peerCheckInterval)
      console.log('Left room ' + state.multiplayerRoom)
    }
    catch(ex){
      console.log(ex)
    }
  }

  sendSkipTo(time){
    this.sendRemoteAction('skipTo', {time})
  }

  sendTorrent(torrentURL){
    try{
      this.sendRemoteAction('play-torrent', { url: torrentURL })
    }
    catch(ex){console.log(ex)}
  }

  sendRemoteAction(action, args){
    try{
      if(!this.state.inRoom) return
      var msg = {
        type: 'remoteAction',
        remoteAction: {
          action: action,
          args
        }
      }
      this.state.node.pubsub.publish(this.state.topic, 
        uint8ArrayFromString(JSON.stringify(msg)))
    }
    catch(ex){console.log(ex)}
  }

  sendState(){
    try {
      if(!this.state.inRoom) return;
      var curState = {
        type: 'identify',
        name: this.state.username
      }
      this.state.node.pubsub.publish(
        this.state.topic, 
        uint8ArrayFromString(JSON.stringify(curState))
      )
    } catch (e) {
      console.log(e)
    }
  }

  peerCheck(){ //check to see which peers are "online" at interval
    try{
      const now = new Date().getTime()
      for (const [peer, peerInfo] of this.state.peerInfo) {
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
    const state = this.state
    if(state.peerInfo.has(id)){
      console.log('peer disconnected: ' + state.peerInfo.get(id).name)
      state.peerInfo.delete(id)
    }
  }
}