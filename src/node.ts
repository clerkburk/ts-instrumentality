if (typeof process === 'undefined' || typeof require === 'undefined')
  throw new Error("This module can only be used in a Node.js environment where 'process' and 'require' are defined.")



import * as fs from "node:fs"
import * as fp from "node:fs/promises"
import * as ph from "node:path"
import * as os from "node:os"
import * as bs from "./base.js"
import { on } from "node:events"




// Type management
// Primitive filesystem entry types that the operating system understands.
export type road_t = typeof File | typeof Folder | typeof BlockDevice | typeof CharacterDevice | typeof SymbolicLink | typeof Fifo | typeof Socket
export function road_type(_pathorMode: string | number): road_t {
  const mode = typeof _pathorMode === 'string' ? fs.lstatSync(_pathorMode).mode : _pathorMode
  switch (mode & fs.constants.S_IFMT) {
    case fs.constants.S_IFREG: return File
    case fs.constants.S_IFDIR: return Folder
    case fs.constants.S_IFBLK: return BlockDevice
    case fs.constants.S_IFCHR: return CharacterDevice
    case fs.constants.S_IFLNK: return SymbolicLink
    case fs.constants.S_IFIFO: return Fifo
    case fs.constants.S_IFSOCK: return Socket
    default: throw new Error(`Unknown mode type ${mode} for path/mode: '${_pathorMode}'`)
  }
}



// Classes
export abstract class Road {
  /*
    Abstract base class for filesystem entries.
    Represents a path in the filesystem and provides
    methods to manage it. Think of it as a pointer
    for stuff on disk.
    Note:
      Copying/Moving/changing the object won't change
      the represented entry on the disk.
    Example:
      0x123 as int* -> 42 those 4 bytes on stack/heap/seg/reg/...
      File("/ex.txt") -> the actual file on disk
  */
  isAt: string

  constructor(_lookFor: string) {
    fs.accessSync(_lookFor, fs.constants.F_OK)
    this.isAt = ph.resolve(_lookFor)
    if (!(this instanceof road_type(this.isAt)))
      throw new Error(`Type missmatch: Path '${this.isAt}' is not of constructed type ${this.constructor.name}`)
  }
  static async factory(_lookFor: string): Promise<Road> {
    await fp.access(_lookFor, fs.constants.F_OK)
    const roadCtor = road_type(_lookFor)
    return new roadCtor(_lookFor)
  }
  static factory_sync(_lookFor: string): Road {
    fs.accessSync(_lookFor, fs.constants.F_OK)
    const roadCtor = road_type(_lookFor)
    return new roadCtor(_lookFor)
  }

  // Query methods (async and sync)
  exists_sync(): boolean {
    return fs.existsSync(this.isAt) && (this instanceof road_type(this.isAt))
  }
  async exists(): Promise<boolean> {
    try {
      await fp.access(this.isAt, fs.constants.F_OK)
      return this instanceof road_type(this.isAt)
    } catch {
      return false
    }
  }
  stats_sync(): fs.Stats {
    return fs.lstatSync(this.isAt)
  }
  async stats(): Promise<fs.Stats> {
    return await fp.lstat(this.isAt)
  }
  modified_sync(): Date {
    return this.stats_sync().mtime
  }
  async modified(): Promise<Date> {
    return (await this.stats()).mtime
  }
  created_sync(): Date {
    return this.stats_sync().birthtime
  }
  async created(): Promise<Date> {
    return (await this.stats()).birthtime
  }

  // Path methods
  depth(): number {
    return this.isAt.split(ph.sep).length - 1
  }
  parent(): Folder {
    return new Folder(ph.dirname(this.isAt))
  }
  ancestors(): Folder[] {
    const result: Folder[] = []
    let current: Folder = this.parent()
    while (current.isAt !== current.parent().isAt) {
      result.push(current)
      current = current.parent()
    }
    return result
  }
  name(): string {
    return ph.basename(this.isAt)
  }

