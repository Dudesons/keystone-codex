// ABOUTME: A minimal y-websocket client, used to drive the relay from inside workerd.
// ABOUTME: Hand-written on purpose: what is under test is the relay's half of the protocol.

import { SELF } from 'cloudflare:test'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

export interface Client {
  doc: Y.Doc
  awareness: awarenessProtocol.Awareness
  socket: WebSocket
  close(): void
  /**
   * Opens a fresh socket for the same participant: the same `doc` and `awareness`, so the Yjs
   * client id is unchanged. This is what "Return to the room" does on a paused session — a new
   * socket, not a new participant — and a fresh `connect()` cannot stand in for it, since that
   * would hand out a new client id and prove nothing about a return.
   */
  reconnect(): Promise<void>
}

/** Opens a socket on `room`, the plumbing shared by a first connection and a reconnection. */
async function open(room: string): Promise<WebSocket> {
  const response = await SELF.fetch(`https://relay.test/${room}`, {
    headers: { Upgrade: 'websocket', Origin: 'http://localhost:5173' },
  })
  const socket = response.webSocket
  if (!socket) throw new Error(`no websocket in the response (status ${response.status})`)
  socket.accept()
  socket.binaryType = 'arraybuffer'
  return socket
}

/** Wires one socket to a doc and an awareness, both ways, and returns how to stop. */
function wire(socket: WebSocket, doc: Y.Doc, awareness: awarenessProtocol.Awareness): () => void {
  const onMessage = (event: MessageEvent) => {
    if (!(event.data instanceof ArrayBuffer)) {
      throw new Error(`expected bytes, got ${event.data?.constructor?.name}`)
    }
    const decoder = decoding.createDecoder(new Uint8Array(event.data))
    const encoder = encoding.createEncoder()
    switch (decoding.readVarUint(decoder)) {
      case MESSAGE_SYNC: {
        encoding.writeVarUint(encoder, MESSAGE_SYNC)
        syncProtocol.readSyncMessage(decoder, encoder, doc, socket)
        // A bare message type and nothing after it means there was nothing to answer.
        if (encoding.length(encoder) > 1) socket.send(encoding.toUint8Array(encoder))
        break
      }
      case MESSAGE_AWARENESS:
        awarenessProtocol.applyAwarenessUpdate(
          awareness,
          decoding.readVarUint8Array(decoder),
          socket,
        )
        break
    }
  }
  socket.addEventListener('message', onMessage)

  // `origin === socket` marks what arrived from the relay: echoing it back would loop.
  const onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === socket) return
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeUpdate(encoder, update)
    socket.send(encoding.toUint8Array(encoder))
  }
  doc.on('update', onDocUpdate)

  const onAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === socket) return
    const changed = added.concat(updated, removed)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changed),
    )
    socket.send(encoding.toUint8Array(encoder))
  }
  awareness.on('update', onAwarenessUpdate)

  // Mirrors `y-websocket`'s own `onopen`: a socket that opens onto an awareness that already
  // carries a local state — true only on reconnect, since `connect` always starts from an empty
  // one — must announce it again. Nothing else will: the `update` event above only fires for a
  // state that changes, and reconnecting changes nothing about it.
  if (awareness.getLocalState() !== null) {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, [doc.clientID]),
    )
    socket.send(encoding.toUint8Array(encoder))
  }

  return () => {
    socket.removeEventListener('message', onMessage)
    doc.off('update', onDocUpdate)
    awareness.off('update', onAwarenessUpdate)
  }
}

/** Opens a socket on `room` and wires just enough protocol to sync and to be present. */
export async function connect(room: string): Promise<Client> {
  const doc = new Y.Doc()
  const awareness = new awarenessProtocol.Awareness(doc)
  const socket = await open(room)
  let unwire = wire(socket, doc, awareness)

  const client: Client = {
    doc,
    awareness,
    socket,
    close: () => socket.close(),
    reconnect: async () => {
      unwire()
      /**
       * A real client does not resend its old presence unchanged on reconnect. Every peer that
       * saw this client depart remembers the exact clock it held when it left —
       * `removeAwarenessStates` only advances a clock for the awareness instance's *own* id,
       * never for a foreign one being removed (`y-protocols/awareness.js`) — so re-announcing
       * at that same clock is indistinguishable from a stale duplicate and gets discarded
       * everywhere, relay included. Re-setting the local state, even to itself, is what
       * advances the clock — mirroring the fix in `useRouteDoc.ts`'s `resumeRoom`. `unwire()`
       * runs first so this doesn't try to broadcast the bump over the now-closed old socket;
       * `wire()`'s own "resend if there's a local state" step, below, is what actually puts the
       * now-advanced clock on the wire once the new socket opens.
       */
      if (awareness.getLocalState() !== null) awareness.setLocalState(awareness.getLocalState())
      const next = await open(room)
      client.socket = next
      unwire = wire(next, doc, awareness)
    },
  }
  return client
}

/** Waits for something the relay has to bring about, and names it when it never happens. */
export async function until(test: () => boolean, what: string, ms = 2000): Promise<void> {
  const started = Date.now()
  while (!test()) {
    if (Date.now() - started > ms) throw new Error(`timed out waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
