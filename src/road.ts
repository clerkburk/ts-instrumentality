import * as rl from "node:readline"
import * as fs from "node:fs"
import * as fp from "node:fs/promises"
import * as ph from "node:path"
import * as os from "node:os"
import * as cr from "node:crypto"
import { on } from "node:events"
import * as bs from "./base.js"




export function roadTypeSync(pathorMode: string | number) {
  const mode = typeof pathorMode === 'string' ? fs.lstatSync(pathorMode).mode : pathorMode
  switch (mode & fs.constants.S_IFMT) {
    case fs.constants.S_IFREG: return File
    case fs.constants.S_IFDIR: return Folder
    case fs.constants.S_IFBLK: return BlockDevice
    case fs.constants.S_IFCHR: return CharacterDevice
    case fs.constants.S_IFLNK: return SymbolicLink
    case fs.constants.S_IFIFO: return Fifo
    case fs.constants.S_IFSOCK: return Socket
    default: throw new Error(`Unknown mode type ${mode} for path/mode: '${pathorMode}'`)
  }
}
export async function roadType(pathorMode: string | number) {
  const mode = typeof pathorMode === 'string' ? (await fp.lstat(pathorMode)).mode : pathorMode
  switch (mode & fs.constants.S_IFMT) {
    case fs.constants.S_IFREG: return File
    case fs.constants.S_IFDIR: return Folder
    case fs.constants.S_IFBLK: return BlockDevice
    case fs.constants.S_IFCHR: return CharacterDevice
    case fs.constants.S_IFLNK: return SymbolicLink
    case fs.constants.S_IFIFO: return Fifo
    case fs.constants.S_IFSOCK: return Socket
    default: throw new Error(`Unknown mode type ${mode} for path/mode: '${pathorMode}'`)
  }
}


export const lockedRoads = new Map<string, Promise<void>>()


export abstract class Road {
  protected pointsTo: string
  get isAt() { return this.pointsTo }
  get name() { return ph.basename(this.isAt) }
  mutable: boolean = true

  constructor(lookFor: string) {
    fs.accessSync(lookFor, fs.constants.F_OK)
    this.pointsTo = ph.resolve(lookFor)
    if (!(this instanceof roadTypeSync(this.isAt))) // this check is relevant for subclasses of Road
      throw new Error(`Type missmatch: Path '${this.isAt}' is not of constructed type ${this.constructor.name}`)
  }
  static async factory(lookFor: string) {
    await fp.access(lookFor, fs.constants.F_OK)
    const roadCtor = roadTypeSync(lookFor)
    return new roadCtor(lookFor)
  }
  static factorySync(lookFor: string) {
    fs.accessSync(lookFor, fs.constants.F_OK)
    const roadCtor = roadTypeSync(lookFor)
    return new roadCtor(lookFor)
  }

