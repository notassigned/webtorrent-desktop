<h1 align="center">
  <br>
  <a href="https://webtorrent.io">
    <img src="https://webtorrent.io/img/WebTorrent.png" alt="WebTorrent" width="200">
  </a>
  <br>
  WebTorrent Desktop (Multiplayer)
  <br>
  <br>
</h1>

<h4 align="center">The streaming torrent app. For Mac, Windows, and Linux.</h4>

## About
This fork of [Webtorrent Desktop](https://github.com/webtorrent/webtorrent-desktop) adds the ability to join a room with your friends and watch torrents together in a decentralized fasion. This is accomplished thanks to [libp2p](https://github.com/libp2p/libp2p), an awesome modular peer to peer networking stack.

To join a multiplayer room you can press CTRL+M, or click 'Torrent2gether' in the multiplayer dropdown menu. Simply enter a name (optional), and the name of a room. Anyone else who enters the same room name will be in the same [gossipsub](https://docs.libp2p.io/concepts/publish-subscribe/) topic. The application syncs play/pause/scrubbing with others in the room. You can send a torrent to other clients in the room by right clicking it and selecting "Play in multiplayer".

Check out the [libp2p controller](https://github.com/notassigned/webtorrent-desktop-multiplayer/blob/master/src/renderer/controllers/libp2p-controller.js) for a working libp2p example using bootstrapping, gossipsub, the kademlia-dht, webrtc-star for ipv4-only clients behind nat, mdns for local peer discovery, and ipv6.

Currently, [js-libp2p](https://github.com/libp2p/js-libp2p) doesn't support NAT hole-punching by default other than that which is built into the webrtc-star transport. This transport requires a centralized webrtc-star server that both peers must connect to in order to see each other. If peers have ipv6 addresses, this is not necessary as ipv6 addresses are public with no need for NAT.

## Install

### Recommended Install

Download the latest version of WebTorrent Desktop from
[the official website](https://webtorrent.io/desktop/):

### [✨ Download WebTorrent Desktop ✨](https://webtorrent.io/desktop/)

### Advanced Install

- Download specific installer files from the [GitHub releases](https://github.com/notassigned/webtorrent-desktop-multiplayer/releases) page.

- Use [Homebrew-Cask](https://github.com/caskroom/homebrew-cask) to install from the command line:

  ```
  $ brew install --cask webtorrent
  ```

- Try the (unstable) development version by cloning the Git repository. See the
  ["How to Contribute"](#how-to-contribute) instructions.

## Screenshots

<p align="center">
  <img src="https://webtorrent.io/img/screenshot-player3.png" alt="screenshot" align="center">
  <img src="https://webtorrent.io/img/screenshot-main.png" width="612" height="749" alt="screenshot" align="center">
</p>

## How to Contribute

If you are a libp2p wizard, take a look at the [libp2p-controller](https://github.com/notassigned/webtorrent-desktop-multiplayer/blob/master/src/renderer/controllers/libp2p-controller.js).

### Get the code

```
git clone https://github.com/notassigned/webtorrent-desktop-multiplayer.git
cd webtorrent-desktop
npm install
```

### Run the app

```
npm start
```

### Watch the code

Restart the app automatically every time code changes. Useful during development.

```
npm run watch
```

### Run linters

```
npm test
```

### Run integration tests

```
npm run test-integration
```

The integration tests use Spectron and Tape. They click through the app, taking screenshots and
comparing each one to a reference. Why screenshots?

* Ad-hoc checking makes the tests a lot more work to write
* Even diffing the whole HTML is not as thorough as screenshot diffing. For example, it wouldn't
  catch an bug where hitting ESC from a video doesn't correctly restore window size.
* Chrome's own integration tests use screenshot diffing iirc
* Small UI changes will break a few tests, but the fix is as easy as deleting the offending
  screenshots and running the tests, which will recreate them with the new look.
* The resulting Github PR will then show, pixel by pixel, the exact UI changes that were made! See
  https://github.com/blog/817-behold-image-view-modes

For MacOS, you'll need a Retina screen for the integration tests to pass. Your screen should have
the same resolution as a 2018 MacBook Pro 13".

For Windows, you'll need Windows 10 with a 1366x768 screen.

When running integration tests, keep the mouse on the edge of the screen and don't touch the mouse
or keyboard while the tests are running.

### Package the app

Builds app binaries for Mac, Linux, and Windows.

```
npm run package
```

To build for one platform:

```
npm run package -- [platform] [options]
```

Where `[platform]` is `darwin`, `linux`, `win32`, or `all` (default).

The following optional arguments are available:

- `--sign` - Sign the application (Mac, Windows)
- `--package=[type]` - Package single output type.
   - `deb` - Debian package
   - `rpm` - RedHat package
   - `zip` - Linux zip file
   - `dmg` - Mac disk image
   - `exe` - Windows installer
   - `portable` - Windows portable app
   - `all` - All platforms (default)

Note: Even with the `--package` option, the auto-update files (.nupkg for Windows,
-darwin.zip for Mac) will always be produced.

#### Windows build notes

The Windows app can be packaged from **any** platform.

Note: Windows code signing only works from **Windows**, for now.

Note: To package the Windows app from non-Windows platforms,
[Wine](https://www.winehq.org/) and [Mono](https://www.mono-project.com/) need
to be installed. For example on Mac, first install
[XQuartz](http://www.xquartz.org/), then run:

```
brew install wine mono
```

(Requires the [Homebrew](http://brew.sh/) package manager.)

#### Mac build notes

The Mac app can only be packaged from **macOS**.

#### Linux build notes

The Linux app can be packaged from **any** platform.

If packaging from Mac, install system dependencies with Homebrew by running:

```
npm run install-system-deps
```
#### Recommended readings to start working in the app

Electron (Framework to make native apps for Windows, OSX and Linux in Javascript):
https://electronjs.org/docs/tutorial/quick-start

React.js (Framework to work with Frontend UI):
https://reactjs.org/docs/getting-started.html

Material UI (React components that implement Google's Material Design.):
https://material-ui.com/getting-started/installation

### Privacy
and
WebTorrent Desktop collects some basic usage stats to help us make the app better.
For example, we track how well the play button works. How often does it succeed?
Time out? Show a missing codec error?

The app never sends any personally identifying information, nor does it track which
torrents you add.

## License

MIT. Copyright (c) [WebTorrent, LLC](https://webtorrent.io).