  // Access method
  accessible_sync(_mode: number = fs.constants.F_OK): boolean {
    try {
      fs.accessSync(this.isAt, _mode)
      return true
    } catch (e) {
      const err = e as NodeJS.ErrnoException
      if (err?.code === 'ENOENT' || err?.code === 'EACCES')
        return false
      throw e
    }
  }
  async accessible(_mode: number = fs.constants.F_OK): Promise<boolean> {
    try {
      await fp.access(this.isAt, _mode)
      return true
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException
      if (err?.code === 'ENOENT' || err?.code === 'EACCES')
        return false
      throw e
    }
  }
  async until_accessible(_mode: number = fs.constants.F_OK, _abortSignal: AbortSignal, _onEachAttempt?: () => void | Promise<void>): Promise<void> {
    const watcher = fs.watch(this.isAt)
    try {
      if (await this.accessible(_mode))
        return
      for await (const _ of on(watcher, 'change', { signal: _abortSignal }))
        if (await this.accessible(_mode))
          return
        else
          await _onEachAttempt?.()
    } finally {
      watcher.close()
    }
  }
  async on_change(_abortSignal: AbortSignal, _onChange?: () => void | Promise<void>): Promise<void> {
    const watcher = fs.watch(this.isAt)
    try {
      for await (const _ of on(watcher, 'change', { signal: _abortSignal }))
        await _onChange?.()
    } finally {
      watcher.close()
    }
  }

  // Positional methods (abstract)
  abstract delete_sync(): void
  abstract delete(): Promise<void>
  abstract move_sync(_into: Folder): void
  abstract move(_into: Folder): Promise<void>
  abstract copy_sync(_into: Folder): this
  abstract copy(_into: Folder): Promise<this>
  abstract rename_sync(_to: string): void
  abstract rename(_to: string): Promise<void>
}



export class File extends Road {
  static async create(_at: string): Promise<File> {
    try {
      await fp.access(_at, fs.constants.F_OK)
    } catch {
      await fp.writeFile(_at, "")
    }
    return new File(_at)
  }
  static create_sync(_at: string): File {
    try {
      fs.accessSync(_at, fs.constants.F_OK)
    } catch {
      fs.writeFileSync(_at, "")
    }
    return new File(_at)
  }

  // Content as text manipulation
  read_text_sync(): string {
    return fs.readFileSync(this.isAt, { encoding: "utf-8" })
  }
  async read_text(): Promise<string> {
    return await fp.readFile(this.isAt, { encoding: "utf-8" })
  }
  write_text_sync(_content: string): void {
    fs.writeFileSync(this.isAt, _content, { encoding: "utf-8" })
  }
  async write_text(_content: string): Promise<void> {
    await fp.writeFile(this.isAt, _content, { encoding: "utf-8" })
  }
  append_text_sync(_content: string): void {
    fs.appendFileSync(this.isAt, _content, { encoding: "utf-8" })
  }
  async append_text(_content: string): Promise<void> {
    await fp.appendFile(this.isAt, _content, { encoding: "utf-8" })
  }

  // Content as binary manipulation
  read_bytes_sync(): Buffer {
    return fs.readFileSync(this.isAt)
  }
  async read_bytes(): Promise<Buffer> {
    return await fp.readFile(this.isAt)
  }
  write_bytes_sync(_content: Buffer): void {
    fs.writeFileSync(this.isAt, _content)
  }
  async write_bytes(_content: Buffer): Promise<void> {
    await fp.writeFile(this.isAt, _content)
  }
  append_bytes_sync(_content: Buffer): void {
    fs.appendFileSync(this.isAt, _content)
  }
  async append_bytes(_content: Buffer): Promise<void> {
    await fp.appendFile(this.isAt, _content)
  }