  verifySync(writeableCheck: boolean = true) {
    if (!fs.existsSync(this.isAt))
      return false
    try {
      fs.accessSync(this.isAt, fs.constants.F_OK)
      fs.accessSync(this.isAt, fs.constants.R_OK)
      if (writeableCheck)
        fs.accessSync(this.isAt, fs.constants.W_OK)
      return this instanceof roadTypeSync(this.isAt)
    } catch {
      return false
    }
  }
  async verify(writeableCheck: boolean = true) {
    try {
      await fp.access(this.isAt, fs.constants.F_OK)
      await fp.access(this.isAt, fs.constants.R_OK)
      if (writeableCheck)
        await fp.access(this.isAt, fs.constants.W_OK)
      return this instanceof roadTypeSync(this.isAt)
    } catch {
      return false
    }
  }
  protected async initChange(releaseLock = () => {}) { // using RAII pattern to prevent changes if the file is modified externally during an operation, which would cause data loss or other issues. This is done by acquiring a lock before the operation and releasing it afterward. If the file is modified externally, the lock will prevent the operation from proceeding, and an error will be thrown.
    if (!await this.verify())
      throw new Error(`Road to '${this.isAt}' (${this.constructor.name}) isn't the same as during construction, can't modify (OS type: ${fs.existsSync(this.isAt) ? roadTypeSync(this.isAt).name : 'nonexistent'})`)
    if (!this.mutable)
      throw new Error(`Attempting to modify road to '${this.isAt}' of type ${this.constructor.name} which's marked as immutable (unrelated to the actual OS file permissions)`)
    const lockedPath = this.isAt
    await (lockedRoads.get(lockedPath) || Promise.resolve())
    lockedRoads.set(lockedPath, new Promise<void>(res => releaseLock = res))
    return {
      [Symbol.dispose]() {
        releaseLock()
        releaseLock = () => { throw new Error("Lock already released, can't dispose") }
        lockedRoads.delete(lockedPath)
      },
      async [Symbol.asyncDispose]() {
        releaseLock()
        releaseLock = () => { throw new Error("Lock already released, can't dispose") }
        lockedRoads.delete(lockedPath)
      }
    }
  }
  protected initChangeSync(releaseLock = () => {}) {
    if (!this.verifySync())
      throw new Error(`Road to '${this.isAt}' (${this.constructor.name}) isn't the same as during construction, can't modify (OS type: ${fs.existsSync(this.isAt) ? roadTypeSync(this.isAt).name : 'nonexistent'})`)
    if (!this.mutable)
      throw new Error(`Attempting to modify road to '${this.isAt}' of type ${this.constructor.name} which's marked as immutable (unrelated to the actual OS file permissions)`)
    const lockedPath = this.isAt
    if (lockedRoads.has(lockedPath))
      throw new Error(`Road to '${this.isAt}' is currently locked by another operation, can't modify synchronously`)
    lockedRoads.set(lockedPath, new Promise<void>(res => releaseLock = res))
    return {
      [Symbol.dispose]() {
        releaseLock()
        releaseLock = () => { throw new Error("Lock already released, can't dispose") }
        lockedRoads.delete(lockedPath)
      },
      async [Symbol.asyncDispose]() {
        releaseLock()
        releaseLock = () => { throw new Error("Lock already released, can't dispose") }
        lockedRoads.delete(lockedPath)
      }
    }
  }
  existsSync() {
    return fs.existsSync(this.isAt) && (this instanceof roadTypeSync(this.isAt))
  }
  async exists() {
    try {
      await fp.access(this.isAt, fs.constants.F_OK)
      return this instanceof roadTypeSync(this.isAt)
    } catch {
      return false
    }
  }
  statsSync() {
    return fs.lstatSync(this.isAt)
  }
  async stats() {
    return fp.lstat(this.isAt)
  }

  depth() {
    return this.isAt.split(ph.sep).length - 1
  }
  parent() {
    return new Folder(ph.dirname(this.isAt))
  }
  ancestors() {
    const result: Folder[] = []
    let current: Folder = this.parent()
    while (current.isAt !== current.parent().isAt) {
      result.push(current)
      current = current.parent()
    }
    return result
  }

