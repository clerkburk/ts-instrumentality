import { describe, it, expect, vi } from 'vitest'
import * as n from '../src/node'
import * as fs from 'node:fs'
import * as ph from 'node:path'
import * as os from 'node:os'




const createTempRoot = () => fs.mkdtempSync(ph.join(os.tmpdir(), 'node-tests-'))
const removeTempRoot = (root: string) => {
  if (fs.existsSync(root)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