  // Streaming
  create_read_stream(): fs.ReadStream {
    return fs.createReadStream(this.isAt)
  }
  create_write_stream(): fs.WriteStream {
    return fs.createWriteStream(this.isAt)
  }

  // Properties
  ext(): string {
    return ph.extname(this.isAt)
  }
  size_sync(): number {
    return this.stats_sync().size
  }
  async size(): Promise<number> {
    return (await this.stats()).size
  }

  // Implement abstract methods
  delete_sync(): void {
    fs.unlinkSync(this.isAt)
  }
  async delete(): Promise<void> {
    await fp.unlink(this.isAt)
  }
  move_sync(_into: Folder): void {
    const newPath = ph.join(_into.isAt, this.name())
    fs.renameSync(this.isAt, newPath)
    this.isAt = newPath
  }
  async move(_into: Folder): Promise<void> {
    const newPath = ph.join(_into.isAt, this.name())
    await fp.rename(this.isAt, newPath)
    this.isAt = newPath
  }
  copy_sync(_into: Folder): this {
    const newPath = ph.join(_into.isAt, this.name())
    fs.copyFileSync(this.isAt, newPath)
    return new File(newPath) as this
  }
  async copy(_into: Folder): Promise<this> {
    const newPath = ph.join(_into.isAt, this.name())
    await fp.copyFile(this.isAt, newPath)
    return new File(newPath) as this
  }
  rename_sync(_to: string): void {
    const newPath = ph.join(ph.dirname(this.isAt), _to)
    fs.renameSync(this.isAt, newPath)
    this.isAt = newPath
  }
  async rename(_to: string): Promise<void> {
    const newPath = ph.join(ph.dirname(this.isAt), _to)
    await fp.rename(this.isAt, newPath)
    this.isAt = newPath
  }
}




export class Folder extends Road {
  static async create(_at: string): Promise<Folder> {
    try {
      await fp.access(_at, fs.constants.F_OK)
    } catch {
      await fp.mkdir(_at, { recursive: true })
    }
    return new Folder(_at)
  }
  static create_sync(_at: string): Folder {
    try {
      fs.accessSync(_at, fs.constants.F_OK)
    } catch {
      fs.mkdirSync(_at, { recursive: true })
    }
    return new Folder(_at)
  }

  // list_sync overloads
  list_sync(): Road[]
  list_sync<T extends Road>(..._expectedTypes: road_t[]): T[]
  list_sync<T extends Road>(..._expectedTypes: road_t[]): Road[] | T[] {
    const entries = fs.readdirSync(this.isAt).map(entry => Road.factory_sync(ph.join(this.isAt, entry)))
    if (_expectedTypes.length === 0)
      return entries
    return entries.filter(entry => _expectedTypes.some(ctor => entry instanceof ctor)) as T[]
  }

  // list async overloads
  async list(): Promise<Road[]>
  async list<T extends Road>(..._expectedTypes: road_t[]): Promise<T[]>
  async list<T extends Road>(..._expectedTypes: road_t[]): Promise<Road[] | T[]> {
    const dirEntries = await fp.readdir(this.isAt)
    const entries = await Promise.all(dirEntries.map(async entry => Road.factory(ph.join(this.isAt, entry))))
    if (_expectedTypes.length === 0)
      return entries
    return entries.filter(entry => _expectedTypes.some(ctor => entry instanceof ctor)) as T[]
  }

  // find_sync overloads
  find_sync(name: string): Road | null
  find_sync<T extends Road>(name: string, ..._expectedTypes: road_t[]): T | null
  find_sync<T extends Road>(name: string, ..._expectedTypes: road_t[]): Road | T | null {
    try {
      fs.accessSync(ph.join(this.isAt, name), fs.constants.F_OK)
      const found = Road.factory_sync(ph.join(this.isAt, name))
      if (_expectedTypes.length === 0)
        return found
      if (_expectedTypes.some(ctor => found instanceof ctor))
        return found as T
      return null
    } catch {
      return null
    }
  }