  accessibleSync(mode = fs.constants.F_OK) {
    try {
      fs.accessSync(this.isAt, mode)
      return true
    } catch (e) {
      if (e instanceof Error && (e.message.includes('ENOENT') || e.message.includes('EACCES')))
        return false
      throw e
    }
  }
  async accessible(mode = fs.constants.F_OK) {
    try {
      await fp.access(this.isAt, mode)
      return true
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('ENOENT') || e.message.includes('EACCES')))
        return false
      throw e
    }
  }
  async untilAccessible(mode = fs.constants.F_OK, abortSignal: AbortSignal, onEachAttempt?: () => unknown) {
    const watcher = fs.watch(this.isAt)
    try {
      if (await this.accessible(mode))
        return
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of on(watcher, 'change', { signal: abortSignal }))
        if (await this.accessible(mode))
          return
        else
          await onEachAttempt?.()
    } finally {
      watcher.close()
    }
  }
  async onChange<T>(abs: AbortSignal, cb?: () => T) {
    const watcher = fs.watch(this.isAt)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (let _ of on(watcher, 'change', { signal: abs }))
        return await cb?.() || null
      return null
    }
    catch(e) { throw e }
    finally { watcher.close() }
  }

  metaSync(suffixID = "tsInstrumentalityMeta"): Record<string, unknown> {
    if (!this.verifySync())
      throw new Error(`Road not verified, can't get metadata for '${this.isAt}'`)
    if (os.platform() === "win32")
      return JSON.parse(fs.readFileSync(`${this.isAt}:${suffixID}`, 'utf-8'))
    else
      throw new Error("Extended attributes are not supported on this platform")
  }
  async meta(suffixID = "tsInstrumentalityMeta"): Promise<Record<string, unknown>> {
    if (!await this.verify())
      throw new Error(`Road not verified, can't get metadata for '${this.isAt}'`)
    if (os.platform() === "win32")
      return JSON.parse(await fp.readFile(`${this.isAt}:${suffixID}`, 'utf-8'))
    else
      throw new Error("Extended attributes are not supported on this platform")
  }
  setMetaSync(meta: Record<string, unknown>, suffixID = "tsInstrumentalityMeta") {
    using _ = this.initChangeSync()
    if (!this.verifySync())
      throw new Error(`Road not verified, can't set metadata for '${this.isAt}'`)
    const metaString = JSON.stringify(meta)
    if (os.platform() === "win32")
      fs.writeFileSync(`${this.isAt}:${suffixID}`, metaString, 'utf-8')
    else
      throw new Error("Extended attributes are not supported on this platform")
  }
  async setMeta(meta: Record<string, unknown>, suffixID = "tsInstrumentalityMeta") {
    using _ = await this.initChange()
    if (!await this.verify())
      throw new Error(`Road not verified, can't set metadata for '${this.isAt}'`)
    const metaString = JSON.stringify(meta)
    if (os.platform() === "win32")
      await fp.writeFile(`${this.isAt}:${suffixID}`, metaString, 'utf-8')
    else
      throw new Error("Extended attributes are not supported on this platform")
  }

  abstract deleteSync(): void
  abstract delete(): Promise<void>
  abstract moveSync(into: Folder): void
  abstract move(into: Folder): Promise<void>
  abstract copySync(into: Folder): this
  abstract copy(into: Folder): Promise<this>
  abstract renameSync(to: string): void
  abstract rename(to: string): Promise<void>
}


export class File extends Road {
  get ext() { return ph.extname(this.isAt) }
  get noExt() { return ph.basename(this.isAt, this.ext) }

  static createSync(at: string) {
    try {
      fs.accessSync(at, fs.constants.F_OK)
    } catch {
      fs.writeFileSync(at, "")
    }
    return new File(at)
  }
  static async create(at: string) {
    try {
      await fp.access(at, fs.constants.F_OK)
    } catch {
      await fp.writeFile(at, "")
    }
    return new File(at)
  }

  readSync(): Buffer
  readSync(encoding: BufferEncoding, flag?: string): string
  readSync(encoding?: BufferEncoding, flag?: string): Buffer | string {
    if (encoding)
      return fs.readFileSync(this.isAt, { encoding: encoding, flag: flag })
    else
      return fs.readFileSync(this.isAt)
  }
  async read(): Promise<Buffer>
  async read(encoding: BufferEncoding, flag?: string): Promise<string>
  async read(encoding?: BufferEncoding, flag?: string): Promise<Buffer | string> {
    if (encoding)
      return fp.readFile(this.isAt, { encoding: encoding, flag: flag })
    else
      return fp.readFile(this.isAt)
  }

