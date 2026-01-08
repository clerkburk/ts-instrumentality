if (typeof process === 'undefined' || typeof require === 'undefined')
    throw new Error('This module can only be used in a Node.js environment.')



import * as fs from "node:fs"
import * as ph from "node:path"
import * as os from "node:os"
import * as cp from "node:child_process"



/**
 * Synchronously checks if this process has elevated privileges.
 * 
 * @returns True if the process has elevated privileges, false otherwise.
 */
export function isElevatedSync(): boolean {
  if (process.platform === 'win32')
    // On Windows, check if the user is part of the Administrators group
    return !cp.execSync('net session', {stdio: 'pipe'}).toString().includes('Access is denied')
  else
    // On Unix-like systems, check if the effective user ID is 0 (root)
    return !!process.geteuid && process.geteuid() === 0
}
/**
 * Asynchronously checks if this process has elevated privileges.
 * 
 * @returns A Promise that resolves to true if the process has elevated privileges, false otherwise.
 */
export async function isElevated(): Promise<boolean> {
  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      cp.exec('net session', {stdio: 'pipe'}, (error, stdout, stderr) => {
        resolve(!error)
      })
    })
  } else {
    return Promise.resolve(!!process.geteuid && process.geteuid() === 0)
  }
}