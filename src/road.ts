import * as rl from "node:readline"
import * as fs from "node:fs"
import * as fp from "node:fs/promises"
import * as ph from "node:path"
import * as os from "node:os"
import { on } from "node:events"




// Type management
/**
 * Represents a union type of default file system node constructors.
 * 
 * This type can be used to refer to any of the following node types:
 * - {@link File}
 * - {@link Folder}
 * - {@link BlockDevice}
 * - {@link CharacterDevice}
 * - {@link SymbolicLink}
 * - {@link Fifo}
 * - {@link Socket}
 *
 * Each member is referenced by its constructor type.
 */
export type road_t = typeof File | typeof Folder | typeof BlockDevice | typeof CharacterDevice | typeof SymbolicLink | typeof Fifo | typeof Socket
/**
 * Synchronously determines the constructor type of a file system object at the given path.
 *
 * If a string path is provided, it retrieves the mode using {@link fs.lstatSync}.
 * If a numeric mode is provided, it uses that directly.
 * The function then returns the corresponding {@link road_t} type based on the mode.
 *
 * @param _pathorMode - The file system path (string) or mode (number) to evaluate.
 * @returns The type of the file system object as a {@link road_t}.
 * @throws {Error} If the mode does not match any known file system object type.
 */
export function roadType(_pathorMode: string | number): road_t {
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



/**
 * Abstract base class representing a filesystem path (file or folder).
 * Provides methods for querying, accessing, and manipulating the path.
 * 
 * Subclasses must implement positional methods for deleting, moving, copying, and renaming.
 * 
 * @remarks
 * - The class verifies the existence and type of the path upon construction.
 * - Use {@link Road.factory} or {@link Road.factory_sync} to instantiate the correct subclass.
 * 
 * @property {string} {@link pointsTo} - The target path that this node points to.
 * @property {boolean} {@link mutable} - Indicates if the underlying entry can be modified (sometimes overridden by subclasses if necessary).
 * 
 * @method {@link assert_mutable} - Asserts that the node is mutable, throwing an error if not.
 * @method {@link exists_sync} - Checks synchronously if the path exists and matches the expected type.
 * @method {@link exists} - Checks asynchronously if the path exists and matches the expected type.
 * @method {@link stats_sync} - Gets synchronous file statistics.
 * @method {@link stats} - Gets asynchronous file statistics.
 * @method {@link depth} - Returns the depth of the path in the filesystem hierarchy.
 * @method {@link parent} - Returns the parent folder as a {@link Folder}.
 * @method {@link ancestors} - Returns all ancestor folders up to the root.
 * @method {@link name} - Returns the basename of the path.
 * @method {@link accessible_sync} - Checks synchronously if the path is accessible with the given mode.
 * @method {@link accessible} - Checks asynchronously if the path is accessible with the given mode.
 * @method {@link until_accessible} - Waits asynchronously until the path becomes accessible, with abort and callback support.
 * @method {@link on_change} - Watches for changes to the path, with abort and callback support.
 * 
 * @abstractmethod {@link delete_sync} - Synchronously deletes the path.
 * @abstractmethod {@link delete} - Asynchronously deletes the path.
 * @abstractmethod {@link move_sync} - Synchronously moves the path into a folder.
 * @abstractmethod {@link move} - Asynchronously moves the path into a folder.
 * @abstractmethod {@link copy_sync} - Synchronously copies the path into a folder.
 * @abstractmethod {@link copy} - Asynchronously copies the path into a folder.
 * @abstractmethod {@link rename_sync} - Synchronously renames the path.
 * @abstractmethod {@link rename} - Asynchronously renames the path.
 */
export abstract class Road {
  /**
   * Specifies the target path that this node points to.
   * Use this property only when it is necessary to change the default path.
   */
  protected pointsTo: string
  /**
   * Gets the location that this node points to.
   * @returns The string representing the location this node points to.
   */
  get isAt(): string { return this.pointsTo }
  /**
   * Indicates whether this instance is allowed to perform modifying operations on the underlying filesystem entry.
   * This does NOT reflect the actual filesystem permissions, but rather serves as an internal flag.
   * Subclasses can override this property if necessary.
   * Set to `false` to prevent modifications even if the os's filesystem would allow it.
   * @returns `true` if the entry is mutable; otherwise, `false`.
   */
  mutable: boolean = true

  // Constructor and factory methods
  /**
   * Constructs a new instance, verifying the existence of the specified path and resolving it.
   * Throws an error if the constructed instance is not of the expected type.
   *
   * @param _lookFor - The file system path to check for existence and resolve.
   * @throws {Error} If the path does not exist or if the instance type does not match the expected type.
   */
  constructor(_lookFor: string) {
    fs.accessSync(_lookFor, fs.constants.F_OK)
    this.pointsTo = ph.resolve(_lookFor)
    if (!(this instanceof roadType(this.isAt)))
      throw new Error(`Type missmatch: Path '${this.isAt}' is not of constructed type ${this.constructor.name}`)
  }
  /**
   * Asynchronously creates an instance of a {@link Road} subclass based on the provided file path.
   *
   * This factory method first checks if the specified file exists, determines the appropriate
   * {@link Road} subclass constructor using the {@link roadType} function, and then returns a new instance
   * of that subclass initialized with the given file path.
   *
   * @param _lookFor - The file path to check and use for instantiating the {@link Road} subclass.
   * @returns A promise that resolves to an instance of a {@link Road} subclass.
   * @throws If the file does not exist or if instantiation fails.
   */
  static async factory(_lookFor: string): Promise<Road> {
    await fp.access(_lookFor, fs.constants.F_OK)
    const roadCtor = roadType(_lookFor)
    return new roadCtor(_lookFor)
  }
  static factory_sync(_lookFor: string): Road {
    fs.accessSync(_lookFor, fs.constants.F_OK)
    const roadCtor = roadType(_lookFor)
    return new roadCtor(_lookFor)
  }

  // Query methods (async and sync)
  /**
   * Asserts that the current node is mutable.
   * 
   * @throws {Error} If the node is not mutable.
   */
  assert_mutable(): void {
    if (!this.mutable)
      throw new Error(`Mutability attempt failed: Node at path '${this.isAt}' can't be modified by this instance (unrelated to OS permissions).`)
  }
  /**
   * Checks synchronously whether the file or directory at the path specified by {@link isAt} exists,
   * and verifies that the current instance is of the type returned by {@link roadType}.
   *
   * @returns {boolean} `true` if the path exists and the instance matches the type; otherwise, `false`.
   */
  exists_sync(): boolean {
    return fs.existsSync(this.isAt) && (this instanceof roadType(this.isAt))
  }
  /**
   * Asynchronously checks if the file or directory at the specified path exists.
   *
   * Attempts to access the path using the file system's access method. If the path exists,
   * it further checks if the current instance is of the type returned by {@link roadType}.
   * Returns `true` if both conditions are met, otherwise returns `false`.
   *
   * @returns {Promise<boolean>} A promise that resolves to `true` if the path exists and the instance type matches, or `false` otherwise.
   */
  async exists(): Promise<boolean> {
    try {
      await fp.access(this.isAt, fs.constants.F_OK)
      return this instanceof roadType(this.isAt)
    } catch {
      return false
    }
  }
  /**
   * Synchronously retrieves the file system statistics for the path specified by {@link isAt}.
   *
   * @returns {fs.Stats} The file system statistics object for the current path.
   * @throws {Error} If the path does not exist or an I/O error occurs.
   */
  stats_sync(): fs.Stats {
    return fs.lstatSync(this.isAt)
  }
  /**
   * Asynchronously retrieves the file system statistics for the current node.
   *
   * @returns A promise that resolves to an {@link fs.Stats} object containing information about the file or directory at the current path.
   */
  async stats(): Promise<fs.Stats> {
    return fp.lstat(this.isAt)
  }

  // Path methods
  /**
   * Calculates the depth of the current node based on the number of path separators
   * in the {@link isAt} property. The depth is determined by splitting the path using the
   * platform-specific separator and subtracting one from the resulting segments.
   *
   * @returns {number} The depth of the node in the path hierarchy.
   */
  depth(): number {
    return this.isAt.split(ph.sep).length - 1
  }
  /**
   * Returns the parent folder of the current node.
   *
   * @returns {Folder} A new {@link Folder} instance representing the parent directory of the current node.
   */
  parent(): Folder {
    return new Folder(ph.dirname(this.isAt))
  }
  /**
   * Returns an array of ancestor folders for the current folder, traversing up the parent chain.
   * The traversal continues until a folder is reached whose {@link isAt} property is equal to its parent's {@link isAt} property,
   * which is assumed to be the root or a sentinel node.
   *
   * @returns {Folder[]} An array of ancestor folders, starting from the immediate parent up to (but not including) the root.
   */
  ancestors(): Folder[] {
    const result: Folder[] = []
    let current: Folder = this.parent()
    while (current.isAt !== current.parent().isAt) {
      result.push(current)
      current = current.parent()
    }
    return result
  }
  /**
   * Returns the base name of the current node's path.
   *
   * @returns The base name extracted from the `isAt` property.
   */
  name(): string {
    return ph.basename(this.isAt)
  }
  /**
   * Joins the current path (`this.isAt`) with one or more additional path segments.
   *
   * @param _paths - One or more string path segments to join to the current path.
   * @returns The resulting path as a string.
   */
  join(..._paths: string[]): string {
    return ph.join(this.isAt, ..._paths)
  }

  // Access method
  /**
   * Synchronously checks if the file or directory at the path specified by `this.isAt` is accessible with the given mode.
   *
   * @param _mode - The accessibility checks to be performed (default is `fs.constants.F_OK`).
   * @returns `true` if the file or directory is accessible with the specified mode, `false` if it does not exist or is not accessible.
   * @throws Rethrows any error that is not `ENOENT` (no such file or directory) or `EACCES` (permission denied).
   */
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
  /**
   * Checks if the file or directory at the current path is accessible with the specified mode.
   *
   * @param _mode - The accessibility checks to perform (defaults to `fs.constants.F_OK`).
   * @returns A promise that resolves to `true` if accessible, or `false` if not found or access is denied.
   * @throws Rethrows any unexpected errors other than 'ENOENT' (not found) or 'EACCES' (permission denied).
   */
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
  /**
   * Waits asynchronously until the file or directory at `this.isAt` becomes accessible with the specified mode.
   * 
   * This method first checks if the target is accessible using the provided mode (default is `fs.constants.F_OK`).
   * If not accessible, it sets up a file system watcher and waits for change events, rechecking accessibility after each event.
   * The process can be aborted using the provided `AbortSignal`.
   * An optional callback can be invoked on each unsuccessful attempt.
   *
   * @param _mode - The accessibility check mode (e.g., `fs.constants.F_OK`, `fs.constants.R_OK`). Defaults to `fs.constants.F_OK`.
   * @param _abortSignal - An `AbortSignal` to allow aborting the wait operation.
   * @param _onEachAttempt - Optional callback invoked after each unsuccessful accessibility check.
   * @returns A promise that resolves when the target becomes accessible or rejects if aborted.
   */
  async until_accessible(_mode: number = fs.constants.F_OK, _abortSignal: AbortSignal, _onEachAttempt?: () => unknown): Promise<void> {
    const watcher = fs.watch(this.isAt)
    try {
      if (await this.accessible(_mode))
        return
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of on(watcher, 'change', { signal: _abortSignal }))
        if (await this.accessible(_mode))
          return
        else
          await _onEachAttempt?.()
    } finally {
      watcher.close()
    }
  }
  /**
   * Watches for changes on the file or directory specified by `this.isAt` and executes an optional callback when a change occurs.
   *
   * @param _abortSignal - An `AbortSignal` used to cancel the watcher and stop listening for changes.
   * @param _thenDo - An optional callback function to execute each time a change event is detected.
   * @returns A `Promise` that resolves when the watcher is closed, either due to an abort signal or after completion.
   * @async
   */
  async on_change(_abortSignal: AbortSignal, _thenDo?: () => unknown): Promise<void> {
    const watcher = fs.watch(this.isAt)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of on(watcher, 'change', { signal: _abortSignal }))
        await _thenDo?.()
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



/**
 * Represents a file in the filesystem, providing synchronous and asynchronous methods
 * for reading, writing, appending, copying, moving, renaming, and deleting file content.
 * 
 * Supports both text and binary operations, as well as streaming interfaces for reading
 * and writing. The `File` class extends `Road` and is designed to be used in conjunction
 * with the `Folder` class for file management tasks.
 * 
 * Methods are provided for both synchronous and asynchronous usage, allowing flexibility
 * depending on the application's requirements.
 * 
 * @method `create`: Asynchronously creates a file at the specified path if it does not exist.
 * @method `create_sync`: Synchronously creates a file at the specified path if it does not exist.
 * @method `read_text_sync`: Synchronously reads the file content as a UTF-8 string.
 * @method `read_text`: Asynchronously reads the file content as a UTF-8 string.
 * @method `it_lines`: Asynchronously iterates over the lines of the file.
 * @method `write_text_sync`: Synchronously writes a UTF-8 string to the file.
 * @method `write_text`: Asynchronously writes a UTF-8 string to the file.
 * @method `append_text_sync`: Synchronously appends a UTF-8 string to the file.
 * @method `append_text`: Asynchronously appends a UTF-8 string to the file.
 * @method `read_bytes_sync`: Synchronously reads the file content as a Buffer.
 * @method `read_bytes`: Asynchronously reads the file content as a Buffer.
 * @method `it_bytes_sync`: Synchronously iterates over the file content in chunks.
 * @method `it_bytes`: Asynchronously iterates over the file content in chunks.
 * @method `write_bytes_sync`: Synchronously writes a Buffer to the file.
 * @method `write_bytes`: Asynchronously writes a Buffer to the file.
 * @method `append_bytes_sync`: Synchronously appends a Buffer to the file.
 * @method `append_bytes`: Asynchronously appends a Buffer to the file.
 * @method `it_bytes_writeable_sync`: Synchronously provides a writable stream for writing file content in chunks.
 * @method `it_bytes_writeable`: Asynchronously provides a writable stream for writing file content in chunks.
 * @method `create_read_stream`: Creates a readable stream for the file.
 * @method `create_write_stream`: Creates a writable stream for the file.
 * @method `extension`: Returns the file extension.
 * 
 * @remarks
 * - The file path is managed internally and can be updated by operations such as move or rename.
 * - Mutating operations assert that the file is mutable before proceeding.
 * - File extension and parent folder can be accessed via utility methods.
 * 
 * @example
 * ```typescript
 * // Create a new file (async)
 * const file = await File.create('/path/to/file.txt');
 * await file.write_text('Hello, world!');
 * 
 * // Read file content (sync)
 * const content = file.read_text_sync();
 * 
 * // Move file to another folder (async)
 * await file.move(anotherFolder);
 * ```
 */
export class File extends Road {
  /**
   * Creates a new `File` instance at the specified path.
   * If the file does not exist, it will be created as an empty file.
   *
   * @param _at - The file path where the `File` should be created.
   * @returns A promise that resolves to the created `File` instance.
   */
  static async create(_at: string): Promise<File> {
    try {
      await fp.access(_at, fs.constants.F_OK)
    } catch {
      await fp.writeFile(_at, "")
    }
    return new File(_at)
  }
  /**
   * Synchronously creates a file at the specified path if it does not already exist.
   *
   * @param _at - The file path where the file should be created.
   * @returns A new instance of the `File` class representing the file at the specified path.
   * @throws Will throw an error if the file cannot be created or accessed.
   */
  static create_sync(_at: string): File {
    try {
      fs.accessSync(_at, fs.constants.F_OK)
    } catch {
      fs.writeFileSync(_at, "")
    }
    return new File(_at)
  }

  // Content as text manipulation
  /**
   * Reads the contents of the file at the path specified by `this.isAt` synchronously and returns it as a UTF-8 encoded string.
   *
   * @returns {string} The contents of the file as a string.
   * @throws {Error} If the file cannot be read, an error is thrown.
   */
  read_text_sync(): string {
    return fs.readFileSync(this.isAt, { encoding: "utf-8" })
  }
  /**
   * Asynchronously reads the contents of the file at the path specified by `this.isAt`
   * and returns it as a UTF-8 encoded string.
   *
   * @returns A promise that resolves to the file's contents as a string.
   * @throws If the file cannot be read, the promise will be rejected with an error.
   */
  async read_text(): Promise<string> {
    return fp.readFile(this.isAt, { encoding: "utf-8" })
  }
  /**
   * Asynchronously iterates over the lines of a file specified by `this.isAt`.
   *
   * Opens a readable stream to the file and yields each line as a string.
   * The iteration is performed lazily and supports asynchronous consumption.
   *
   * @returns {AsyncIterableIterator<string>} An async iterator yielding each line of the file as a string.
   * @throws Will throw if the file cannot be read.
   */
  async *it_lines(): AsyncIterableIterator<string> {
    for await (const line of rl.createInterface({ input: fs.createReadStream(this.isAt, { encoding: "utf-8" }), crlfDelay: Infinity }))
      yield line
  }
  /**
   * Writes the provided text content synchronously to the file at the current path.
   *
   * This method first checks if the node is mutable by calling `assert_mutable()`.
   * If the node is mutable, it writes the given string to the file specified by `this.isAt`
   * using UTF-8 encoding. If the file does not exist, it will be created.
   *
   * @param _content - The text content to write to the file.
   * @throws {Error} If the node is not mutable or if the write operation fails.
   */
  write_text_sync(_content: string): void {
    this.assert_mutable()
    fs.writeFileSync(this.isAt, _content, { encoding: "utf-8" })
  }
  /**
   * Writes the provided text content to the file at the current node's path.
   *
   * @param _content - The string content to be written to the file.
   * @returns A promise that resolves when the write operation is complete.
   * @throws If the node is not mutable.
   */
  async write_text(_content: string): Promise<void> {
    this.assert_mutable()
    return fp.writeFile(this.isAt, _content, { encoding: "utf-8" })
  }
  /**
   * Appends the specified text content synchronously to the file at the current path.
   *
   * This method first checks if the node is mutable by calling `assert_mutable()`.
   * If the node is mutable, it appends the provided `_content` string to the file
   * located at `this.isAt` using UTF-8 encoding.
   *
   * @param _content - The text content to append to the file.
   * @throws Will throw an error if the node is not mutable or if the file operation fails.
   */
  append_text_sync(_content: string): void {
    this.assert_mutable()
    fs.appendFileSync(this.isAt, _content, { encoding: "utf-8" })
  }
  /**
   * Appends the specified text content to the file at the current path.
   *
   * @param _content - The text content to append to the file.
   * @returns A promise that resolves when the operation is complete.
   * @throws If the node is not mutable.
   */
  async append_text(_content: string): Promise<void> {
    this.assert_mutable()
    return fp.appendFile(this.isAt, _content, { encoding: "utf-8" })
  }

  // Content as binary reading/manipulation
  /**
   * Reads the contents of the file at the path specified by `this.isAt` synchronously and returns it as a Buffer.
   *
   * @returns {Buffer} The contents of the file as a Buffer.
   * @throws {Error} If the file cannot be read, an error is thrown.
   */
  read_bytes_sync(): Buffer {
    return fs.readFileSync(this.isAt)
  }
  async read_bytes(): Promise<Buffer> {
    return fp.readFile(this.isAt)
  }
  /**
   * Synchronously reads the contents of a file in fixed-size chunks and yields each chunk as a Buffer.
   *
   * @param _chunkSize - The size (in bytes) of each chunk to read from the file. Defaults to 1024 bytes.
   * @yields {Buffer} A Buffer containing the bytes read from the file for each chunk.
   * @throws Will throw an error if the file cannot be opened or read.
   *
   * @example
   * for (const chunk of node.it_bytes_sync(4096)) {
   *   // Process each chunk
   * }
   */
  *it_bytes_sync(_chunkSize: number = 1024): IterableIterator<Buffer> {
    const fd = fs.openSync(this.isAt, 'r')
    const buffer = Buffer.alloc(_chunkSize)
    let bytesRead: number
    try {
      do {
        bytesRead = fs.readSync(fd, buffer, 0, _chunkSize, null)
        if (bytesRead > 0)
          yield buffer.subarray(0, bytesRead)
      } while (bytesRead === _chunkSize)
    } finally {
      fs.closeSync(fd)
    }
  }
  /**
   * Asynchronously iterates over the contents of a file in chunks of the specified size, yielding each chunk as a Buffer.
   *
   * @param _chunkSize - The size (in bytes) of each chunk to read from the file. Defaults to 1024 bytes.
   * @returns An async iterable iterator that yields Buffer objects containing the bytes read from the file.
   *
   * @remarks
   * - Opens the file at `this.isAt` for reading.
   * - Yields each chunk of data until the end of the file is reached.
   * - Ensures the file descriptor is properly closed after iteration, even if an error occurs.
   */
  async *it_bytes(_chunkSize: number = 1024): AsyncIterableIterator<Buffer> {
    const fd = await fp.open(this.isAt, 'r')
    const buffer = Buffer.alloc(_chunkSize)
    let bytesRead: number
    try {
      do {
        const readResult = await fd.read(buffer, 0, _chunkSize, null)
        bytesRead = readResult.bytesRead
        if (bytesRead > 0)
          yield buffer.subarray(0, bytesRead)
      } while (bytesRead === _chunkSize)
    } finally {
      await fd.close()
    }
  }
  /**
   * Synchronously writes the provided buffer content to the file at the current path.
   *
   * @param _content - The buffer containing the data to write.
   * @throws {Error} If the node is not mutable or if the write operation fails.
   */
  write_bytes_sync(_content: Buffer): void {
    this.assert_mutable()
    fs.writeFileSync(this.isAt, _content)
  }
  /**
   * Writes the provided buffer content to the file at the current path.
   *
   * @param _content - The buffer containing the bytes to write to the file.
   * @returns A promise that resolves when the write operation is complete.
   * @throws If the node is not mutable.
   */
  async write_bytes(_content: Buffer): Promise<void> {
    this.assert_mutable()
    return fp.writeFile(this.isAt, _content)
  }
  /**
   * Appends the given buffer content synchronously to the file at the current path.
   *
   * @param _content - The buffer containing bytes to append to the file.
   * @throws Will throw an error if the node is not mutable or if the file operation fails.
   */
  append_bytes_sync(_content: Buffer): void {
    this.assert_mutable()
    fs.appendFileSync(this.isAt, _content)
  }
  /**
   * Appends the given buffer content to the file at the current path.
   *
   * @param _content - The buffer containing bytes to append to the file.
   * @returns A promise that resolves when the append operation is complete.
   * @throws If the node is not mutable.
   */
  async append_bytes(_content: Buffer): Promise<void> {
    this.assert_mutable()
    return fp.appendFile(this.isAt, _content)
  }
  /**
   * Creates and returns a readable file stream for the file located at `this.isAt`.
   *
   * @returns {fs.ReadStream} A readable stream for the specified file.
   *
   * @remarks
   * This method utilizes Node.js's `fs.createReadStream` to open a stream for reading the file.
   * Ensure that `this.isAt` contains a valid file path.
   *
   * @throws {Error} If the file does not exist or cannot be opened, an error will be thrown by the underlying `fs` module.
   */
  create_read_stream(): fs.ReadStream {
    return fs.createReadStream(this.isAt)
  }
  /**
   * Creates and returns a writable file stream for the current file path.
   *
   * @returns {fs.WriteStream} A writable stream for the file at `this.isAt`.
   * @throws {Error} If the node is not mutable.
   */
  create_write_stream(): fs.WriteStream {
    this.assert_mutable()
    return fs.createWriteStream(this.isAt)
  }
  /**
   * Compares the content and position of this file with another file to determine if they are identical.
   *
   * @param _other - The other `File` instance to compare against.
   * @returns {Promise<boolean>} A promise that resolves to `true` if the contents are identical, or `false` otherwise.
   * @throws {Error} If either file cannot be read.
   */
  async same_as(_other: File): Promise<boolean> {
    if (this.isAt !== _other.isAt)
      return false
    const thisBuffer = await fp.readFile(this.isAt)
    const otherBuffer = await fp.readFile(_other.isAt)
    return thisBuffer.equals(otherBuffer)
  }
  /**
   * Synchronously compares the content and position of this file with another file to determine if they are identical.
   *
   * @param _other - The other `File` instance to compare against.
   * @returns {boolean} `true` if the contents are identical, `false` otherwise.
   * @throws {Error} If either file cannot be read.
   */
  same_as_sync(_other: File): boolean {
    if (this.isAt !== _other.isAt)
      return false
    const thisBuffer = fs.readFileSync(this.isAt)
    const otherBuffer = fs.readFileSync(_other.isAt)
    return thisBuffer.equals(otherBuffer)
  }

  // Properties
  /**
   * Returns the file extension of the current path stored in `this.isAt`.
   *
   * @returns The file extension as a string, including the leading dot (e.g., ".txt").
   */
  ext(): string {
    return ph.extname(this.isAt)
  }

  // Implement abstract methods
  /**
   * Synchronously deletes the file at the path specified by `this.isAt`.
   * 
   * @throws {Error} If the node is not mutable or if the file cannot be deleted.
   * @remarks
   * This method first checks if the node is mutable by calling `assert_mutable()`.
   * If the check passes, it deletes the file using `fs.unlinkSync`.
   */
  delete_sync(): void {
    this.assert_mutable()
    fs.unlinkSync(this.isAt)
  }
  /**
   * Asynchronously deletes the file at the path specified by `this.isAt`.
   * 
   * @returns A promise that resolves when the file has been deleted.
   * @throws {Error} If the node is not mutable or if the file cannot be deleted.
   * @remarks
   * This method first checks if the node is mutable by calling `assert_mutable()`.
   * If the check passes, it deletes the file using `fp.unlink`.
   */
  async delete(): Promise<void> {
    this.assert_mutable()
    return fp.unlink(this.isAt)
  }
  /**
   * Synchronously moves the file to the specified folder.
   *
   * @param _into - The target folder where the file should be moved.
   * @throws {Error} If the node is not mutable.
   */
  move_sync(_into: Folder): void {
    this.assert_mutable()
    const newPath = _into.join(this.name())
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  /**
   * Asynchronously moves the file to the specified folder.
   *
   * @param _into - The target folder where the file should be moved.
   * @throws {Error} If the node is not mutable.
   */
  async move(_into: Folder): Promise<void> {
    this.assert_mutable()
    const newPath = _into.join(this.name())
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
  /**
   * Copies the current file synchronously into the specified folder.
   *
   * @param _into - The destination folder where the file will be copied.
   * @returns A new instance of the file at the destination path, typed as `this`.
   */
  copy_sync(_into: Folder): this {
    const newPath = _into.join(this.name())
    fs.copyFileSync(this.isAt, newPath)
    return new File(newPath) as this
  }
  /**
   * Asynchronously copies the current file to the specified folder.
   *
   * @param _into - The destination folder where the file should be copied.
   * @returns A promise that resolves to a new instance of this file at the new location.
   */
  async copy(_into: Folder): Promise<this> {
    const newPath = _into.join(this.name())
    await fp.copyFile(this.isAt, newPath)
    return new File(newPath) as this
  }
  /**
   * Renames the current node synchronously to the specified path.
   *
   * This method asserts that the node is mutable, constructs the new path
   * by joining the parent directory with the provided `_to` string, and
   * then renames the file or directory on the filesystem. After renaming,
   * it updates the internal reference to the new path.
   *
   * @param _to - The new name or relative path for the node.
   * @throws {Error} If the node is not mutable or if the rename operation fails.
   */
  rename_sync(_to: string): void {
    this.assert_mutable()
    const newPath = this.parent().join(_to)
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  /**
   * Renames the current node to the specified new name.
   *
   * @param _to - The new name for the node.
   * @returns A promise that resolves when the rename operation is complete.
   * @throws If the node is not mutable.
   */
  async rename(_to: string): Promise<void> {
    this.assert_mutable()
    const newPath = this.parent().join(_to)
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
}



/**
 * Represents a folder in the filesystem, extending the `Road` class.
 * Provides synchronous and asynchronous methods for folder creation, traversal, listing, searching, and manipulation.
 *
 * @function `create`: Asynchronously creates a folder at the specified path if it does not exist.
 * @function `create_sync`: Synchronously creates a folder at the specified path if it does not exist.
 * @function `walk_list_sync`: Synchronously lists all entries matching a glob pattern.
 * @function `walk_list`: Asynchronously lists all entries matching a glob pattern.
 * @method `list_sync`: Synchronously lists entries in the folder, optionally filtering by type.
 * @method `list`: Asynchronously lists entries in the folder, optionally filtering by type.
 * @method `find_sync`: Synchronously finds an entry by name, optionally filtering by type.
 * @method `find`: Asynchronously finds an entry by name, optionally filtering by type.
 * @method `delete_sync`: Synchronously deletes the folder and its contents.
 * @method `delete`: Asynchronously deletes the folder and its contents.
 * @method `move_sync`: Synchronously moves the folder into another folder.
 * @method `move`: Asynchronously moves the folder into another folder.
 * @method `copy_sync`: Synchronously copies the folder into another folder.
 * @method `copy`: Asynchronously copies the folder into another folder.
 * @method `rename_sync`: Synchronously renames the folder.
 * @method `rename`: Asynchronously renames the folder.
 *
 * @remarks
 * This class assumes the existence of the `Road` base class and uses Node.js `fs` and `glob` modules for filesystem operations.
 */
export class Folder extends Road {
  /**
   * Creates a new `Folder` instance at the specified path.
   * If the folder does not exist, it will be created recursively.
   *
   * @param _at - The file system path where the folder should be created or accessed.
   * @returns A promise that resolves to a `Folder` instance representing the specified path.
   */
  static async create(_at: string): Promise<Folder> {
    try {
      await fp.access(_at, fs.constants.F_OK)
    } catch {
      await fp.mkdir(_at, { recursive: true })
    }
    return new Folder(_at)
  }
  /**
   * Synchronously creates a folder at the specified path if it does not already exist.
   *
   * @param _at - The path where the folder should be created.
   * @returns A new instance of the `Folder` class representing the created or existing folder.
   * @throws Will throw an error if the folder cannot be created and does not already exist.
   */
  static create_sync(_at: string): Folder {
    try {
      fs.accessSync(_at, fs.constants.F_OK)
    } catch {
      fs.mkdirSync(_at, { recursive: true })
    }
    return new Folder(_at)
  }

  // list_sync overloads
  /**
   * Synchronously lists all entries in the current folder.
   *
   * @returns An array of `Road` instances representing all entries in the folder.
   */
  list_sync(): Road[]
  list_sync<T extends Road>(expectedType: new (_: string) => T): T[]
  list_sync<T extends Road>(expectedType?: new (_: string) => T): Road[] | T[] {
    const entries = fs.readdirSync(this.isAt).map(entry => Road.factory_sync(this.join(entry)))
    if (!expectedType)
      return entries
    return entries.filter(entry => entry instanceof expectedType) as T[]
  }

  // list async overloads
  /**
   * Asynchronously lists all entries in the current folder.
   *
   * @returns A promise that resolves to an array of `Road` instances representing all entries in the folder.
   */
  async list(): Promise<Road[]>
  async list<T extends Road>(_expectedType: new (_: string) => T): Promise<T[]>
  async list<T extends Road>(_expectedType?: new (_: string) => T): Promise<Road[] | T[]> {
    const entries = (await fp.readdir(this.isAt)).map(async entry => Road.factory(this.join(entry)))
    const resolvedEntries = await Promise.all(entries)
    if (!_expectedType)
      return resolvedEntries
    return resolvedEntries.filter(entry => entry instanceof _expectedType) as T[]
  }

  // find_sync overloads
  /**
   * Synchronously finds an entry by name in the current folder.
   *
   * @param name - The name of the entry to find.
   * @returns The found `Road` instance or `null` if not found.
   */
  find_sync(name: string): Road | null
  find_sync<T extends Road>(name: string, _expectedType: new (_: string) => T): T | null
  find_sync<T extends Road>(name: string, _expectedType?: new (_: string) => T): Road | T | null {
    try {
      fs.accessSync(this.join(name), fs.constants.F_OK)
      const found = Road.factory_sync(this.join(name))
      if (!_expectedType)
        return found
      if (found instanceof _expectedType)
        return found as T
      return null
    } catch {
      return null
    }
  }

  // find async overloads
  /**
   * Asynchronously finds an entry by name in the current folder.
   * 
   * @param name - The name of the entry to find.
   * @returns A promise that resolves to the found `Road` instance or `null` if not found.
   */
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

  // Implement abstract methods
  /**
   * Synchronously deletes the directory at the current path, including all its contents.
   * 
   * @remarks
   * This method asserts that the node is mutable before performing the deletion.
   * It uses `fs.rmdirSync` with the `recursive` option set to `true`, which removes the directory and all its descendants.
   * 
   * @throws {Error} If the node is not mutable or if the deletion fails.
   */
  delete_sync(): void {
    this.assert_mutable()
    fs.rmdirSync(this.isAt, { recursive: true })
  }
  /**
   * Deletes the directory at the current path.
   * 
   * This method asserts that the node is mutable before attempting deletion.
   * It recursively removes the directory and all of its contents.
   * 
   * @returns A promise that resolves when the directory has been deleted.
   * @throws If the node is not mutable or if the deletion fails.
   */
  async delete(): Promise<void> {
    this.assert_mutable()
    return fp.rmdir(this.isAt, { recursive: true })
  }
  /**
   * Moves the current node synchronously into the specified folder.
   *
   * This method asserts that the node is mutable, computes the new path by joining
   * the target folder with the current node's name, and then renames (moves) the node
   * to the new location using a synchronous file system operation. Updates the internal
   * reference to the new path.
   *
   * @param _into - The target `Folder` instance where this node should be moved.
   * @throws {Error} If the node is not mutable or if the file system operation fails.
   */
  move_sync(_into: Folder): void {
    this.assert_mutable()
    const newPath = _into.join(this.name())
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  /**
   * Moves the current node to a new folder.
   *
   * This method asserts that the node is mutable, constructs the new path by joining
   * the target folder with the current node's name, renames (moves) the node to the new path,
   * and updates the internal reference to the new location.
   *
   * @param _into - The target `Folder` to move this node into.
   * @returns A promise that resolves when the move operation is complete.
   * @throws If the node is not mutable or if the rename operation fails.
   */
  async move(_into: Folder): Promise<void> {
    this.assert_mutable()
    const newPath = _into.join(this.name())
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
  /**
   * Copies the current folder synchronously into the specified target folder.
   *
   * @param _into - The target `Folder` instance where the current folder will be copied.
   * @returns A new instance of the folder at the destination path, typed as `this`.
   *
   * @remarks
   * This method uses `fs.cpSync` to perform a recursive copy of the folder's contents.
   * The new folder will have the same name as the original and will be located inside the target folder.
   */
  copy_sync(_into: Folder): this {
    const newPath = _into.join(this.name())
    fs.cpSync(this.isAt, newPath, { recursive: true })
    return new Folder(newPath) as this
  }
  /**
   * Copies the current folder to the specified destination folder.
   *
   * @param _into - The destination `Folder` where the current folder will be copied.
   * @returns A promise that resolves to the new `Folder` instance at the destination path.
   */
  async copy(_into: Folder): Promise<this> {
    const newPath = _into.join(this.name())
    await fp.cp(this.isAt, newPath, { recursive: true })
    return new Folder(newPath) as this
  }
  /**
   * Renames the current node synchronously to the specified new path.
   *
   * This method asserts that the node is mutable before proceeding. It constructs
   * the new path by joining the parent directory with the provided `_to` string,
   * then renames the file or directory on the filesystem using `fs.renameSync`.
   * After renaming, it updates the internal `pointsTo` property to reflect the new path.
   *
   * @param _to - The new name or path for the node relative to its parent.
   * @throws {Error} If the node is not mutable or if the rename operation fails.
   */
  rename_sync(_to: string): void {
    this.assert_mutable()
    const newPath = this.parent().join(_to)
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  /**
   * Renames the current node to the specified new name.
   *
   * @param _to - The new name for the node.
   * @returns A promise that resolves when the rename operation is complete.
   * @throws If the node is not mutable.
   */
  async rename(_to: string): Promise<void> {
    this.assert_mutable()
    const newPath = this.parent().join(_to)
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
}



/**
 * Represents a symbolic link (symlink) in the filesystem, extending the `Road` class.
 * Provides both asynchronous and synchronous methods for creating, deleting, moving, copying,
 * renaming, and retargeting symbolic links, as well as resolving their targets.
 *
 * @remarks
 * - The class assumes the existence of utility modules such as `fs`, `fp` (promisified fs), and `ph` (path).
 * - All mutating operations assert that the symbolic link is mutable before proceeding.
 * - Methods that operate on the filesystem are provided in both async and sync variants.
 *
 * @example
 * ```typescript
 * // Asynchronously create a symbolic link
 * const symlink = await SymbolicLink.create('/path/to/link', targetRoad);
 *
 * // Synchronously move a symbolic link
 * symlink.move_sync(newFolder);
 * ```
 */
export class SymbolicLink extends Road {

  /**
   * Creates a symbolic link at the specified path if it does not already exist.
   *
   * @param _at - The file system path where the symbolic link should be created.
   * @param _target - (Optional) The target `Road` object to which the symbolic link should point.
   * @returns A promise that resolves to a new `SymbolicLink` instance representing the created or existing link.
   */
  static async create(_at: string, _target?: Road): Promise<SymbolicLink> {
    try {
      await fp.access(_at, fs.constants.F_OK)
    } catch {
      await fp.symlink(_target?.isAt ?? "", _at)
    }
    return new SymbolicLink(_at)
  }
  /**
   * Creates a symbolic link at the specified path synchronously.
   * 
   * If the path already exists, no action is taken. If it does not exist,
   * a new symbolic link is created pointing to the target's path.
   * 
   * @param _at - The file system path where the symbolic link should be created.
   * @param _target - (Optional) The `Road` instance representing the target of the symbolic link.
   * @returns A new `SymbolicLink` instance representing the created or existing link.
   */
  static create_sync(_at: string, _target?: Road): SymbolicLink {
    try {
      fs.accessSync(_at, fs.constants.F_OK)
    } catch {
      fs.symlinkSync(_target?.isAt ?? "", _at)
    }
    return new SymbolicLink(_at)
  }

  // Target methods
  /**
   * Synchronously creates and returns a `Road` instance based on the symbolic link at the current node's path.
   *
   * Resolves the directory name of `this.isAt`, reads the target of the symbolic link at `this.isAt`,
   * and uses these values to construct a new `Road` object via `Road.factory_sync`.
   *
   * @returns {Road} The constructed `Road` instance representing the resolved symbolic link.
   */
  target_sync(): Road {
    return Road.factory_sync(ph.resolve(ph.dirname(this.isAt), fs.readlinkSync(this.isAt)))
  }
  /**
   * Asynchronously resolves the target of a symbolic link represented by `this.isAt`.
   * Reads the link at the current path, resolves its absolute path, and returns a `Road` instance for the target.
   *
   * @returns {Promise<Road>} A promise that resolves to a `Road` instance representing the target of the symbolic link.
   * @throws Will throw if reading the symbolic link or resolving the path fails.
   */
  async target(): Promise<Road> {
    const linkPath = await fp.readlink(this.isAt)
    return Road.factory(ph.resolve(ph.dirname(this.isAt), linkPath))
  }
  /**
   * Retargets the current node to a new target synchronously by updating its symbolic link.
   *
   * This method first asserts that the node is mutable, then deletes the existing symbolic link,
   * and finally creates a new symbolic link pointing to the specified `_newTarget`.
   *
   * @param _newTarget - The `Road` instance representing the new target location for the symbolic link.
   * @throws Will throw an error if the node is not mutable or if file system operations fail.
   */
  retarget_sync(_newTarget: Road): void {
    this.assert_mutable()
    this.delete_sync()
    fs.symlinkSync(_newTarget.isAt, this.isAt)
  }
  /**
   * Retargets the current node to a new target by first ensuring the node is mutable,
   * deleting the existing target, and then creating a symbolic link to the new target.
   *
   * @param _newTarget - The new `Road` instance to which the node should be retargeted.
   * @returns A promise that resolves when the retargeting operation is complete.
   * @throws If the node is not mutable or if the delete or symlink operations fail.
   */
  async retarget(_newTarget: Road): Promise<void> {
    this.assert_mutable()
    await this.delete()
    return fp.symlink(_newTarget.isAt, this.isAt)
  }

  // Implement abstract methods
  /**
   * Synchronously deletes the symbolic link at the current path.
   *
   * @throws {Error} If the node is not mutable or if the deletion fails.
   * @remarks
   * This method first checks if the node is mutable by calling `assert_mutable()`.
   * If the check passes, it deletes the symbolic link using `fs.unlinkSync`.
   */
  delete_sync(): void {
    this.assert_mutable()
    fs.unlinkSync(this.isAt)
  }
  /**
   * Asynchronously deletes the symbolic link at the current path.
   *
   * @returns A promise that resolves when the symbolic link has been deleted.
   * @throws {Error} If the node is not mutable or if the deletion fails.
   * @remarks
   * This method first checks if the node is mutable by calling `assert_mutable()`.
   * If the check passes, it deletes the symbolic link using `fp.unlink`.
   */
  async delete(): Promise<void> {
    this.assert_mutable()
    return fp.unlink(this.isAt)
  }
  /**
   * Synchronously moves the symbolic link to the specified folder.
   *
   * @param _into - The target folder where the symbolic link should be moved.
   * @throws {Error} If the node is not mutable.
   */
  move_sync(_into: Folder): void {
    this.assert_mutable()
    const newPath = _into.join(this.name())
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  /**
   * Moves the current node into the specified folder.
   *
   * This method asserts that the node is mutable, constructs the new path by joining
   * the target folder with the current node's name, and then renames (moves) the node
   * to the new location. After the move, it updates the internal reference to the new path.
   *
   * @param _into - The target `Folder` instance where the node should be moved.
   * @returns A promise that resolves when the move operation is complete.
   * @throws If the node is not mutable or if the file system operation fails.
   */
  async move(_into: Folder): Promise<void> {
    this.assert_mutable()
    const newPath = _into.join(this.name())
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
  /**
   * Creates a symbolic link to the current node within the specified target folder.
   *
   * @param _into - The destination folder where the symbolic link will be created.
   * @returns A new instance of the symbolic link at the new location.
   *
   * @remarks
   * This method synchronously creates a symbolic link using the file system's `symlinkSync` method.
   * The link will have the same name as the original node and will point to the original target.
   */
  copy_sync(_into: Folder): this {
    const newPath = _into.join(this.name())
    const target = this.target_sync()
    fs.symlinkSync(target.isAt, newPath)
    return new SymbolicLink(newPath) as this
  }
  /**
   * Asynchronously creates a symbolic link to the current node within the specified target folder.
   *
   * @param _into - The destination folder where the symbolic link will be created.
   * @returns A promise that resolves to a new instance of the symbolic link at the new location.
   * @remarks
   * This method uses the asynchronous `symlink` function to create the symbolic link.
   * The new link will have the same name as the original node and will point to the original target.
   */
  async copy(_into: Folder): Promise<this> {
    const newPath = _into.join(this.name())
    const target = await this.target()
    await fp.symlink(target.isAt, newPath)
    return new SymbolicLink(newPath) as this
  }
  /**
   * Renames the current node synchronously to the specified new path.
   *
   * This method asserts that the node is mutable before proceeding. It constructs
   * the new path by joining the parent directory with the provided `_to` string,
   * then renames the file or directory on the filesystem using `fs.renameSync`.
   * After renaming, it updates the internal `pointsTo` property to reflect the new path.
   * @param _to - The new name or path for the node relative to its parent.
   * @throws {Error} If the node is not mutable or if the rename operation fails.
   */
  rename_sync(_to: string): void {
    this.assert_mutable()
    const newPath = this.parent().join(_to)
    fs.renameSync(this.isAt, newPath)
    this.pointsTo = newPath
  }
  /**
   * Renames the current node to the specified new name.
   *
   * @param _to - The new name for the node.
   * @returns A promise that resolves when the rename operation is complete.
   * @throws If the node is not mutable.
   */
  async rename(_to: string): Promise<void> {
    this.assert_mutable()
    const newPath = this.parent().join(_to)
    await fp.rename(this.isAt, newPath)
    this.pointsTo = newPath
  }
}



/**
 * Abstract base class representing unusable filesystem entries.
 * 
 * `UnusuableRoad` is intended for special files or filesystem entries that can't,
 * or shouldn't, be manipulated (e.g., device files, system-reserved entries).
 * 
 * All mutating operations such as delete, move, copy, and rename are overridden
 * to throw errors, preventing accidental modification that could cause system issues.
 * 
 * @remarks
 * - The `mutable` property is always `false`.
 * - All mutating methods throw an error when called.
 * 
 * @extends Road
 * 
 * @abstract
 */
export abstract class UnusuableRoad extends Road {
  override readonly mutable: boolean = false // Modification is most likely to cause system issues (e.g. deleting a device file)
  constructor(_at: string) {
    super(_at)
    Object.freeze(this) // Prevent any modifications to the instance
  }
  delete_sync(): never { throw new Error(`Cannot delete type ${this.constructor.name} at '${this.isAt}'`) }
  async delete(): Promise<never> { throw new Error(`Cannot delete type ${this.constructor.name} at '${this.isAt}'`) }
  move_sync(): never { throw new Error(`Cannot move type ${this.constructor.name} at '${this.isAt}'`) }
  async move(): Promise<never> { throw new Error(`Cannot move type ${this.constructor.name} at '${this.isAt}'`) }
  copy_sync(): never { throw new Error(`Cannot copy type ${this.constructor.name} at '${this.isAt}'`) }
  async copy(): Promise<never> { throw new Error(`Cannot copy type ${this.constructor.name} at '${this.isAt}'`) }
  rename_sync(): never { throw new Error(`Cannot rename type ${this.constructor.name} at '${this.isAt}'`) }
  async rename(): Promise<never> { throw new Error(`Cannot rename type ${this.constructor.name} at '${this.isAt}'`) }
}
/**
 * Represents a block device in the system.
 * @remarks This class extends {@link UnusuableRoad} and inherits its properties and methods.
 */
export class BlockDevice extends UnusuableRoad { }
/**
 * Represents a character device in the system.
 * @remarks This class extends {@link UnusuableRoad} and inherits its properties and methods.
 */
export class CharacterDevice extends UnusuableRoad { }
/**
 * Represents a FIFO (named pipe) in the system.
 * @remarks This class extends {@link UnusuableRoad} and inherits its properties and methods.
 */
export class Fifo extends UnusuableRoad { }
/**
 * Represents a socket in the system.
 * @remarks This class extends {@link UnusuableRoad} and inherits its properties and methods.
 */
export class Socket extends UnusuableRoad { }



/**
 * Represents a file that automatically reloads its content from disk when changed.
 *
 * This class extends the `File` class and maintains the latest content of the file in memory.
 * It continuously monitors the file for changes and updates its content accordingly.
 * 
 * @method `update_sync`: Synchronously updates the in-memory content of the file.
 * @method `update`: Asynchronously updates the in-memory content of the file.
 * 
 * @remarks
 * - May be resource intensive for large files or when the file changes rapidly.
 * - Uses an `AbortController` to allow for graceful disposal and stopping of the monitoring loop.
 *
 * @example
 * ```typescript
 * const liveFile = new LiveFile('/path/to/file.txt');
 * // Use liveFile as needed...
 * ```
 *
 * @extends File
 */
export class LiveFile extends File implements AsyncDisposable, Disposable {
  lastReadContent: Buffer = Buffer.alloc(0)
  abortController: AbortController = new AbortController()
  constructor(_at: string) {
    super(_at)
    ;(async () => {
      while (!this.abortController.signal.aborted) {
        await this.update()
        await this.on_change(this.abortController.signal)
      }
    })()
  }
  update_sync(): void {
    this.lastReadContent = this.read_bytes_sync()
  }
  async update(): Promise<void> {
    this.lastReadContent = await this.read_bytes()
  }
  [Symbol.dispose](): void {
    this.abortController.abort()
  }
  async [Symbol.asyncDispose](): Promise<void> {
    this.abortController.abort()
  }
}



/**
 * Represents a temporary file that is automatically deleted when disposed.
 * 
 * @remarks
 * - Extends the `File` class, providing a mutable temporary file.
 * - The file is created in the system's temporary directory with a unique name.
 * - Implements both synchronous and asynchronous disposal using `Symbol.dispose` and `Symbol.asyncDispose`.
 * - On disposal, attempts to delete the file and logs an error if deletion fails.
 * 
 * @example
 * ```typescript
 * using temp = new TempFile();
 * // Use temp file...
 * // File is deleted automatically when disposed.
 * ```
 */
export class TempFile extends File implements AsyncDisposable, Disposable {
  override readonly mutable: boolean = true // Must be mutable to allow deletion
  constructor() {
    super(File.create_sync(ph.join(os.tmpdir(), `tempfile_${Date.now()}_${crypto.randomUUID()}.tmp`)).isAt)
  }
  [Symbol.dispose](): void {
    this.delete_sync()
  }
  async [Symbol.asyncDispose](): Promise<void> {
    await this.delete()
  }
}


/**
 * Represents a temporary folder that is automatically created in the system's temporary directory.
 * 
 * The folder is assigned a unique name using the current timestamp and a random UUID.
 * The folder is marked as mutable and is intended for temporary use.
 * 
 * When disposed (either synchronously or asynchronously), the folder attempts to delete itself.
 * If deletion fails, an error message is logged to the console.
 * 
 * @extends Folder
 * 
 * @example
 * ```typescript
 * using temp = new TempFolder();
 * // Use temp folder...
 * ```
 */
export class TempFolder extends Folder implements AsyncDisposable, Disposable {
  override readonly mutable: boolean = true // Must be mutable to allow deletion
  constructor() {
    super(Folder.create_sync(ph.join(os.tmpdir(), `tempfolder_${Date.now()}_${crypto.randomUUID()}`)).isAt)
  }
  [Symbol.dispose](): void {
    this.delete_sync()
  }
  async [Symbol.asyncDispose](): Promise<void> {
    await this.delete()
  }
}