  // Bizarre reading
  *itBuffSync(chunkSize: number = 64 * 1024, flags: string | number = 'r', mode?: fs.Mode) {
    const fd = fs.openSync(this.isAt, flags, mode)
    try {
      const buffer = Buffer.alloc(chunkSize)
      let bytesRead: number
      do {
        bytesRead = fs.readSync(fd, buffer, 0, chunkSize, null)
        if (bytesRead > 0)
          yield buffer.subarray(0, bytesRead)
      } while (bytesRead === chunkSize)
    } finally {
      fs.closeSync(fd)
    }
  }
  async *itBuff(chunkSize: number = 64 * 1024, flags: string | number = 'r', mode?: fs.Mode) {
    const fd = await fp.open(this.isAt, flags, mode)
    try {
      const buffer = Buffer.alloc(chunkSize)
      let bytesRead: number
      do {
        const readResult = await fd.read(buffer, 0, chunkSize, null)
        bytesRead = readResult.bytesRead
        if (bytesRead > 0)
          yield buffer.subarray(0, bytesRead)
      } while (bytesRead === chunkSize)
    } finally {
      await fd.close()
    }
  }
  async *itLines(options: BufferEncoding | Parameters<typeof fs.createReadStream>[1] = { encoding: 'utf-8' }) {
    const readStream = fs.createReadStream(this.isAt, options)
    const rlInterface = rl.createInterface({ input: readStream, crlfDelay: Infinity })
    try {
      for await (const line of rlInterface)
        yield line
    } finally {
      rlInterface.close()
      readStream.destroy()
    }
  }
  computeHashSync(algorithm?: string, options?: cr.HashOptions): Buffer
  computeHashSync(algorithm?: string, options?: cr.HashOptions, encoding?: cr.BinaryToTextEncoding): string
  computeHashSync(algorithm = "sha256", options?: cr.HashOptions, encoding?: cr.BinaryToTextEncoding): Buffer | string {
    const hash = cr.createHash(algorithm, options)
    for (const chunk of this.itBuffSync())
      hash.update(chunk)
    return encoding ? hash.digest(encoding) : hash.digest()
  }
  async computeHash(algorithm?: string, options?: cr.HashOptions): Promise<Buffer>
  async computeHash(algorithm?: string, options?: cr.HashOptions, encoding?: cr.BinaryToTextEncoding): Promise<string>
  async computeHash(algorithm = "sha256", options?: cr.HashOptions, encoding?: cr.BinaryToTextEncoding): Promise<Buffer | string> {
    const hash = cr.createHash(algorithm, options)
    for await (const chunk of this.itBuff())
      hash.update(chunk)
    return encoding ? hash.digest(encoding) : hash.digest()
  }
  streamHash(algorithm = "sha256", options?: cr.HashOptions) {
    const hash = cr.createHash(algorithm, options)
    const readStream = fs.createReadStream(this.isAt)
    readStream.on('data', chunk => hash.update(chunk))
    readStream.on('end', () => hash.digest())
    return readStream
  }

  writeSync(data: Buffer | string, options?: fs.WriteFileOptions) {
    using _ = this.initChangeSync()
    fs.writeFileSync(this.isAt, data, options)
  }
  async write(data: Buffer | string, options?: fs.WriteFileOptions) {
    using _ = await this.initChange()
    await fp.writeFile(this.isAt, data, options)
  }
  appendSync(data: Buffer | string, options?: fs.WriteFileOptions) {
    using _ = this.initChangeSync()
    fs.appendFileSync(this.isAt, data, options)
  }
  async append(data: Buffer | string, options?: fs.WriteFileOptions) {
    using _ = await this.initChange()
    await fp.appendFile(this.isAt, data, options)
  }

  async sameAs(other: File) {
    if (this.isAt === other.isAt)
      return true
    else if ((await fp.lstat(this.isAt)).size !== (await fp.lstat(other.isAt)).size)
      return false
    const thisIter = this.itBuff()
    const otherIter = other.itBuff()
    while (true) {
      const [a, b] = await Promise.all([thisIter.next(), otherIter.next()])
      if (a.done && b.done) return true
      if (a.done !== b.done) return false
      if (!a.value!.equals(b.value!)) return false
    }
  }
  sameAsSync(other: File) {
    if (this.isAt === other.isAt)
      return true
    else if (fs.statSync(this.isAt).size !== fs.statSync(other.isAt).size)
      return false
    const thisIter = this.itBuffSync()
    const otherIter = other.itBuffSync()
    while (true) {
      const a = thisIter.next()
      const b = otherIter.next()
      if (a.done && b.done) return true
      if (a.done !== b.done) return false
      if (!a.value!.equals(b.value!)) return false
    }
  }

