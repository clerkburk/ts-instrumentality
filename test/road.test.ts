import * as vt from 'vitest'
import * as rd from '../src/road.js'
import * as fs from 'node:fs'
import * as ph from 'node:path'




vt.describe('road_type', () => {
  const tmpDir = ph.join(process.cwd(), 'tmp_road_type_test')
  const tmpFile = ph.join(tmpDir, 'file.txt')
  const tmpSymlink = ph.join(tmpDir, 'symlink')
  const symLinkSupported = process.platform !== 'win32'

  vt.beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(tmpFile, 'test')
    if (symLinkSupported) {
      try { fs.unlinkSync(tmpSymlink) } catch { console.log('No symlink to remove') }
      fs.symlinkSync(tmpFile, tmpSymlink)
    } else
      console.log('Symlinks not supported on this platform, skipping symlink test setup')
  })

  vt.afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  vt.it('returns File for a regular file path', () => {
    vt.expect(rd.road_type(tmpFile)).toBe(rd.File)
  })

  vt.it('returns Folder for a directory path', () => {
    vt.expect(rd.road_type(tmpDir)).toBe(rd.Folder)
  })

  vt.it('returns SymbolicLink for a symlink path (non-Windows)', () => {
    if (symLinkSupported)
      vt.expect(rd.road_type(tmpSymlink)).toBe(rd.SymbolicLink)
  })

  vt.it('returns correct type for numeric mode', () => {
    const fileMode = fs.lstatSync(tmpFile).mode
    vt.expect(rd.road_type(fileMode)).toBe(rd.File)
    const dirMode = fs.lstatSync(tmpDir).mode
    vt.expect(rd.road_type(dirMode)).toBe(rd.Folder)
  })

  vt.it('throws for unknown mode', () => {
    vt.expect(() => rd.road_type(0)).toThrow()
  })
})



vt.describe('Road abstract class', () => {
  const tmpDir = ph.join(process.cwd(), 'tmp_road_abstract_test')
  const tmpFile = ph.join(tmpDir, 'file.txt')

  // Minimal concrete subclass for testing
  class TestRoad extends rd.Road {
    delete_sync() {}
    async delete() {}
    move_sync(_into: rd.Folder) {}
    async move(_into: rd.Folder) {}
    copy_sync(_into: rd.Folder) { return this }
    async copy(_into: rd.Folder) { return this }
    rename_sync(_to: string) {}
    async rename(_to: string) {}
  }

  vt.beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(tmpFile, 'hello')
  })

  vt.afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  vt.it('constructs and resolves path', () => {
    const road = new TestRoad(tmpFile)
    vt.expect(road.isAt).toBe(ph.resolve(tmpFile))
  })

  vt.it('exists_sync returns true for existing file', () => {
    const road = new TestRoad(tmpFile)
    vt.expect(road.exists_sync()).toBe(true)
  })

  vt.it('exists returns true for existing file', async () => {
    const road = new TestRoad(tmpFile)
    vt.expect(await road.exists()).toBe(true)
  })

  vt.it('stats_sync returns fs.Stats', () => {
    const road = new TestRoad(tmpFile)
    vt.expect(road.stats_sync()).toBeInstanceOf(fs.Stats)
  })

  vt.it('stats returns fs.Stats', async () => {
    const road = new TestRoad(tmpFile)
    vt.expect(await road.stats()).toBeInstanceOf(fs.Stats)
  })

  vt.it('depth returns correct value', () => {
    const road = new TestRoad(tmpFile)
    vt.expect(road.depth()).toBe(tmpFile.split(ph.sep).length - 1)
  })

  vt.it('parent returns Folder instance', () => {
    const road = new TestRoad(tmpFile)
    vt.expect(road.parent()).toBeInstanceOf(rd.Folder)
  })

  vt.it('ancestors returns array of Folders', () => {
    const road = new TestRoad(tmpFile)
    const ancestors = road.ancestors()
    vt.expect(Array.isArray(ancestors)).toBe(true)
    ancestors.forEach(a => vt.expect(a).toBeInstanceOf(rd.Folder))
  })

  vt.it('name returns basename', () => {
    const road = new TestRoad(tmpFile)
    vt.expect(road.name()).toBe(ph.basename(tmpFile))
  })

  vt.it('join returns joined path', () => {
    const road = new TestRoad(tmpDir)
    vt.expect(road.join('foo', 'bar')).toBe(ph.join(tmpDir, 'foo', 'bar'))
  })

  vt.it('accessible_sync returns true for accessible file', () => {
    const road = new TestRoad(tmpFile)
    vt.expect(road.accessible_sync()).toBe(true)
  })

  vt.it('accessible returns true for accessible file', async () => {
    const road = new TestRoad(tmpFile)
    vt.expect(await road.accessible()).toBe(true)
  })

  vt.it('assert_mutable throws if mutable is false', () => {
    const road = new TestRoad(tmpFile)
    road.mutable = false
    vt.expect(() => road.assert_mutable()).toThrow()
  })

  vt.it('factory_sync returns correct subclass', () => {
    const file = rd.Road.factory_sync(tmpFile)
    vt.expect(file).toBeInstanceOf(rd.File)
    const folder = rd.Road.factory_sync(tmpDir)
    vt.expect(folder).toBeInstanceOf(rd.Folder)
  })

  vt.it('factory returns correct subclass', async () => {
    const file = await rd.Road.factory(tmpFile)
    vt.expect(file).toBeInstanceOf(rd.File)
    const folder = await rd.Road.factory(tmpDir)
    vt.expect(folder).toBeInstanceOf(rd.Folder)
  })
})
