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
}

/** Opens a socket on `room` and wires just enough protocol to sync and to be present. */
export async function connect(room: string): Promise<Client> {
  const response = await SELF.fetch(`https://relay.test/${room}`, {
    headers: { Upgrade: 'websocket', Origin: 'http://localhost:5173' },
  })
  const socket = response.webSocket
  if (!socket) throw new Error(`no websocket in the response (status ${response.status})`)
  socket.accept()
  socket.binaryType = 'arraybuffer'

  const doc = new Y.Doc()
  const awareness = new awarenessProtocol.Awareness(doc)

  socket.addEventListener('message', (event) => {
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
  })

  // `origin === socket` marks what arrived from the relay: echoing it back would loop.
  doc.on('update', (update, origin) => {
    if (origin === socket) return
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeUpdate(encoder, update)
    socket.send(encoding.toUint8Array(encoder))
  })

  awareness.on('update', (
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
  })

  return { doc, awareness, socket, close: () => socket.close() }
}

/** Waits for something the relay has to bring about, and names it when it never happens. */
export async function until(test: () => boolean, what: string, ms = 2000): Promise<void> {
  const started = Date.now()
  while (!test()) {
    if (Date.now() - started > ms) throw new Error(`timed out waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