  // find async overloads
  async find(name: string): Promise<Road | null>
  async find<T extends Road>(name: string, ..._expectedTypes: road_t[]): Promise<T | null>
  async find<T extends Road>(name: string, ..._expectedTypes: road_t[]): Promise<Road | T | null> {
    try {
      await fp.access(ph.join(this.isAt, name), fs.constants.F_OK)
      const found = await Road.factory(ph.join(this.isAt, name))
      if (_expectedTypes.length === 0)
        return found
      if (_expectedTypes.some(ctor => found instanceof ctor))
        return found as T
      return null
    } catch {
      return null
    }
  }

  // Implement abstract methods
  delete_sync(): void {
    fs.rmdirSync(this.isAt, { recursive: true })
  }
  async delete(): Promise<void> {
    await fp.rmdir(this.isAt, { recursive: true })
  }
  move_sync(_into: Folder): void {
    const newPath = ph.join(_into.isAt, this.name())
    fs.renameSync(this.isAt, newPath)
    this.isAt = newPath
  }
  async move(_into: Folder): Promise<void> {
    const newPath = ph.join(_into.isAt, this.name())
    await fp.rename(this.isAt, newPath)
    this.isAt = newPath
  }
  copy_sync(_into: Folder): this {
    const newPath = ph.join(_into.isAt, this.name())
    fs.cpSync(this.isAt, newPath, { recursive: true })
    return new Folder(newPath) as this
  }
  async copy(_into: Folder): Promise<this> {
    const newPath = ph.join(_into.isAt, this.name())
    await fp.cp(this.isAt, newPath, { recursive: true })
    return new Folder(newPath) as this
  }
  rename_sync(_to: string): void {
    const newPath = ph.join(ph.dirname(this.isAt), _to)
    fs.renameSync(this.isAt, newPath)
    this.isAt = newPath
  }
  async rename(_to: string): Promise<void> {
    const newPath = ph.join(ph.dirname(this.isAt), _to)
    await fp.rename(this.isAt, newPath)
    this.isAt = newPath
  }
}



export class SymbolicLink extends Road {
  static async create(_at: string, _target?: Road): Promise<SymbolicLink> {
    try {
      await fp.access(_at, fs.constants.F_OK)
    } catch {
      await fp.symlink(_target?.isAt ?? "", _at)
    }
    return new SymbolicLink(_at)
  }
  static create_sync(_at: string, _target?: Road): SymbolicLink {
    try {
      fs.accessSync(_at, fs.constants.F_OK)
    } catch {
      fs.symlinkSync(_target?.isAt ?? "", _at)
    }
    return new SymbolicLink(_at)
  }

  // Target methods
  target_sync(): Road {
    return Road.factory_sync(ph.resolve(ph.dirname(this.isAt), fs.readlinkSync(this.isAt)))
  }
  async target(): Promise<Road> {
    const linkPath = await fp.readlink(this.isAt)
    return Road.factory(ph.resolve(ph.dirname(this.isAt), linkPath))
  }
  retarget_sync(_newTarget: Road): void {
    this.delete_sync()
    fs.symlinkSync(_newTarget.isAt, this.isAt)
  }
  async retarget(_newTarget: Road): Promise<void> {
    await this.delete()
    await fp.symlink(_newTarget.isAt, this.isAt)
  }

