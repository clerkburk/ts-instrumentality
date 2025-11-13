import * as fs from "node:fs"
import * as fp from "node:fs/promises"
import * as ph from "node:path"
import * as os from "node:os"




export const enum RoadT {
  FILE = "FILE",
  FOLDER = "FOLDER",
  BLOCK_DEVICE = "BLOCK_DEVICE",
  CHAR_DEVICE = "CHAR_DEVICE",
  SYMLINK = "SYMLINK",
  FIFO = "FIFO",
  SOCKET = "SOCKET"
}

export function to_RoadT(_pathorMode: string | number): RoadT {
  const mode = typeof _pathorMode === 'string' ? fs.lstatSync(_pathorMode).mode : _pathorMode
  switch (mode & fs.constants.S_IFMT) {
    case fs.constants.S_IFREG: return RoadT.FILE
    case fs.constants.S_IFDIR: return RoadT.FOLDER
    case fs.constants.S_IFBLK: return RoadT.BLOCK_DEVICE
    case fs.constants.S_IFCHR: return RoadT.CHAR_DEVICE
    case fs.constants.S_IFLNK: return RoadT.SYMLINK
    case fs.constants.S_IFIFO: return RoadT.FIFO
    case fs.constants.S_IFSOCK: return RoadT.SOCKET
    default: throw new Error(`Unknown mode type ${mode} for path/mode: '${_pathorMode}'`)
  }
}

