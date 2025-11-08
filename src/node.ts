import { AnyErr, scramble_name } from "./base.js"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import { spawnSync } from "node:child_process"



// Node specific
export const IS_WINDOWS = process.platform === "win32" as const



export const enum RoadT {
  FILE = "FILE",
  FOLDER = "FOLDER",
  BLOCK_DEVICE = "BLOCK_DEVICE",
  CHAR_DEVICE = "CHAR_DEVICE",
  SYMLINK = "SYMLINK",
  FIFO = "FIFO",
  SOCKET = "SOCKET"
}
export class RoadTErr extends AnyErr {} 
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
    default: throw new RoadTErr(`Unknown mode type ${mode} for path/mode: '${_pathorMode}'`)
  }
}

export class RoadErr extends AnyErr {
  /*
    Custom error class involving problematic attempts
    to handle the underlying Road
  */
  readonly self: Road
  constructor(_self: Road, _because: unknown) {
    super(`At (path: '${_self.isAt}', type: ${_self.type()}) because: ${_because}`)
    this.self = _self
  }
}

export function road_factory(_lookFor: string): Road {
  const entryType = to_RoadT(_lookFor)
  if (entryType === RoadT.FOLDER)
    return new Folder(_lookFor)
  else if (entryType === RoadT.FILE)
    return new File(_lookFor)
  else
    return new BizarreRoad(_lookFor)
}


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
    /*
      Find and resolve the absolute path of _lookFor
      with optional check to _shouldBeOfType
    */
    if (!fs.existsSync(_lookFor))
      throw new RoadErr(this, "Not found")
    this.isAt = path.resolve(_lookFor)
  }


  abstract exists(): boolean


  type(): RoadT {
    return to_RoadT(this.isAt)
  }


  depth(): number {
    return this.isAt.split(path.sep).length - 1
  }


  name(): string {
    return path.basename(this.isAt)
  }


  last_modified(): Date {
    return fs.statSync(this.isAt).mtime
  }
  created_on(): Date {
    return fs.statSync(this.isAt).birthtime
  }


  stats(): fs.Stats {
    return fs.statSync(this.isAt)
  }


  cpy(_prevPath = this.isAt): this { // Maybe outdated
    return new (this.constructor as any)(_prevPath) as this
  }


  parent(): Folder {
    return new Folder(path.dirname(this.isAt))
  }


  parents(): Folder[] {
    const result: Folder[] = []
    let currentParent: Folder = this.parent()
    while (currentParent.depth() > 1) {
      result.unshift(currentParent)
      currentParent = currentParent.parent()
    }
    return result
  }


  rename_self_to(_newName: string): void {
    if (_newName.includes(path.sep))
      throw new RoadErr(this, `Invalid name: '${_newName}' is nested`)
    const newPath = path.join(this.parent().isAt, _newName)
    if (fs.existsSync(newPath))
      throw new RoadErr(this, `New name: '${newPath}' already exists`)
    fs.renameSync(this.isAt, newPath)
    this.isAt = newPath
  }


  move_self_into(_moveInto: Folder): void {
    // Default attempt to move
    const destPath = path.join(_moveInto.isAt, this.name())
    if (fs.existsSync(destPath))
      throw new RoadErr(this, `Destination: '${destPath}' already exists`)
    fs.renameSync(this.isAt, destPath)
    this.isAt = destPath
  }


  copy_self_into(_copyInto: Folder): this {
    // Default attempt to copy
    const destPath = path.join(_copyInto.isAt, this.name())
    if (fs.existsSync(destPath))
      throw new RoadErr(this, `Destination: '${destPath}' already exists`)
    if (this.type() === RoadT.SYMLINK) {
      const linkTarget = fs.readlinkSync(this.isAt)
      fs.symlinkSync(linkTarget, destPath)
    } else {
      // Trying to use 'cp' for other special files (pipes, sockets, etc.)
      const result = spawnSync("cp", ["-a", this.isAt, destPath])
      if (result.status !== 0)
        throw new RoadErr(this, `Failed to copy special file: ${result.stderr?.toString() || "unknown error"}`)
    }
    return this.cpy(destPath);
  }
}



export class BizarreRoad extends Road {
  /*
    Specifically for files that don't fit into
    the usual categories such as symbolic links
    or pipes.
  */
  readonly originalType: RoadT // To remember own type


  constructor(_lookFor: string) {
    super(_lookFor)
    this.originalType = this.type()
    if (this.originalType === RoadT.FILE || this.originalType=== RoadT.FOLDER)
      throw new RoadErr(this, `Type missmatch: ${this.originalType} is too normal (?), use other generalization of ${super.constructor.name} instead`)
  }