  // Implement abstract methods
  delete_sync(): void {
    fs.unlinkSync(this.isAt)
  }
  async delete(): Promise<void> {
    await fp.unlink(this.isAt)
  }
  move_sync(_into: Folder): void {
    const newPath = ph.join(_into.isAt, this.name())
    fs.renameSync(this.isAt, newPath)
    this.isAt = newPath
  }
  async move(_into: Folder): Promise<void> {
    const newPath = ph.join(_into.isAt, this.name())
    await fp.rename(this.isAt, newPath)
    this.isAt = newPath
  }
  copy_sync(_into: Folder): this {
    const newPath = ph.join(_into.isAt, this.name())
    const target = this.target_sync()
    fs.symlinkSync(target.isAt, newPath)
    return new SymbolicLink(newPath) as this
  }
  async copy(_into: Folder): Promise<this> {
    const newPath = ph.join(_into.isAt, this.name())
    const target = await this.target()
    await fp.symlink(target.isAt, newPath)
    return new SymbolicLink(newPath) as this
  }
  rename_sync(_to: string): void {
    const newPath = ph.join(ph.dirname(this.isAt), _to)
    fs.renameSync(this.isAt, newPath)
    this.isAt = newPath
  }
  async rename(_to: string): Promise<void> {
    const newPath = ph.join(ph.dirname(this.isAt), _to)
    await fp.rename(this.isAt, newPath)
    this.isAt = newPath
  }
}



export abstract class UnusuableRoad extends Road {
  /*
    Abstract base class for unusable filesystem entries.
    These are special files that cannot or
    at least shouldn't be be manipulated.
  */
  delete_sync(): void { throw new Error(`Cannot delete type ${this.constructor.name} at '${this.isAt}'`) }
  async delete(): Promise<void> { throw new Error(`Cannot delete type ${this.constructor.name} at '${this.isAt}'`) }
  move_sync(_into: Folder): void { throw new Error(`Cannot move type ${this.constructor.name} at '${this.isAt}'`) }
  async move(_into: Folder): Promise<void> { throw new Error(`Cannot move type ${this.constructor.name} at '${this.isAt}'`) }
  copy_sync(_into: Folder): this { throw new Error(`Cannot copy type ${this.constructor.name} at '${this.isAt}'`) }
  async copy(_into: Folder): Promise<this> { throw new Error(`Cannot copy type ${this.constructor.name} at '${this.isAt}'`) }
  rename_sync(_to: string): void { throw new Error(`Cannot rename type ${this.constructor.name} at '${this.isAt}'`) }
  async rename(_to: string): Promise<void> { throw new Error(`Cannot rename type ${this.constructor.name} at '${this.isAt}'`) }
}
export class BlockDevice extends UnusuableRoad { }
export class CharacterDevice extends UnusuableRoad { }
export class Fifo extends UnusuableRoad { }
export class Socket extends UnusuableRoad { }



export class LiveFile extends File {
  /*
    A file that automatically reloads its content from disk
    before each read operation.
    Note:
      Might be resource intensive on large files or
      rapid changes.
  */
  lastReadContent: Buffer = Buffer.alloc(0)
  abortController: AbortController = new AbortController()

  constructor(_at: string)  {
    super(_at)
    ;(async () => {
      while (!this.abortController.signal.aborted) {
        const currentContent = this.read_bytes_sync()
        if (!currentContent.equals(this.lastReadContent))
          this.lastReadContent = currentContent
        await this.on_change(this.abortController.signal, async () => { /* just to wake up on changes */ } )
      }
    })()
  }

  [Symbol.dispose](): void {
    this.abortController.abort()
  }
}



export class TempFile extends File {
  constructor() {
    super(File.create_sync(ph.join(os.tmpdir(), `tempfile_${Date.now()}_${crypto.randomUUID()}.tmp`)).isAt)
  }

  [Symbol.dispose](): void {
    try { this.delete_sync() } catch { console.error(`TempFile: Failed to delete temporary file at '${this.isAt}'`) }
  }
}


export class TempFolder extends Folder {
  constructor() {
    super(Folder.create_sync(ph.join(os.tmpdir(), `tempfolder_${Date.now()}_${crypto.randomUUID()}`)).isAt)
  }
  [Symbol.dispose](): void {
    try { this.delete_sync() } catch { console.error(`TempFolder: Failed to delete temporary folder at '${this.isAt}'`) }
  }
}