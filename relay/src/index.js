// ABOUTME: A Yjs relay on Cloudflare: one Durable Object per room, holding the document.
// ABOUTME: It stores nothing — the participants are the durable copies of their own route.

/**
 * Written here rather than taken off the shelf.
 *
 * `y-protocols` and `lib0` are already dependencies of the client's `y-websocket`, so both ends
 * of the wire agree on the protocol at one version, by construction. The published ports of
 * y-websocket to Workers were written against neither this client nor this runtime, and the
 * scoped `@y/websocket-server` crashes against a classic `yjs` with `store.getClock is not a
 * function`.
 *
 * Nothing is persisted and the object never hibernates. Yjs is a CRDT and every participant
 * holds the whole document, the host's copy sitting in `localStorage` besides: a relay that
 * stores nothing cannot serve anything stale, and a Durable Object with no connections is
 * unloaded, so an empty room simply stops existing. Hibernation is the lever if the free quota
 * ever complains, and it is not free — the document would have to be persisted and reloaded
 * around every frame.
 */

import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

export class Room {
  constructor() {
    this.doc = new Y.Doc()
    /** Every open socket. A room is nothing but its participants. */
    this.sockets = new Set()

    this.doc.on('update', (update, origin) => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_SYNC)
      syncProtocol.writeUpdate(encoder, update)
      this.broadcast(encoding.toUint8Array(encoder), origin)
    })

    this.awareness = new awarenessProtocol.Awareness(this.doc)
    // The relay is not a participant: it holds no cursor of its own.
    this.awareness.setLocalState(null)

    /** Which client ids each socket speaks for, so a departure takes its cursor with it. */
    this.controlled = new Map()

    this.awareness.on('update', ({ added, updated, removed }, origin) => {
      const owned = this.controlled.get(origin)
      if (owned) {
        added.concat(updated).forEach((id) => owned.add(id))
        removed.forEach((id) => owned.delete(id))
      }
      const changed = added.concat(updated, removed)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed),
      )
      this.broadcast(encoding.toUint8Array(encoder), origin)
    })
  }

  broadcast(data, except) {
    for (const socket of this.sockets) {
      if (socket === except) continue
      try {
        socket.send(data)
      } catch {
        this.drop(socket)
      }
    }
  }

  drop(socket) {
    const owned = this.controlled.get(socket)
    if (owned) {
      // Snapshotted once: `removeAwarenessStates` below emits `update` synchronously, and our
      // own listener (constructor, above) reacts to a removal by deleting straight out of this
      // same `owned` set — so by the time that call returns, `owned` is already empty and looping
      // over it again here would delete nothing.
      const ids = [...owned]
      // Attribute the removal to the socket itself: it is that socket's own cursor leaving, and
      // it lets `broadcast` skip resending to a socket that is already gone.
      awarenessProtocol.removeAwarenessStates(this.awareness, ids, socket)

      /**
       * `removeAwarenessStates` bumps a client's clock only when the id being removed equals
       * the *awareness instance's own* id (`y-protocols/awareness.js:167-182`) — never true
       * here, since this is the relay's own `Awareness`, not the departing participant's. Left
       * alone, the relay would go on remembering that client's last clock forever, and
       * `applyAwarenessUpdate` only accepts a clock strictly greater than the one it remembers
       * (`awareness.js:256`) — so a client reconnecting with the same Yjs client id and its
       * state otherwise unchanged would be silently rejected, invisible to the room until its
       * own `Awareness` instance's ~15s periodic renewal happens to carry its clock past what
       * the relay last saw. Forgetting the clock here instead removes that floor entirely: a
       * returning participant is accepted at whatever clock it next arrives with. This is safe
       * only because presence is ephemeral, self-renewing and last-writer-wins — there is
       * nothing here a lower clock could wrongly overwrite, unlike the document.
       *
       * Order matters: `removeAwarenessStates` above reads `this.awareness.meta` itself, and so
       * does our own `'update'` handler (constructor, above), synchronously, while building the
       * withdrawal broadcast via `encodeAwarenessUpdate`. Both must still see the pre-removal
       * clock, so these entries are deleted only once `removeAwarenessStates` has returned —
       * deleting them first would make that broadcast fault on a missing entry.
       */
      for (const id of ids) this.awareness.meta.delete(id)
    }
    this.controlled.delete(socket)
    this.sockets.delete(socket)
  }

  async fetch() {
    const { 0: client, 1: server } = new WebSocketPair()
    server.accept()
    // Without this, workerd hands binary frames over as a Blob, and Yjs speaks bytes.
    server.binaryType = 'arraybuffer'
    this.sockets.add(server)
    this.controlled.set(server, new Set())

    const sync = encoding.createEncoder()
    encoding.writeVarUint(sync, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(sync, this.doc)
    server.send(encoding.toUint8Array(sync))

    const states = this.awareness.getStates()
    if (states.size > 0) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, [...states.keys()]),
      )
      server.send(encoding.toUint8Array(encoder))
    }

    server.addEventListener('message', (event) => {
      const decoder = decoding.createDecoder(new Uint8Array(event.data))
      const encoder = encoding.createEncoder()
      switch (decoding.readVarUint(decoder)) {
        case MESSAGE_SYNC:
          encoding.writeVarUint(encoder, MESSAGE_SYNC)
          syncProtocol.readSyncMessage(decoder, encoder, this.doc, server)
          // A bare message type and nothing after it means there was nothing to answer.
          if (encoding.length(encoder) > 1) server.send(encoding.toUint8Array(encoder))
          break
        case MESSAGE_AWARENESS:
          awarenessProtocol.applyAwarenessUpdate(
            this.awareness,
            decoding.readVarUint8Array(decoder),
            server,
          )
          break
      }
    })

    server.addEventListener('close', () => this.drop(server))
    server.addEventListener('error', () => this.drop(server))

    return new Response(null, { status: 101, webSocket: client })
  }
}

/**
 * Who may open a socket.
 *
 * Not access control on rooms — whoever has the six-letter code still joins, which is the
 * design's intent. This keeps another website from spending our free quota, and browsers always
 * send an `Origin`. A request without one is not a website, and gets nothing.
 *
 * Both development ports appear: 5173 is `npm run dev`, 4173 is `vite preview`, which is what an
 * end-to-end harness serves `dist/` on.
 */
const ALLOWED_ORIGINS = new Set([
  'https://dudesons.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])

export default {
  async fetch(request, env) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('keystone relay', { status: 200 })
    }
    const origin = request.headers.get('Origin')
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return new Response('unknown origin', { status: 403 })
    }
    // The client appends the room name to the URL, and rooms are namespaced by dungeon.
    const room = decodeURIComponent(new URL(request.url).pathname.slice(1)) || 'default'
    return env.ROOM.get(env.ROOM.idFromName(room)).fetch(request)
  },
}