export function road_factory_sync(_lookFor: string): Road {
  const roadType = to_RoadT(_lookFor)
  switch (roadType) {
    case RoadT.FILE: return new File(_lookFor)
    case RoadT.FOLDER: return new Folder(_lookFor)
    case RoadT.BLOCK_DEVICE: return new BlockDevice(_lookFor)
    case RoadT.CHAR_DEVICE: return new CharacterDevice(_lookFor)
    case RoadT.SYMLINK: return new SymbolicLink(_lookFor)
    case RoadT.FIFO: return new Fifo(_lookFor)
    case RoadT.SOCKET: return new Socket(_lookFor)
    default: throw new Error(`UNREACHABLE (path: '${_lookFor}', type: '${roadType}')`)
  }
}
export async function road_factory(_lookFor: string): Promise<Road> {
  const roadType = to_RoadT(_lookFor)
  switch (roadType) {
    case RoadT.FILE: return new File(_lookFor)
    case RoadT.FOLDER: return new Folder(_lookFor)
    case RoadT.BLOCK_DEVICE: return new BlockDevice(_lookFor)
    case RoadT.CHAR_DEVICE: return new CharacterDevice(_lookFor)
    case RoadT.SYMLINK: return new SymbolicLink(_lookFor)
    case RoadT.FIFO: return new Fifo(_lookFor)
    case RoadT.SOCKET: return new Socket(_lookFor)
    default: throw new Error(`UNREACHABLE (path: '${_lookFor}', type: '${roadType}')`)
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
  readonly type: RoadT

  constructor(_path: string, _expectedType?: RoadT) {
    this.isAt = ph.resolve(_path)
    this.type = to_RoadT(this.isAt)
    if (_expectedType && this.type !== _expectedType)
      throw new Error(`Expected type ${_expectedType} but found ${this.type} at path '${this.isAt}'`)
  }

  // Query methods (async and sync)
  underlying_type(): RoadT {
    return this.type
  }
  exists_sync(): boolean {
    return fs.existsSync(this.isAt) && to_RoadT(this.isAt) === this.type
  }
  async exists(): Promise<boolean> {
    try {
      await fp.access(this.isAt, fs.constants.F_OK)
      return to_RoadT(this.isAt) === this.type
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
  constructor(_path: string) {
    super(_path, RoadT.FILE)
  }

  // Creation
  static create_sync(_path: string): File {
    fs.writeFileSync(_path, "")
    return new File(_path)
  }
  static async create(_path: string): Promise<File> {
    await fp.writeFile(_path, "")
    return new File(_path)
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
  constructor(_path: string) {
    super(_path, RoadT.FOLDER)
  }

  // Creation
  static create_sync(_path: string): Folder {
    fs.mkdirSync(_path, { recursive: true })
    return new Folder(_path)
  }
  static async create(_path: string): Promise<Folder> {
    await fp.mkdir(_path, { recursive: true })
    return new Folder(_path)
  }

  // Listing
  list_sync<T extends Road>(..._typeCtors: (new(...args: any[]) => T)[]): Road[] | T[] {
    const entries = fs.readdirSync(this.isAt).map(entry => road_factory_sync(ph.join(this.isAt, entry)))
    if (_typeCtors.length === 0)
      return entries
    return entries.filter(entry => _typeCtors.some(ctor => entry instanceof ctor)) as T[]
  }
  async list<T extends Road>(..._typeCtors: (new(...args: any[]) => T)[]): Promise<Road[] | T[]> {
    const entries = await Promise.all((await fp.readdir(this.isAt)).map(entry => road_factory(ph.join(this.isAt, entry))))
    if (_typeCtors.length === 0)
      return entries
    return entries.filter(entry => _typeCtors.some(ctor => entry instanceof ctor)) as T[]
  }
  find_sync<T extends Road>(_name: string, ..._typeCtors: (new(...args: any[]) => T)[]): Road | T | null {
    try {
      fs.accessSync(ph.join(this.isAt, _name), fs.constants.F_OK)
      const found = road_factory_sync(ph.join(this.isAt, _name))
      if (_typeCtors.length === 0)
        return found
      if (_typeCtors.some(ctor => found instanceof ctor))
        return found as T
      return null
    } catch {
      return null
    }
  }
  async find<T extends Road>(_name: string, ..._typeCtors: (new(...args: any[]) => T)[]): Promise<Road | T | null> {
    try {
      await fp.access(ph.join(this.isAt, _name), fs.constants.F_OK)
      const found = await road_factory(ph.join(this.isAt, _name))
      if (_typeCtors.length === 0)
        return found
      if (_typeCtors.some(ctor => found instanceof ctor))
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
  constructor(_path: string) {
    super(_path, RoadT.SYMLINK)
  }

  // Creation
  static create_sync(_createSelfAt: string, _target: Road): SymbolicLink {
    fs.symlinkSync(_target.isAt, _createSelfAt)
    return new SymbolicLink(_createSelfAt)
  }
  static async create(_createSelfAt: string, _target: Road): Promise<SymbolicLink> {
    await fp.symlink(_target.isAt, _createSelfAt)
    return new SymbolicLink(_createSelfAt)
  }

  // Target methods
  target_sync(): Road {
    return road_factory_sync(ph.resolve(ph.dirname(this.isAt), fs.readlinkSync(this.isAt)))
  }
  async target(): Promise<Road> {
    const linkPath = await fp.readlink(this.isAt)
    return road_factory(ph.resolve(ph.dirname(this.isAt), linkPath))
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
    These are special files that cannot be manipulated
    like regular files or folders.
  */
  constructor(_path: string, _expectedType: RoadT) { super(_path, _expectedType) }
  delete_sync(): void { throw new Error(`Cannot delete type ${this.type} at '${this.isAt}'`) }
  async delete(): Promise<void> { throw new Error(`Cannot delete type ${this.type} at '${this.isAt}'`) }
  move_sync(_into: Folder): void { throw new Error(`Cannot move type ${this.type} at '${this.isAt}'`) }
  async move(_into: Folder): Promise<void> { throw new Error(`Cannot move type ${this.type} at '${this.isAt}'`) }
  copy_sync(_into: Folder): this { throw new Error(`Cannot copy type ${this.type} at '${this.isAt}'`) }
  async copy(_into: Folder): Promise<this> { throw new Error(`Cannot copy type ${this.type} at '${this.isAt}'`) }
  rename_sync(_to: string): void { throw new Error(`Cannot rename type ${this.type} at '${this.isAt}'`) }
  async rename(_to: string): Promise<void> { throw new Error(`Cannot rename type ${this.type} at '${this.isAt}'`) }
}
export class BlockDevice extends UnusuableRoad { constructor(_path: string) { super(_path, RoadT.BLOCK_DEVICE) }}
export class CharacterDevice extends UnusuableRoad { constructor(_path: string) { super(_path, RoadT.CHAR_DEVICE) }}
export class Fifo extends UnusuableRoad { constructor(_path: string) { super(_path, RoadT.FIFO) }}
export class Socket extends UnusuableRoad { constructor(_path: string) { super(_path, RoadT.SOCKET) }}



export class TempFile extends File {
  constructor() {
    super(ph.join(os.tmpdir(), `tempfile_${Date.now()}_${crypto.randomUUID()}.tmp`))
    fs.writeFileSync(this.isAt, "")
  }

  [Symbol.dispose](): void {
    try { this.delete_sync() } catch {}
  }
}


export class TempFolder extends Folder {
  constructor() {
    super(ph.join(os.tmpdir(), `tempfolder_${Date.now()}_${crypto.randomUUID()}`))
    fs.mkdirSync(this.isAt, { recursive: true })
  }
  [Symbol.dispose](): void {
    try { this.delete_sync() } catch {}
  }
}