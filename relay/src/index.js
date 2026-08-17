// ABOUTME: A Yjs relay on Cloudflare: one Durable Object per room, holding the document.
// ABOUTME: It stores nothing — the participants are the durable copies of their own route.

export class Room {}

export default {
  async fetch(request, env) {
    return new Response('keystone relay', { status: 200 })
  },
}
