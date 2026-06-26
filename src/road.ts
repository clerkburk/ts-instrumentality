import * as rl from "node:readline"
import * as fs from "node:fs"
import * as fp from "node:fs/promises"
import * as ph from "node:path"
import * as os from "node:os"
import * as cr from "node:crypto"
import { on } from "node:events"



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
    if (!(this instanceof roadTypeSync(this.isAt)))
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

  readStream() {
    const stream = fs.createReadStream(this.isAt)
    ;(stream as any)[Symbol.dispose] = stream.close
    ;(stream as any)[Symbol.asyncDispose] = async () => stream.close()
    return stream as fs.ReadStream & {
      [Symbol.dispose](): void
      [Symbol.asyncDispose](): Promise<void>
    }
  }
  writeStream() {
    const _ = this.initChangeSync() // manual disposal as the stream needs to stay open after this function returns
    const stream = fs.createWriteStream(this.isAt)
    const dispose = () => {
      _[Symbol.dispose]()
      stream.close()
    }
    stream.on('close', dispose)
    stream.on('error', dispose)
    stream.on('finish', dispose)
    ;(stream as any)[Symbol.dispose] = dispose
    ;(stream as any)[Symbol.asyncDispose] = async () => dispose()
    return stream as fs.WriteStream & {
      [Symbol.dispose](): void
      [Symbol.asyncDispose](): Promise<void>
    }
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
    return fp.unlink(this.isAt)
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

  static async create(_at: string): Promise<Folder> {
    try {
      await fp.access(_at, fs.constants.F_OK)
    } catch {
      await fp.mkdir(_at, { recursive: true })
    }
    return new Folder(_at)
  }
  static createSync(_at: string): Folder {
    try {
      fs.accessSync(_at, fs.constants.F_OK)
    } catch {
      fs.mkdirSync(_at, { recursive: true })
    }
    return new Folder(_at)
  }

  // Prefered way of creating entries into a folder
  createFileSync(name: string) {
    try { fs.accessSync(this.join(name), fs.constants.F_OK) }
    catch { fs.writeFileSync(this.join(name), "") }
    return new File(this.join(name))
  }
  async createFile(name: string) {
    try { await fp.access(this.join(name), fs.constants.F_OK) }
    catch { await fp.writeFile(this.join(name), "") }
    return new File(this.join(name))
  }

  createFolderSync(name: string) {
    try { fs.accessSync(this.join(name), fs.constants.F_OK) }
    catch { fs.mkdirSync(this.join(name), { recursive: true }) }
    return new Folder(this.join(name))
  }
  async createFolder(name: string) {
    try { await fp.access(this.join(name), fs.constants.F_OK) }
    catch { await fp.mkdir(this.join(name), { recursive: true }) }
    return new Folder(this.join(name))
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

  deleteSync(options: fs.RmOptions = { recursive: true }) {
    using _ = this.initChangeSync()
    fs.rmSync(this.isAt, options)
  }
  async delete(options: fs.RmOptions = { recursive: true }) {
    using _ = await this.initChange()
    return fp.rm(this.isAt, options)
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
  static async create(at: string, target?: Road) {
    try {
      await fp.access(at, fs.constants.F_OK)
    } catch {
      await fp.symlink(target?.isAt ?? "", at)
    }
    return new SymbolicLink(at)
  }
  static createSync(_at: string, _target?: Road) {
    try {
      fs.accessSync(_at, fs.constants.F_OK)
    } catch {
      fs.symlinkSync(_target?.isAt ?? "", _at)
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
    return fp.unlink(this.isAt)
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
  override initChangeSync(): never { throw new Error(`Cannot modify type ${this.constructor.name} at '${this.isAt}'`) }
  override async initChange(): Promise<never> { throw new Error(`Cannot modify type ${this.constructor.name} at '${this.isAt}'`) }
  deleteSync(): never { throw new Error(`Cannot delete type ${this.constructor.name} at '${this.isAt}'`) }
  async delete(): Promise<never> { throw new Error(`Cannot delete type ${this.constructor.name} at '${this.isAt}'`) }
  moveSync(): never { throw new Error(`Cannot move type ${this.constructor.name} at '${this.isAt}'`) }
  async move(): Promise<never> { throw new Error(`Cannot move type ${this.constructor.name} at '${this.isAt}'`) }
  copySync(): never { throw new Error(`Cannot copy type ${this.constructor.name} at '${this.isAt}'`) }
  async copy(): Promise<never> { throw new Error(`Cannot copy type ${this.constructor.name} at '${this.isAt}'`) }
  renameSync(): never { throw new Error(`Cannot rename type ${this.constructor.name} at '${this.isAt}'`) }
  async rename(): Promise<never> { throw new Error(`Cannot rename type ${this.constructor.name} at '${this.isAt}'`) }
}
export class BlockDevice extends UnusableRoad { }
export class CharacterDevice extends UnusableRoad { }
export class Fifo extends UnusableRoad { }
export class Socket extends UnusableRoad { }


export class IdentifiableFolderExperimental extends Folder {
  protected identifier: Buffer
  get hash() { return Buffer.from(this.identifier) }
  constructor(_at: string) {
    super(_at)
    this.identifier = this.computeHashSync()
  }
  override verifySync() {
    if (!super.verifySync())
      return false
    return this.identifier.equals(this.computeHashSync())
  }
  override async verify() {
    if (!await super.verify())
      return false
    return this.identifier.equals(await this.computeHash())
  }
  override createFileSync(name: string): File {
    const file = super.createFileSync(name)
    this.identifier = this.computeHashSync()
    return file
  }
  override async createFile(name: string): Promise<File> {
    const file = await super.createFile(name)
    this.identifier = await this.computeHash()
    return file
  }
  computeHashSync(algorithm: string = "sha256", options?: cr.HashOptions): Buffer {
    const hash = cr.createHash(algorithm, options)
    for (const f of this.listSync(File))
      hash.update(f.computeHashSync())
    return hash.digest()
  }
  async computeHash(algorithm: string = "sha256", options?: cr.HashOptions): Promise<Buffer> {
    const hash = cr.createHash(algorithm, options)
    for (const f of await this.list(File))
      hash.update(await f.computeHash())
    return hash.digest()
  }
  refreshSync() {
    this.identifier = this.computeHashSync()
  }
  async refresh() {
    this.identifier = await this.computeHash()
  }
}


export class IdentifiableFile extends File {
  protected identifier: Buffer
  get hash() { return Buffer.from(this.identifier) }
  constructor(_at: string) {
    super(_at)
    this.identifier = this.computeHashSync()
  }
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
  constructor(ext = '.tmp') {
    const randomName = `tempfile_${Date.now()}_${cr.randomUUID()}${ext}`
    super(Folder.tmp().createFileSync(randomName).isAt)
    ;['exit', 'SIGINT', 'SIGTERM'].forEach(e => process.on(e, () => fs.rmSync(this.isAt)))
    Object.freeze(this)
  }
  [Symbol.dispose]() { fs.rmSync(this.isAt) }
  async [Symbol.asyncDispose]() { return fp.rm(this.isAt) }
}


export class TempFolder extends Folder implements AsyncDisposable, Disposable {
  constructor() {
    super(Folder.tmp().createFolderSync(`tempfolder_${Date.now()}_${cr.randomUUID()}`).isAt)
    ;['exit', 'SIGINT', 'SIGTERM'].forEach(e => process.on(e, () => fs.rmSync(this.isAt, { recursive: true })))
    Object.freeze(this)
  }
  [Symbol.dispose]() { fs.rmSync(this.isAt, { recursive: true }) }
  async [Symbol.asyncDispose]() { return fp.rm(this.isAt, {recursive: true}) }
}
export const TempDir = TempFolder
export const TempDirectory = TempFolder
export const TempDict = TempFolder
export const TempDictionary = TempFolder