  deleteSync() {
    using _ = this.initChangeSync()
    fs.unlinkSync(this.isAt)
  }
  async delete() {
    using _ = await this.initChange()
    await fp.unlink(this.isAt)
  }
  moveSync(into: Folder) {
    using _ = this.initChangeSync()
    const newPath = into.join(this.name)
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  async move(into: Folder) {
    using _ = await this.initChange()
    const newPath = into.join(this.name)
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
  copySync(into: Folder): this {
    const newPath = into.join(this.name)
    fs.copyFileSync(this.isAt, newPath)
    return new File(newPath) as this
  }
  async copy(into: Folder): Promise<this> {
    const newPath = into.join(this.name)
    await fp.copyFile(this.isAt, newPath)
    return new File(newPath) as this
  }
  renameSync(to: string) {
    using _ = this.initChangeSync()
    const newPath = this.parent().join(to)
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  async rename(to: string) {
    using _ = await this.initChange()
    const newPath = this.parent().join(to)
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
}


export class Folder extends Road {
  static sysRoot() { return new Folder(ph.parse(process.cwd()).root) }
  static home() { return new Folder(os.homedir()) }
  static tmp() { return new Folder(os.tmpdir()) }
  static here() { return new Folder(process.cwd()) }

  static async create(at: string): Promise<Folder> {
    try {
      await fp.access(at, fs.constants.F_OK)
    } catch {
      await fp.mkdir(at, { recursive: true })
    }
    return new Folder(at)
  }
  static createSync(at: string): Folder {
    try {
      fs.accessSync(at, fs.constants.F_OK)
    } catch {
      fs.mkdirSync(at, { recursive: true })
    }
    return new Folder(at)
  }

  join(...paths: string[]) {
    return ph.join(this.isAt, ...paths)
  }

  itSync(): Iterable<Road>
  itSync<T extends Road>(expectedType: new (_: string) => T): Iterable<T>
  *itSync<T extends Road>(expectedType?: new (_: string) => T): Iterable<Road> | Iterable<T> {
    for (const entry of fs.readdirSync(this.isAt)) {
      const road = Road.factorySync(this.join(entry))
      if (!expectedType || road instanceof expectedType)
        yield road
    }
  }
  it(): AsyncIterable<Road>
  it<T extends Road>(expectedType: new (_: string) => T): AsyncIterable<T>
  async *it<T extends Road>(expectedType?: new (_: string) => T): AsyncIterable<Road> | AsyncIterable<T> {
    for (const entry of await fp.readdir(this.isAt)) {
      const road = await Road.factory(this.join(entry))
      if (!expectedType || road instanceof expectedType)
        yield road
    }
  }
  listSync(): Road[]
  listSync<T extends Road>(expectedType: new (_: string) => T): T[]
  listSync<T extends Road>(expectedType?: new (_: string) => T): Road[] | T[] {
    const entries = fs.readdirSync(this.isAt).map(entry => Road.factorySync(this.join(entry)))
    if (!expectedType)
      return entries
    return entries.filter(entry => entry instanceof expectedType) as unknown as T[]
  }
  async list(): Promise<Road[]>
  async list<T extends Road>(_expectedType: new (_: string) => T): Promise<T[]>
  async list<T extends Road>(_expectedType?: new (_: string) => T): Promise<Road[] | T[]> {
    const entries = (await fp.readdir(this.isAt)).map(async entry => Road.factory(this.join(entry)))
    const resolvedEntries = await Promise.all(entries)
    if (!_expectedType)
      return resolvedEntries
    return resolvedEntries.filter(entry => entry instanceof _expectedType) as unknown as T[]
  }

  findSync(name: string): Road | null
  findSync<T extends Road>(name: string, _expectedType: new (_: string) => T): T | null
  findSync<T extends Road>(name: string, _expectedType?: new (_: string) => T): Road | T | null {
    try {
      fs.accessSync(this.join(name), fs.constants.F_OK)
      const found = Road.factorySync(this.join(name))
      if (!_expectedType)
        return found
      if (found instanceof _expectedType)
        return found as T
      return null
    } catch {
      return null
    }
  }

  async find(name: string): Promise<Road | null>
  async find<T extends Road>(name: string, _expectedType: new (_: string) => T): Promise<T | null>
  async find<T extends Road>(name: string, _expectedType?: new (_: string) => T): Promise<Road | T | null> {
    try {
      await fp.access(this.join(name), fs.constants.F_OK)
      const found = await Road.factory(this.join(name))
      if (!_expectedType)
        return found
      if (found instanceof _expectedType)
        return found as T
      return null
    } catch {
      return null
    }
  }

  addSync<T extends Road>(name: string, createable: { createSync: (at: string) => T }): T {
    const newPath = this.join(name)
    createable.createSync(newPath)
    return Road.factorySync(newPath) as unknown as T
  }
  async add<T extends Road>(name: string, createable: { create: (at: string) => Promise<T> }): Promise<T> {
    const newPath = this.join(name)
    await createable.create(newPath)
    return Road.factory(newPath) as unknown as Promise<T>
  }

  deleteSync(options: fs.RmOptions = { recursive: true }) {
    using _ = this.initChangeSync()
    fs.rmSync(this.isAt, options)
  }
  async delete(options: fs.RmOptions = { recursive: true }) {
    using _ = await this.initChange()
    await fp.rm(this.isAt, options)
  }
  moveSync(into: Folder) {
    using _ = this.initChangeSync()
    const newPath = into.join(this.name)
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  async move(into: Folder) {
    using _ = await this.initChange()
    const newPath = into.join(this.name)
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
  copySync(into: Folder): this {
    const newPath = into.join(this.name)
    fs.cpSync(this.isAt, newPath, { recursive: true })
    return new Folder(newPath) as this
  }
  async copy(into: Folder): Promise<this> {
    const newPath = into.join(this.name)
    await fp.cp(this.isAt, newPath, { recursive: true })
    return new Folder(newPath) as this
  }
  renameSync(to: string) {
    using _ = this.initChangeSync()
    const newPath = this.parent().join(to)
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  async rename(to: string) {
    using _ = await this.initChange()
    const newPath = this.parent().join(to)
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
}
export const Dir = Folder
export const Directory = Folder
export const Dict = Folder
export const Dictionary = Folder


export class SymbolicLink extends Road {
  static async create(at: string, target: Road) {
    try {
      await fp.access(at, fs.constants.F_OK)
    } catch {
      await fp.symlink(target.isAt, at)
    }
    return new SymbolicLink(at)
  }
  static createSync(_at: string, _target: Road) {
    try {
      fs.accessSync(_at, fs.constants.F_OK)
    } catch {
      fs.symlinkSync(_target.isAt, _at)
    }
    return new SymbolicLink(_at)
  }

  targetSync() {
    return Road.factorySync(ph.resolve(ph.dirname(this.isAt), fs.readlinkSync(this.isAt)))
  }
  async target() {
    return Road.factory(ph.resolve(ph.dirname(this.isAt), await fp.readlink(this.isAt)))
  }
  retargetSync(_newTarget: Road) {
    this.deleteSync()
    fs.symlinkSync(_newTarget.isAt, this.isAt)
  }
  async retarget(_newTarget: Road) {
    await this.delete()
    return fp.symlink(_newTarget.isAt, this.isAt)
  }

  deleteSync() {
    using _ = this.initChangeSync()
    fs.unlinkSync(this.isAt)
  }
  async delete() {
    using _ = await this.initChange()
    await fp.unlink(this.isAt)
  }
  moveSync(_into: Folder) {
    using _ = this.initChangeSync()
    const newPath = _into.join(this.name)
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  async move(_into: Folder) {
    using _ = await this.initChange()
    const newPath = _into.join(this.name)
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
  copySync(_into: Folder): this {
    const newPath = _into.join(this.name)
    const target = this.targetSync()
    fs.symlinkSync(target.isAt, newPath)
    return new SymbolicLink(newPath) as this
  }
  async copy(_into: Folder): Promise<this> {
    const newPath = _into.join(this.name)
    const target = await this.target()
    await fp.symlink(target.isAt, newPath)
    return new SymbolicLink(newPath) as this
  }
  renameSync(_to: string) {
    using _ = this.initChangeSync()
    const newPath = this.parent().join(_to)
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  async rename(_to: string) {
    using _ = await this.initChange()
    const newPath = this.parent().join(_to)
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
}
export const Symlink = SymbolicLink


export abstract class UnusableRoad extends Road {
  override readonly mutable: boolean = false // Modification is most likely to cause system issues (e.g. deleting a device file)
  constructor(_at: string) {
    super(_at)
    Object.freeze(this)
  }
  error(): never { throw new Error(`${this.constructor.name} at '${this.isAt}' is a system-level resource thus intentionally made immutable.`) }
  override initChangeSync(): never { return this.error() }
  override async initChange(): Promise<never> { return this.error() }
  override deleteSync(): never { return this.error() }
  override async delete(): Promise<never> { return this.error() }
  override moveSync(): never { return this.error() }
  override async move(): Promise<never> { return this.error() }
  override copySync(): never { return this.error() }
  override async copy(): Promise<never> { return this.error() }
  override renameSync(): never { return this.error() }
  override async rename(): Promise<never> { return this.error() }
}
export class BlockDevice extends UnusableRoad { }
export class CharacterDevice extends UnusableRoad { }
export class Fifo extends UnusableRoad { }
export class Socket extends UnusableRoad { }


export class IdentifiableFile extends File {
  protected identifier: Buffer
  constructor(_at: string) {
    super(_at)
    this.identifier = this.computeHashSync()
  }
  hash() { return Buffer.from(this.identifier) }
  override verifySync(writeableCheck: boolean = true) {
    return super.verifySync(writeableCheck) && this.identifier.equals(this.computeHashSync())
  }
  override async verify(writeableCheck: boolean = true) {
    return await super.verify(writeableCheck) && this.identifier.equals(await this.computeHash())
  }
  override writeSync(data: Buffer | string, options?: fs.WriteFileOptions) {
    super.writeSync(data, options)
    this.identifier = this.computeHashSync()
  }
  override async write(data: Buffer | string, options?: fs.WriteFileOptions) {
    await super.write(data, options)
    this.identifier = await this.computeHash()
  }
  override appendSync(data: Buffer | string, options?: fs.WriteFileOptions) {
    super.appendSync(data, options)
    this.identifier = this.computeHashSync()
  }
  override async append(data: Buffer | string, options?: fs.WriteFileOptions) {
    await super.append(data, options)
    this.identifier = await this.computeHash()
  }
}


export class TempFile extends File implements AsyncDisposable, Disposable {
  protected readonly token: symbol
  constructor(exitOnSignal: readonly string[] = ['exit', 'SIGINT', 'SIGTERM']) {
    const randomName = `tempfile_${Date.now()}_${cr.randomUUID()}.tmp`
    super(Folder.tmp().addSync(randomName, File).isAt)
    if (exitOnSignal.length > 0)
      exitOnSignal.forEach(e => process.on(e, () => fs.rmSync(this.isAt, { force: true })))
    this.token = bs.disposeable(this)
    Object.freeze(this)
  }
  [Symbol.dispose]() { fs.rmSync(this.isAt, { force: true }); bs.disposeableFinalizer.unregister(this.token) }
  async [Symbol.asyncDispose]() { await fp.rm(this.isAt, { force: true }); bs.disposeableFinalizer.unregister(this.token) }
  destructor() { fs.rmSync(this.isAt, { force: true }) }
}
export class TempFolder extends Folder implements AsyncDisposable, Disposable {
  protected readonly token: symbol
  constructor(exitOnSignal: readonly string[] = ['exit', 'SIGINT', 'SIGTERM']) {
    const randomName = `tempfolder_${Date.now()}_${cr.randomUUID()}`
    super(Folder.tmp().addSync(randomName, Folder).isAt)
    if (exitOnSignal.length > 0)
      exitOnSignal.forEach(e => process.on(e, () => fs.rmSync(this.isAt, { recursive: true, force: true })))
    this.token = bs.disposeable(this)
    Object.freeze(this)
  }
  [Symbol.dispose]() { fs.rmSync(this.isAt, { recursive: true, force: true }); bs.disposeableFinalizer.unregister(this.token) }
  async [Symbol.asyncDispose]() { await fp.rm(this.isAt, { recursive: true, force: true }); bs.disposeableFinalizer.unregister(this.token) }
  destructor() { fs.rmSync(this.isAt, { recursive: true, force: true }) }
}



// const target = Road.factorySync(process.argv[2]!)
// console.debug(SymbolicLink.createSync(".cache/" + target.name, target))