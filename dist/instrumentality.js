import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
// Helper just in case
export let LAST_ERROR = null; // Only works for throws with this lib
// Vanilla functions (regardless of Node or Web)
export function find_self_in_arr(_array, _lookFor) {
    return _array.find(item => item === _lookFor);
}
export function find_val_in_map(_map, _value) {
    for (const [key, values] of _map.entries())
        if (values.includes(_value))
            return key;
    return undefined;
}
export function to_str(_x) {
    if (typeof _x === "string")
        return _x;
    if (_x === null || _x === undefined)
        return String(_x);
    try {
        return typeof _x.toString === "function" ? _x.toString() : JSON.stringify(_x);
    }
    catch {
        try {
            return JSON.stringify(_x);
        }
        catch {
            return String(_x);
        }
    }
}
export class AnyErr extends Error {
    constructor(_msg) {
        super(`AnyErr->${new.target.name} because: ${_msg}`);
        Object.setPrototypeOf(this, new.target.prototype);
        LAST_ERROR = this;
    }
}
export function range(_from, _to, _step = 1) {
    if (_to === undefined)
        [_from, _to] = [0, _from]; // If only one way
    let result = [];
    if (_from < _to)
        for (let i = _from; i < _to; i += _step)
            result.push(i);
    else if (_from > _to)
        for (let i = _from; i > _to; i -= _step)
            result.push(i);
    return result;
}
export function or_err(_x, _ErrCtor = Error, _msg = "or_err assert failed") {
    if (_x === undefined || _x === null)
        throw new _ErrCtor(_msg);
    return _x;
}
export class TrimErr extends AnyErr {
}
export const TRIM_WITH = "...";
export function trim_begin(_str, _maxLen) {
    /*
      Shorten string from the beginning if it exceeds `_maxLen`
    */
    if (_maxLen <= TRIM_WITH.length)
        throw new TrimErr(`trim_begin _maxLen too short: ${_maxLen}`);
    if (_str.length <= _maxLen)
        return _str;
    return TRIM_WITH + _str.slice(_str.length - (_maxLen - TRIM_WITH.length));
}
export function trim_end(_str, _maxLen) {
    /*
      Shorten string from the end if it exceeds `maxLen`
   */
    if (_maxLen <= TRIM_WITH.length)
        throw new TrimErr(`trim_end _maxLen too short: ${_maxLen}`);
    if (_str.length <= _maxLen)
        return _str;
    return _str.slice(0, _maxLen - TRIM_WITH.length) + TRIM_WITH;
}
export function time_to_str() {
    /*
      Returns HH:MM:SS-DD:MM:YYYY
    */
    const n = new Date();
    const p = (n) => n.toString().padStart(2, "0");
    return `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}-${p(n.getDate())}:${p(n.getMonth() + 1)}:${n.getFullYear()}`;
}
export async function sleep(_ms) {
    if (_ms <= 0)
        return;
    return new Promise(resolve => setTimeout(resolve, _ms));
}
export var ANSII_ESCAPE;
(function (ANSII_ESCAPE) {
    ANSII_ESCAPE["BOLD"] = "\u001B[1m";
    ANSII_ESCAPE["ITALIC"] = "\u001B[3m";
    ANSII_ESCAPE["UNDERLINE"] = "\u001B[4m";
    ANSII_ESCAPE["STRIKETHROUGH"] = "\u001B[9m";
    ANSII_ESCAPE["RESET"] = "\u001B[0m";
    ANSII_ESCAPE["BLACK"] = "\u001B[30m";
    ANSII_ESCAPE["RED"] = "\u001B[31m";
    ANSII_ESCAPE["GREEN"] = "\u001B[32m";
    ANSII_ESCAPE["YELLOW"] = "\u001B[33m";
    ANSII_ESCAPE["BLUE"] = "\u001B[34m";
    ANSII_ESCAPE["MAGENTA"] = "\u001B[35m";
    ANSII_ESCAPE["CYAN"] = "\u001B[36m";
    ANSII_ESCAPE["WHITE"] = "\u001B[37m";
})(ANSII_ESCAPE || (ANSII_ESCAPE = {}));
export class Out {
    silence = false;
    suffix = "";
    prefix;
    constructor(_prefix, _color) {
        this.prefix = _prefix;
        if (_color)
            this.prefix = _color + this.prefix + ANSII_ESCAPE.RESET;
    }
    print(..._args) {
        if (!this.silence)
            console.log(`[${time_to_str()}]${this.prefix}${this.suffix}`, ..._args);
    }
}
export function remove_all_from_arr(_arr, _lookFor) {
    let i = 0;
    while (i < _arr.length)
        if (_arr[i] === _lookFor)
            _arr.splice(i, 1);
        else
            i++;
}
export function inline_try(_func, ..._args) {
    try {
        return _func(..._args);
    }
    catch (e) {
        return null;
    }
}
export function entries(_obj) {
    return Object.entries(_obj);
}
export function rm_fileprotocol_from_src(_rawPath) {
    return _rawPath.replace(/^file:\/\/\//, "");
}
export class AssErr extends AnyErr {
}
export function ass(_conditionResult) {
    if (!_conditionResult)
        throw new AssErr("Assertion failed");
}
export function freezer(obj) {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(prop => {
        const value = obj[prop];
        if (value && typeof value === 'object' && !Object.isFrozen(value))
            freezer(value);
    });
    return obj;
}
export class RetryErr extends AnyErr {
}
export async function retry(_fn, _maxAttempts, _delayMs, ..._args) {
    while (--_maxAttempts >= 0) {
        try {
            return await _fn(..._args);
        }
        catch (err) {
            if (_maxAttempts === 0)
                throw err;
            await sleep(_delayMs);
        }
    }
    throw new RetryErr("Unreachable");
}
// Node specific (comment out if no node access)
export const IS_WINDOWS = process.platform === "win32";
export var RoadT;
(function (RoadT) {
    RoadT["FILE"] = "FILE";
    RoadT["FOLDER"] = "FOLDER";
    RoadT["BLOCK_DEVICE"] = "BLOCK_DEVICE";
    RoadT["CHAR_DEVICE"] = "CHAR_DEVICE";
    RoadT["SYMLINK"] = "SYMLINK";
    RoadT["FIFO"] = "FIFO";
    RoadT["SOCKET"] = "SOCKET";
})(RoadT || (RoadT = {}));
export class RoadTErr extends AnyErr {
}
export function to_RoadT(_pathorMode) {
    const mode = typeof _pathorMode === 'string' ? fs.lstatSync(_pathorMode).mode : _pathorMode;
    switch (mode & fs.constants.S_IFMT) {
        case fs.constants.S_IFREG: return RoadT.FILE;
        case fs.constants.S_IFDIR: return RoadT.FOLDER;
        case fs.constants.S_IFBLK: return RoadT.BLOCK_DEVICE;
        case fs.constants.S_IFCHR: return RoadT.CHAR_DEVICE;
        case fs.constants.S_IFLNK: return RoadT.SYMLINK;
        case fs.constants.S_IFIFO: return RoadT.FIFO;
        case fs.constants.S_IFSOCK: return RoadT.SOCKET;
        default: throw new RoadTErr(`Unknown mode type ${mode} for path/mode: '${_pathorMode}'`);
    }
}
export class RoadErr extends AnyErr {
    /*
      Custom error class involving problematic attempts
      to handle the underlying Road
    */
    self;
    constructor(_self, _because) {
        super(`At (path: '${_self.isAt}', type: ${_self.type()}) because: ${_because}`);
        this.self = _self;
    }
}
export function road_factory(..._lookFor) {
    const entryType = to_RoadT(path.join(..._lookFor));
    if (entryType === RoadT.FOLDER)
        return new Folder(false, ..._lookFor);
    else if (entryType === RoadT.FILE)
        return new File(false, ..._lookFor);
    else
        return new BizarreRoad(..._lookFor);
}
export class Road {
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
    isAt;
    constructor(..._pathAsJoinableOrByItself) {
        /*
          Find and resolve the absolute path of _lookFor
          with optional check to _shouldBeOfType
        */
        if (!fs.existsSync(path.join(..._pathAsJoinableOrByItself)))
            throw new RoadErr(this, "Not found");
        this.isAt = path.resolve(path.join(..._pathAsJoinableOrByItself));
    }
    type() {
        return to_RoadT(this.isAt);
    }
    depth() {
        return this.isAt.split(path.sep).length - 1;
    }
    name() {
        return path.basename(this.isAt);
    }
    last_modified() {
        return fs.statSync(this.isAt).mtime;
    }
    created_on() {
        return fs.statSync(this.isAt).birthtime;
    }
    stats() {
        return fs.statSync(this.isAt);
    }
    cpy(_prevPath = this.isAt) {
        return new this.constructor(_prevPath);
    }
    parent() {
        return new Folder(false, path.dirname(this.isAt));
    }
    parents() {
        const result = [];
        let currentParent = this.parent();
        while (currentParent.depth() > 1) {
            result.unshift(currentParent);
            currentParent = currentParent.parent();
        }
        return result;
    }
    rename_self_to(_newName) {
        if (_newName.includes(path.sep))
            throw new RoadErr(this, `Invalid name: '${_newName}' is nested`);
        const newPath = path.join(this.parent().isAt, _newName);
        if (fs.existsSync(newPath))
            throw new RoadErr(this, `New name: '${newPath}' already exists`);
        fs.renameSync(this.isAt, newPath);
        this.isAt = newPath;
    }
    move_self_into(_moveInto) {
        // Default attempt to move
        const destPath = path.join(_moveInto.isAt, this.name());
        if (fs.existsSync(destPath))
            throw new RoadErr(this, `Destination: '${destPath}' already exists`);
        fs.renameSync(this.isAt, destPath);
        this.isAt = destPath;
    }
    copy_self_into(_copyInto) {
        // Default attempt to copy
        const destPath = path.join(_copyInto.isAt, this.name());
        if (fs.existsSync(destPath))
            throw new RoadErr(this, `Destination: '${destPath}' already exists`);
        if (this.type() === RoadT.SYMLINK) {
            const linkTarget = fs.readlinkSync(this.isAt);
            fs.symlinkSync(linkTarget, destPath);
        }
        else {
            // Trying to use 'cp' for other special files (pipes, sockets, etc.)
            const result = spawnSync("cp", ["-a", this.isAt, destPath]);
            if (result.status !== 0)
                throw new RoadErr(this, `Failed to copy special file: ${result.stderr?.toString() || "unknown error"}`);
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
    originalType; // To remember own type
    constructor(..._lookFor) {
        super(..._lookFor);
        this.originalType = this.type();
        if (this.originalType === RoadT.FILE || this.originalType === RoadT.FOLDER)
            throw new RoadErr(this, `Type missmatch: ${this.originalType} is too normal (?), use other generalization of ${super.constructor.name} instead`);
    }
    exists() {
        return fs.existsSync(this.isAt) && this.type() === this.originalType;
    }
}
export class Folder extends Road {
    /*
      Handles folders in the file system
    */
    constructor(_createIfNotExists, ..._lookFor) {
        if (_createIfNotExists && !fs.existsSync(path.join(..._lookFor)))
            fs.mkdirSync(path.join(..._lookFor), { recursive: true });
        super(..._lookFor);
        if (!fs.existsSync(path.join(..._lookFor)) || this.type() !== RoadT.FOLDER)
            throw new RoadErr(this, "Type missmatch: Should be folder");
    }
    list() {
        return fs.readdirSync(this.isAt).map(name => road_factory(path.join(this.isAt, name)));
    }
    find(_lookFor) {
        /*
          Check if the folder contains a file or folder with
          the given relative path. If it does, return the
          corresponding Road object.
          Note:
            Path MUST be relative
        */
        if (_lookFor.length === 0)
            throw new RoadErr(this, "Invalid path: Empty path given to lookup");
        if (_lookFor.includes("/") || _lookFor.includes("\\"))
            throw new RoadErr(this, `Invalid path: Not relative or is nested: ${_lookFor}`);
        if (!fs.existsSync(path.join(this.isAt, _lookFor)))
            return undefined;
        else
            return road_factory(path.join(this.isAt, _lookFor));
    }
    copy_self_into(_copyInto, _options = { recursive: true }) {
        const newFolder = new Folder(false, path.join(_copyInto.isAt, this.name()));
        fs.cpSync(this.isAt, newFolder.isAt, _options); // Merges
        return newFolder;
    }
    exists() {
        return fs.existsSync(this.isAt) && this.type() === RoadT.FOLDER;
    }
}
export class File extends Road {
    /*
      Handles files in the file system
    */
    constructor(_createIfNotExists, ..._lookFor) {
        if (_createIfNotExists && !fs.existsSync(path.join(..._lookFor)))
            fs.writeFileSync(path.join(..._lookFor), "");
        super(path.join(..._lookFor));
        if (!fs.existsSync(path.join(..._lookFor)) || this.type() !== RoadT.FILE)
            throw new RoadErr(this, "Type missmatch: Should be file");
    }
    exists() {
        return fs.existsSync(this.isAt) && this.type() === RoadT.FILE;
    }
    read_text() {
        return fs.readFileSync(this.isAt, "utf-8");
    }
    edit_text(_newText) {
        fs.writeFileSync(this.isAt, _newText);
    }
    read_binary() {
        return fs.readFileSync(this.isAt);
    }
    edit_binary(_newBuffer) {
        fs.writeFileSync(this.isAt, _newBuffer);
    }
    ext() {
        return path.extname(this.isAt);
    }
    size_in_bytes() {
        return fs.statSync(this.isAt).size;
    }
}
// If DOM exists
export var DOM;
(function (DOM) {
    class DOMErr extends AnyErr {
        constructor(_identifier, _msg) {
            super(`At state '${document.readyState}' from type, class or id '${_identifier}' because: ${_msg}`);
        }
    }
    DOM.DOMErr = DOMErr;
    function ready() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading')
                document.addEventListener('DOMContentLoaded', () => resolve());
            else
                resolve();
        });
    }
    DOM.ready = ready;
    function by_id(_id, _elementType) {
        const element = document.getElementById(_id);
        const typeCtor = _elementType ?? HTMLElement;
        if (!(element instanceof typeCtor))
            throw new DOMErr(_id, `Type missmatch: Element is not of type ${typeCtor.name} but ${element?.constructor.name}`);
        return element;
    }
    DOM.by_id = by_id;
    function by_class(_className, _elementType) {
        const typeCtor = _elementType ?? HTMLElement;
        const cleanClass = _className.startsWith('.') ? _className.slice(1) : _className;
        const elements = document.querySelectorAll(`.${cleanClass}`);
        const result = [];
        elements.forEach((element, index) => {
            if (!(element instanceof typeCtor))
                throw new DOMErr(_className, `Type missmatch at index ${index}: Element is not of type ${typeCtor.name}`);
            result.push(element);
        });
        return result;
    }
    DOM.by_class = by_class;
    function by_tag(_tagName) {
        return Array.from(document.getElementsByTagName(_tagName));
    }
    DOM.by_tag = by_tag;
    function id_exists(_id, _elementType) {
        const typeCtor = _elementType ?? HTMLElement;
        const maybeElement = document.getElementById(_id);
        if (!maybeElement || !(maybeElement instanceof typeCtor))
            return false;
        return true;
    }
    DOM.id_exists = id_exists;
})(DOM || (DOM = {}));
//# sourceMappingURL=instrumentality.js.map