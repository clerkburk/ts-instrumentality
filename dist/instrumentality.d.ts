import * as fs from "node:fs";
export declare let LAST_ERROR: Error | null;
export declare function find_self_in_arr<T>(_array: Array<T>, _lookFor: T): T | undefined;
export declare function find_val_in_map<K, V>(_map: Map<K, V[]>, _value: V): K | undefined;
export declare function to_str(_x: unknown): string;
export declare abstract class AnyErr extends Error {
    constructor(_msg: string);
}
export declare function range(_from: number, _to?: number, _step?: number): Array<number>;
export declare function or_err<T>(_x: T | undefined | null, _ErrCtor?: new (...args: any[]) => Error, _msg?: string): T;
export declare class TrimErr extends AnyErr {
}
export declare const TRIM_WITH: "...";
export declare function trim_begin(_str: string, _maxLen: number): string;
export declare function trim_end(_str: string, _maxLen: number): string;
export declare function time_to_str(): string;
export declare function sleep(_ms: number): Promise<void>;
export declare const enum ANSII_ESCAPE {
    BOLD = "\u001B[1m",
    ITALIC = "\u001B[3m",
    UNDERLINE = "\u001B[4m",
    STRIKETHROUGH = "\u001B[9m",
    RESET = "\u001B[0m",
    BLACK = "\u001B[30m",
    RED = "\u001B[31m",
    GREEN = "\u001B[32m",
    YELLOW = "\u001B[33m",
    BLUE = "\u001B[34m",
    MAGENTA = "\u001B[35m",
    CYAN = "\u001B[36m",
    WHITE = "\u001B[37m"
}
export declare class Out {
    silence: boolean;
    suffix: string;
    prefix: string;
    constructor(_prefix: string, _color?: ANSII_ESCAPE);
    print(..._args: any[]): void;
}
export declare function remove_all_from_arr<T>(_arr: Array<T>, _lookFor: T): void;
export declare function inline_try<T>(_func: Function, ..._args: unknown[]): T | null;
export declare function entries<T extends Record<string, any>>(_obj: T): [keyof T, T[keyof T]][];
export declare function rm_fileprotocol_from_src(_rawPath: string): string;
export declare class AssErr extends AnyErr {
}
export declare function ass(_conditionResult: boolean): void;
export declare function freezer<T extends object>(obj: T): T;
export declare class RetryErr extends AnyErr {
}
export declare function retry<T, Args extends any[]>(_fn: (..._args: Args) => Promise<T> | T, _maxAttempts: number, _delayMs: number, ..._args: Args): Promise<T>;
export declare const IS_WINDOWS: boolean;
export declare const enum RoadT {
    FILE = "FILE",
    FOLDER = "FOLDER",
    BLOCK_DEVICE = "BLOCK_DEVICE",
    CHAR_DEVICE = "CHAR_DEVICE",
    SYMLINK = "SYMLINK",
    FIFO = "FIFO",
    SOCKET = "SOCKET"
}
export declare class RoadTErr extends AnyErr {
}
export declare function to_RoadT(_pathorMode: string | number): RoadT;
export declare class RoadErr extends AnyErr {
    readonly self: Road;
    constructor(_self: Road, _because: unknown);
}
export declare function road_factory(..._lookFor: string[]): Road;
export declare abstract class Road {
    isAt: string;
    constructor(..._pathAsJoinableOrByItself: string[]);
    abstract exists(): boolean;
    type(): RoadT;
    depth(): number;
    name(): string;
    last_modified(): Date;
    created_on(): Date;
    stats(): fs.Stats;
    cpy(_prevPath?: string): this;
    parent(): Folder;
    parents(): Folder[];
    rename_self_to(_newName: string): void;
    move_self_into(_moveInto: Folder): void;
    copy_self_into(_copyInto: Folder): this;
}
export declare class BizarreRoad extends Road {
    readonly originalType: RoadT;
    constructor(..._lookFor: string[]);
    exists(): boolean;
}
export declare class Folder extends Road {
    constructor(_createIfNotExists: boolean, ..._lookFor: string[]);
    list(): Array<Road>;
    find(_lookFor: string): Road | undefined;
    copy_self_into(_copyInto: Folder, _options?: fs.CopySyncOptions): this;
    exists(): boolean;
}
export declare class File extends Road {
    constructor(_createIfNotExists: boolean, ..._lookFor: string[]);
    exists(): boolean;
    read_text(): string;
    edit_text(_newText: string): void;
    read_binary(): Buffer;
    edit_binary(_newBuffer: Buffer | Uint8Array): void;
    ext(): string;
    size_in_bytes(): number;
}
export declare namespace DOM {
    class DOMErr extends AnyErr {
        constructor(_identifier: string, _msg: string);
    }
    function ready(): Promise<void>;
    function by_id<T extends HTMLElement>(_id: string, _elementType?: new () => T): T;
    function by_class<T extends HTMLElement>(_className: string, _elementType?: new () => T): T[];
    function by_tag<K extends keyof HTMLElementTagNameMap>(_tagName: K): HTMLElementTagNameMap[K][];
    function id_exists<T extends HTMLElement>(_id: string, _elementType?: new () => T): boolean;
}
//# sourceMappingURL=instrumentality.d.ts.map