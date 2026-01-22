import * as vt from 'vitest'
import * as rd from '../src/road'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Setup: Create a temporary directory for all tests
let tmpDir: string

vt.beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'road-tests-'))
})

vt.afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// Helper: Create a test file and return its path
function createTestFile(name: string, content: string = ''): string {
  const filePath = path.join(tmpDir, name)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, content)
  return filePath
}

// Helper: Create a test folder and return its path
function createTestFolder(name: string): string {
  const folderPath = path.join(tmpDir, name)
  fs.mkdirSync(folderPath, { recursive: true })
  return folderPath
}

// Helper: Cleanup specific test item
function cleanupItem(itemPath: string) {
  if (fs.existsSync(itemPath)) {
    fs.rmSync(itemPath, { recursive: true, force: true })
  }
}

// Helper: Check if path exists
function pathExists(filePath: string): boolean {
  return fs.existsSync(filePath)
}