  override exists(): boolean {
    return fs.existsSync(this.isAt) && this.type() === this.originalType
  }
}



export class Folder extends Road {
  /*
    Handles folders in the file system
  */
  constructor(_lookFor: string, _createIfNotExists: boolean = false) {
    if (_createIfNotExists && !fs.existsSync(_lookFor))
      fs.mkdirSync(_lookFor, { recursive: true })
    super(_lookFor)
    if (!fs.existsSync(_lookFor) || this.type() !== RoadT.FOLDER)
      throw new RoadErr(this, "Type missmatch: Should be folder")
  }


  list(): Array<Road> {
    return fs.readdirSync(this.isAt).map(name => road_factory(path.join(this.isAt, name)))
  }


  find(_lookFor: string): Road | undefined {
    /*
      Check if the folder contains a file or folder with
      the given relative path. If it does, return the
      corresponding Road object.
      Note:
        Path MUST be relative
    */
    if (_lookFor.length === 0)
      throw new RoadErr(this, "Invalid path: Empty path given to lookup")
    if (_lookFor.includes("/") || _lookFor.includes("\\"))
      throw new RoadErr(this, `Invalid path: Not relative or is nested: ${_lookFor}`)

    if (!fs.existsSync(path.join(this.isAt, _lookFor)))
      return undefined
    else
      return road_factory(path.join(this.isAt, _lookFor))
  }


  override copy_self_into(_copyInto: Folder, _options: fs.CopySyncOptions = { recursive: true }): this {
    const newFolder = new Folder(path.join(_copyInto.isAt, this.name()))
    fs.cpSync(this.isAt, newFolder.isAt, _options) // Merges
    return newFolder as this
  }


  override exists(): boolean {
    return fs.existsSync(this.isAt) && this.type() === RoadT.FOLDER
  }
}



export class File extends Road {
  /*
    Handles files in the file system
  */
  constructor(_lookFor: string, _createIfNotExists: boolean = false) {
    if (_createIfNotExists && !fs.existsSync(_lookFor))
      fs.writeFileSync(_lookFor, "")
    super(_lookFor)
    if (!fs.existsSync(_lookFor) || this.type() !== RoadT.FILE)
      throw new RoadErr(this, "Type missmatch: Should be file")
  }


  override exists(): boolean {
    return fs.existsSync(this.isAt) && this.type() === RoadT.FILE
  }


  read_text(): string {
    return fs.readFileSync(this.isAt, "utf-8")
  }
  edit_text(_newText: string): void {
    fs.writeFileSync(this.isAt, _newText)
  }


  read_binary(): Buffer {
    return fs.readFileSync(this.isAt)
  }
  edit_binary(_newBuffer: Buffer | Uint8Array): void {
    fs.writeFileSync(this.isAt, _newBuffer)
  }


  ext(): string {
    return path.extname(this.isAt)
  }
  size_in_bytes(): number {
    return fs.statSync(this.isAt).size
  }
}



export class TempFile extends File {
  /*
    Create a temporary file with a random name in the system's
    temporary directory.
  */
  constructor() {
    let tempName: string = `TempFile_${scramble_name()}.tmp`
    while (fs.existsSync(path.join(os.tmpdir(), tempName)) && to_RoadT(path.join(os.tmpdir(), tempName)) !== RoadT.FILE) // Loops over forever until open name is found
      tempName = `TempFile_${scramble_name()}.tmp`
    super(path.join(os.tmpdir(), tempName), true)
  }

  cleanup(): void {
    if (this.exists())
      fs.unlinkSync(this.isAt)
  }

  [Symbol.dispose](): void {
    this.cleanup()
  }
}



export class TempFolder extends Folder {
  /*
    Create a temporary folder with a random name in the system's
    temporary directory.
    Note:
      Destructor also takes all entries in the folder
      into account and deletes them.
  */
  constructor() {
    let tempName: string = `TempFolder_${scramble_name()}`
    while (fs.existsSync(path.join(os.tmpdir(), tempName)) && to_RoadT(path.join(os.tmpdir(), tempName)) !== RoadT.FOLDER)
      tempName = `TempFolder_${scramble_name()}`
    super(path.join(os.tmpdir(), tempName), true)
  }

  cleanup(): void {
    if (this.exists())
      fs.rmSync(this.isAt, { recursive: true, force: true })
  }

  [Symbol.dispose](): void {
    this.cleanup()
  }
}