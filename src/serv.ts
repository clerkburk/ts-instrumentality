if (typeof process === 'undefined' || typeof require === 'undefined')
    throw new Error('This module can only be used in a Node.js environment.')



import * as h2 from "http2"
import { URL } from "node:url"




/**
 * Represents metadata and reference tracking for an HTTP/2 client session.
 *
 * @property session - The underlying HTTP/2 client session instance.
 * @property refCount - The number of active references to this session.
 * @property [meta] - Additional metadata properties associated with the session.
 */
interface SessionData {
  readonly session: h2.ClientHttp2Session
  refCount: number
  [meta: string]: unknown
}
function sessionData_good(_sessionData: SessionData): boolean {
  return !(_sessionData.session.destroyed || _sessionData.session.closed ||
    _sessionData.session.socket.destroyed || !_sessionData.session.socket.writable || !_sessionData.session.socket.readable)
}



const openSessions: Map<URL, SessionData> = new Map()



export class HTTP2ClientSessionHandler implements AsyncDisposable, Disposable {
  readonly url: URL

  constructor(_url: URL, options?: h2.ClientSessionOptions | h2.SecureClientSessionOptions) {
    this.url = _url
    if (!openSessions.has(this.url))
      openSessions.set(this.url, {session: h2.connect(this.url, options), refCount: 0})
    const selfSess = openSessions.get(this.url)
    if (!selfSess)
      throw new Error("HTTP/2 session doesn't exist even after creation (failed to create?)")
    if (!sessionData_good(selfSess))
      throw new Error("HTTP/2 session isn't available")
    selfSess.refCount++
  }
  static async async_create(_url: string, options?: h2.ClientSessionOptions | h2.SecureClientSessionOptions): Promise<HTTP2ClientSessionHandler> {
    return new HTTP2ClientSessionHandler(new URL(_url), options)
  }

  [Symbol.dispose](): void {
    const sessionData = this.session_data()
    sessionData.refCount--
    if (sessionData.refCount <= 0) {
      sessionData.session.close()
      openSessions.delete(this.url)
    }
  }
  async [Symbol.asyncDispose](): Promise<void> {
    const sessionData = this.session_data()
    sessionData.refCount--
    if (sessionData.refCount <= 0) {
      sessionData.session.close()
      openSessions.delete(this.url)
    }
  }

  protected session_data(): SessionData {
    const entry = openSessions.get(this.url)
    if (!entry)
      throw new Error("HTTP/2 session no longer exists")
    if (!sessionData_good(entry))
      throw new Error("HTTP/2 session isn't available")
    return entry
  }
  get session(): h2.ClientHttp2Session {
    return this.session_data().session
  }

  // Helpers for requests
  async post(_route: string, _headers: h2.OutgoingHttpHeaders, _data?: Buffer | string): Promise<h2.ClientHttp2Stream> {
    if (!_headers[":method"] || _headers[":method"] !== "POST")
      throw new Error("POST method required in headers for post method (why would you call post otherwise?)")
    return new Promise<h2.ClientHttp2Stream>((resolve, reject) => {
      const req = this.session.request({":path": _route, ..._headers})
      req.on("response", () => resolve(req))
      req.on("error", (err) => reject(err))
      if (_data)
        req.write(_data)
      req.end()
    })
  }
  async get(_route: string, _headers: h2.OutgoingHttpHeaders): Promise<h2.ClientHttp2Stream> {
    if (!_headers[":method"] || _headers[":method"] !== "GET")
      throw new Error("GET method required in headers for get method (again, why would you call get otherwise?)")
    return new Promise<h2.ClientHttp2Stream>((resolve, reject) => {
      const req = this.session.request({":path": _route, ..._headers})
      req.on("response", () => resolve(req))
      req.on("error", (err) => reject(err))
      req.end()
    })
  }
}